const express = require('express')
const jsonUtils = require('../../json-utils')
const uuid = require('uuid')
const path = require('path')
const fs = require('fs')

/**
 * @param {express.Router} router
 * @param {import('../../utils')} app
 */
module.exports = (router, app) => {
    const database = app.database

    router.get('/api/channels/:channelId/messages', app.auth.middleware, async (req, res) => {
        try {
            const sqlChannel = await app.getChannel(req.params.channelId)
            if (!sqlChannel) {
                res
                    .status(404)
                    .json({ error: 'Channel not found' })
                    .end()
                return
            }

            if (!(await app.checkChannelPermissions(req.credentials.id, req.params.channelId))) {
                res
                    .status(400)
                    .json({ error: 'No permissions' })
                    .end()
                return
            }

            const messages = await database.queryRaw('SELECT messages.*, users.id as senderId, users.nickname as senderNickname, users.nickname as senderNickname FROM messages JOIN users ON users.id = messages.senderId WHERE messages.channelId = ?', req.params.channelId)

            for (const message of messages) {
                const attachments = await database.queryRaw(`SELECT * FROM messageAttachments WHERE messageAttachments.messageId = ?`, [message.id])
                message.attachments = attachments.map(v => v.id)
            }

            res
                .status(200)
                .json(messages)
                .end()
        } catch (error) {
            console.error(error)
            res
                .status(500)
                .json(jsonUtils.map(error))
                .end()
        }
    })

    router.post('/api/channels/:channelId/messages', app.auth.middleware, async (req, res) => {
        const sqlChannel = await app.getChannel(req.params.channelId)
        if (!sqlChannel) {
            res
                .status(404)
                .json({ error: 'Channel not found' })
                .end()
            return
        }

        if (!(await app.checkChannelPermissions(req.credentials.id, req.params.channelId))) {
            res
                .status(400)
                .json({ error: 'No permissions' })
                .end()
            return
        }

        /** @type {import('../../db/model').default['messages']} */
        const newMessage = {
            id: uuid.v4(),
            content: (req.body.content ?? '').trim(),
            attachmentCount: (Number.isNaN(Number.parseInt(req.body.attachmentCount)) || !req.body.attachmentCount ? 0 : Number.parseInt(req.body.attachmentCount)),
            createdUtc: Math.floor(new Date().getTime() / 1000),
            channelId: req.params.channelId,
            senderId: req.credentials.id,
        }

        if (!newMessage.content) {
            res
                .status(400)
                .json({ error: 'Empty message' })
                .end()
            return
        }

        try {
            await database.insert('messages', newMessage)

            const usersInChannel = await app.usersInChannel(req.credentials.id, req.params.channelId)

            for (const client of app.wss.getWss().clients.values()) {
                if (!usersInChannel.includes(client.user?.id)) continue
                client.send(JSON.stringify(/** @type {import('../../websocket-messages').MessageCreatedEvent} */({
                    type: 'message_created',
                    id: newMessage.id,
                    content: newMessage.content,
                    attachmentCount: newMessage.attachmentCount,
                    channel: req.params.channelId,
                    createdUtc: newMessage.createdUtc,
                    user: req.user,
                    senderId: req.user.id,
                    senderNickname: req.user.nickname,
                    attachments: new Array(newMessage.attachmentCount).map(() => null),
                })))
            }

            require('../push').send({
                title: req.user.nickname,
                body: newMessage.content,
                icon: `/users/${req.user.id}/avatar.webp?size=128`,
                url: `/channels/${newMessage.channelId}`,
            }, v => usersInChannel.includes(v))

            res
                .status(201)
                .json({
                    ...newMessage,
                    attachments: new Array(newMessage.attachmentCount).map(() => null),
                })
                .end()
        } catch (error) {
            console.error(error)
            res
                .status(500)
                .json(jsonUtils.map(error))
                .end()
        }
    })

    router.put('/api/channels/:channelId/messages/:messageId/attachments', app.auth.middleware, async (req, res) => {
        const sqlChannel = await app.getChannel(req.params.channelId)
        if (!sqlChannel) {
            res
                .status(404)
                .json({ error: 'Channel not found' })
                .end()
            return
        }

        if (!(await app.checkChannelPermissions(req.credentials.id, req.params.channelId))) {
            res
                .status(400)
                .json({ error: 'No permissions' })
                .end()
            return
        }

        const messages = await database.queryRaw('SELECT * FROM messages WHERE messages.channelId = ? AND messages.id = ?', [req.params.channelId, req.params.messageId])

        if (!messages.length) {
            res
                .status(404)
                .json({ error: 'Message not found' })
                .end()
            return
        }

        try {
            req.pipe(req.busboy)
            req.busboy.on('file', (fieldname, file, receivedFilename) => {
                const chunks = []
                file.on('data', chunk => chunks.push(chunk))
                file.on('end', async () => {
                    if (!fs.existsSync(path.join(database.localPath, 'attachments'))) {
                        fs.mkdirSync(path.join(database.localPath, 'attachments'), { recursive: true })
                    }
                    const buffer = Buffer.concat(chunks)
                    const id = uuid.v4()
                    fs.writeFileSync(path.join(database.localPath, 'attachments', `${id}${path.extname(receivedFilename.filename)}`), buffer)

                    await database.insert('messageAttachments', {
                        id: id,
                        messageId: req.params.messageId,
                    })

                    res
                        .status(201)
                        .json({
                            id: id,
                        })
                        .end()
                })
            })
        } catch (error) {
            console.error(error)
            res
                .status(500)
                .json(jsonUtils.map(error))
                .end()
        }
    })

    router.head('/api/channels/:channelId/messages/:messageId/attachments/:attachmentId', app.auth.middleware, async (req, res) => {
        const sqlChannel = await app.getChannel(req.params.channelId)
        if (!sqlChannel) {
            res
                .status(404)
                .json({ error: 'Channel not found' })
                .end()
            return
        }

        if (!(await app.checkChannelPermissions(req.credentials.id, req.params.channelId))) {
            res
                .status(400)
                .json({ error: 'No permissions' })
                .end()
            return
        }

        const messages = await database.queryRaw('SELECT * FROM messages WHERE messages.channelId = ? AND messages.id = ?', [req.params.channelId, req.params.messageId])

        if (!messages.length) {
            res
                .status(404)
                .json({ error: 'Message not found' })
                .end()
            return
        }

        const attachments = await database.queryRaw('SELECT * FROM messageAttachments WHERE messageAttachments.messageId = ?', [req.params.messageId])

        if (!attachments.length) {
            res
                .status(404)
                .json({ error: 'Attachment not found' })
                .end()
            return
        }

        try {
            const attachmentId = attachments[0].id

            let filename = null
            for (const file of fs.readdirSync(path.join(database.localPath, 'attachments'))) {
                if (file === attachmentId || file.startsWith(attachmentId + path.extname(file))) {
                    filename = path.join(database.localPath, 'attachments', file)
                    break
                }
            }

            if (!filename) {
                await database.delete('messageAttachments', 'messageAttachments = ?', [attachmentId])
            }

            res
                .status(200)
                .contentType(path.basename(filename))
                .header('content-length', fs.statSync(filename).size + '')
                .end()
        } catch (error) {
            console.error(error)
            res
                .status(500)
                .json(jsonUtils.map(error))
                .end()
        }
    })

    router.get('/api/channels/:channelId/messages/:messageId/attachments/:attachmentId', app.auth.middleware, async (req, res) => {
        const sqlChannel = await app.getChannel(req.params.channelId)
        if (!sqlChannel) {
            res
                .status(404)
                .json({ error: 'Channel not found' })
                .end()
            return
        }

        if (!(await app.checkChannelPermissions(req.credentials.id, req.params.channelId))) {
            res
                .status(400)
                .json({ error: 'No permissions' })
                .end()
            return
        }

        const messages = await database.queryRaw('SELECT * FROM messages WHERE messages.channelId = ? AND messages.id = ?', [req.params.channelId, req.params.messageId])

        if (!messages.length) {
            res
                .status(404)
                .json({ error: 'Message not found' })
                .end()
            return
        }

        const attachments = await database.queryRaw('SELECT * FROM messageAttachments WHERE messageAttachments.messageId = ?', [req.params.messageId])

        if (!attachments.length) {
            res
                .status(404)
                .json({ error: 'Attachment not found' })
                .end()
            return
        }

        try {
            const attachmentId = attachments[0].id

            let filename = null
            for (const file of fs.readdirSync(path.join(database.localPath, 'attachments'))) {
                if (file === attachmentId || file.startsWith(attachmentId + path.extname(file))) {
                    filename = path.join(database.localPath, 'attachments', file)
                    break
                }
            }

            if (!filename) {
                await database.delete('messageAttachments', 'messageAttachments = ?', [attachmentId])
            }

            res
                .status(200)
                .sendFile(filename)
        } catch (error) {
            console.error(error)
            res
                .status(500)
                .json(jsonUtils.map(error))
                .end()
        }
    })

    router.delete('/api/channels/:channelId/messages/:messageId', app.auth.middleware, async (req, res) => {
        const sqlChannel = await app.getChannel(req.params.channelId)
        if (!sqlChannel) {
            res
                .status(404)
                .json({ error: 'Channel not found' })
                .end()
            return
        }

        if (!(await app.checkChannelPermissions(req.credentials.id, req.params.channelId))) {
            res
                .status(400)
                .json({ error: 'No permissions' })
                .end()
            return
        }

        if (!(await database.queryRaw(`SELECT messages.id FROM messages WHERE messages.senderId = ? AND messages.id = ? LIMIT 1`, [req.credentials.id, req.params.messageId]))) {
            res
                .status(400)
                .json({ error: 'No permissions' })
                .end()
            return
        }

        try {
            const sqlRes = await app.deleteMessage(req.params.messageId)

            if (!sqlRes) {
                res
                    .status(400)
                    .json({ error: 'Failed to delete the message' })
                    .end()
                return
            }

            for (const client of app.wss.getWss().clients.values()) {
                client.send(JSON.stringify(/** @type {import('../../websocket-messages').MessageDeletedEvent} */({
                    type: 'message_deleted',
                    id: req.params['messageId'],
                })))
            }

            res
                .status(200)
                .end()
        } catch (error) {
            console.error(error)
            res
                .status(500)
                .json(jsonUtils.map(error))
                .end()
        }
    })

}
