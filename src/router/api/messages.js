const express = require('express')
const jsonUtils = require('../../json-utils')
const uuid = require('uuid')

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
    
            const sqlMessages = await database.queryRaw('SELECT messages.*, users.id as senderId, users.nickname as senderNickname, users.nickname as senderNickname FROM messages JOIN users ON users.id = messages.senderId WHERE messages.channelId = ?', req.params.channelId)
    
            res.setHeader('Content-Type', 'application/json')
            res.statusCode = 200
            res.flushHeaders()
            res.write(JSON.stringify(sqlMessages))
            res.end()
        } catch (error) {
            console.error(error)
            res.setHeader('Content-Type', 'application/json')
            res.statusCode = 500
            res.flushHeaders()
            res.write(JSON.stringify(error, jsonUtils.replacer))
            res.end()
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
            for (const client of app.wss.getWss().clients.values()) {
                client.send(JSON.stringify(/** @type {import('../../websocket-messages').MessageCreatedEvent} */ ({
                    type: 'message_created',
                    id: newMessage.id,
                    content: newMessage.content,
                    channel: req.params.channelId,
                    createdUtc: newMessage.createdUtc,
                    user: req.user,
                    senderId: req.user.id,
                    senderNickname: req.user.nickname,
                })))
            }
    
            res
                .status(200)
                .json(newMessage)
                .end()
        } catch (error) {
            console.error(error)
            res.setHeader('Content-Type', 'application/json')
            res.statusCode = 500
            res.flushHeaders()
            res.write(JSON.stringify(error, jsonUtils.replacer))
            res.end()
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
    
        try {
            const sqlRes = await database.delete('messages', 'messages.senderId = ? AND messages.id = ?', [ req.credentials.id, req.params['messageId'] + '' ])
    
            if (!sqlRes) {
                res
                    .status(400)
                    .json({ error: 'Failed to delete the message' })
                    .end()
                return
            }
    
            for (const client of app.wss.getWss().clients.values()) {
                client.send(JSON.stringify(/** @type {import('../../websocket-messages').MessageDeletedEvent} */ ({
                    type: 'message_deleted',
                    id: req.params['messageId'],
                })))
            }
    
            res
                .status(200)
                .end()
        } catch (error) {
            console.error(error)
            res.setHeader('Content-Type', 'application/json')
            res.statusCode = 500
            res.flushHeaders()
            res.write(JSON.stringify(error, jsonUtils.replacer))
            res.end()
        }
    })
    
}
