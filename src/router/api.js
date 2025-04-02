const express = require('express')
const database = require('../db')
const databaseConnection = require('../db')
const jsonUtils = require('../json-utils')
const auth = require('../auth')
const uuid = require('uuid')
const router = express.Router(({ mergeParams: true }))

router.get('/api/user', auth.middleware, async (req, res) => {
    try {
        const sqlUser = await database.queryRaw('SELECT * FROM users WHERE users.id = ? LIMIT 1', req.credentials.id)
        res.setHeader('Content-Type', 'application/json')
        res.statusCode = 200
        res.flushHeaders()
        res.write(JSON.stringify({
            ...sqlUser[0],
            id: undefined,
            password: undefined,
        }))
        res.end()
    } catch (error) {
        res.setHeader('Content-Type', 'application/json')
        res.statusCode = 500
        res.flushHeaders()
        res.write(JSON.stringify(error, jsonUtils.replacer))
        res.end()
    }
})

router.get('/api/channels/:channelId', auth.middleware, async (req, res) => {
    try {
        const sqlChannel = await database.queryRaw('SELECT * FROM channels WHERE channels.uuid = ? LIMIT 1', req.params.channelId)

        const sqlPermission = await database.queryRaw('SELECT * FROM userChannel WHERE userChannel.channelId = ? AND userChannel.userId = ? LIMIT 1', [ sqlChannel[0].id, req.credentials.id ])
        if (!sqlPermission.length) {
            res
                .status(400)
                .json({ error: 'No permissions' })
                .end()
            return
        }

        res.setHeader('Content-Type', 'application/json')
        res.statusCode = 200
        res.flushHeaders()
        res.write(JSON.stringify({
            ...sqlChannel[0],
            id: undefined,
            ownerId: undefined,
        }))
        res.end()
    } catch (error) {
        res.setHeader('Content-Type', 'application/json')
        res.statusCode = 500
        res.flushHeaders()
        res.write(JSON.stringify(error, jsonUtils.replacer))
        res.end()
    }
})

router.get('/api/channels/:channelId/users', auth.middleware, async (req, res) => {
    try {
        const sqlChannel = await database.queryRaw('SELECT * FROM channels WHERE channels.uuid = ? LIMIT 1', req.params.channelId)

        const sqlUsers = await databaseConnection.queryRaw('SELECT users.* FROM users JOIN userChannel ON users.id = userChannel.userId WHERE userChannel.channelId = ?', sqlChannel[0].id)

        /** @type {Array<import('ws').WebSocket>} */
        const wsClients = []
        for (const wsClient of (/** @type {ReturnType<import('express-ws')>} */ (global['wsInstance'])).getWss().clients.values()) {
            wsClients.push(wsClient)
        }

        res.setHeader('Content-Type', 'application/json')
        res.statusCode = 200
        res.flushHeaders()
        res.write(JSON.stringify(sqlUsers.map(v => ({
            ...v,
            id: undefined,
            password: undefined,
            // @ts-ignore
            isOnline: wsClients.some(_v => _v.user?.id === v.id),
        }))))
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

router.get('/api/channels/:channelId/messages', auth.middleware, async (req, res) => {
    try {
        const sqlChannel = await database.queryRaw('SELECT * FROM channels WHERE channels.uuid = ? LIMIT 1', req.params.channelId)

        const sqlPermission = await database.queryRaw('SELECT * FROM userChannel WHERE userChannel.channelId = ? AND userChannel.userId = ? LIMIT 1', [ sqlChannel[0].id, req.credentials.id ])
        if (!sqlPermission.length) {
            res
                .status(400)
                .json({ error: 'No permissions' })
                .end()
            return
        }

        const sqlMessages = await database.queryRaw('SELECT * FROM messages WHERE messages.channelId = ?', sqlChannel[0].id)

        res.setHeader('Content-Type', 'application/json')
        res.statusCode = 200
        res.flushHeaders()
        res.write(JSON.stringify(sqlMessages))
        res.end()
    } catch (error) {
        res.setHeader('Content-Type', 'application/json')
        res.statusCode = 500
        res.flushHeaders()
        res.write(JSON.stringify(error, jsonUtils.replacer))
        res.end()
    }
})

router.post('/api/channels/:channelId/messages', auth.middleware, async (req, res) => {
    const sqlChannel = await database.queryRaw('SELECT * FROM channels WHERE channels.uuid = ? LIMIT 1', req.params.channelId)

    const sqlPermission = await database.queryRaw('SELECT * FROM userChannel WHERE userChannel.channelId = ? AND userChannel.userId = ? LIMIT 1', [ sqlChannel[0].id, req.credentials.id ])
    if (!sqlPermission.length) {
        res
            .status(400)
            .json({ error: 'No permissions' })
            .end()
        return
    }

    /** @type {import('../db/model').default['messages']} */
    const newMessage = {
        content: req.body.content,
        createdUtc: Math.floor(new Date().getTime() / 1000),
        channelId: sqlChannel[0].id,
        senderId: req.credentials.id,
    }

    try {
        await database.insert('messages', newMessage)
        for (const client of (/** @type {ReturnType<import('express-ws')>} */ (global['wsInstance'])).getWss().clients.values()) {
            client.send(JSON.stringify(/** @type {import('../websocket-messages').MessageCreatedEvent} */ ({
                type: 'message_created',
                content: newMessage.content,
                channel: sqlChannel[0].uuid,
                createdUtc: newMessage.createdUtc,
                user: {
                    nickname: req.user.nickname
                }
            })))
        }

        res.statusCode = 200
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

router.post('/api/channels/:channelId/leave', auth.middleware, async (req, res) => {
    const sqlChannels = await database.queryRaw('SELECT * FROM channels WHERE channels.uuid = ? LIMIT 1', req.params.channelId)

    if (!sqlChannels.length) {
        res
            .status(400)
            .json({ error: 'Channel not found' })
            .end()
        return
    }

    await database.queryRaw('DELETE FROM userChannel WHERE userChannel.channelId = ? AND userChannel.userId = ?', [ sqlChannels[0].id, req.credentials.id ])

    res
        .status(200)
        .end()
})

router.get('/api/channels', auth.middleware, async (req, res) => {
    try {
        const sqlChannels = await databaseConnection.queryRaw('SELECT channels.* FROM channels JOIN userChannel ON channels.id = userChannel.channelId WHERE userChannel.userId = ?', req.credentials.id)
        res.setHeader('Content-Type', 'application/json')
        res.statusCode = 200
        res.flushHeaders()
        res.write(JSON.stringify(sqlChannels.map(v => ({
            ...v,
            id: undefined,
            ownerId: undefined,
        }))))
        res.end()
    } catch (error) {
        res.setHeader('Content-Type', 'application/json')
        res.statusCode = 500
        res.flushHeaders()
        res.write(JSON.stringify(error, jsonUtils.replacer))
        res.end()
    }
})

router.post('/api/channels', auth.middleware, async (req, res) => {
    /** @type {import('../db/model').default['channels']} */
    const newChannel = {
        uuid: uuid.v4(),
        name: req.body.name,
        ownerId: req.credentials.id,
    }

    try {
        const sqlRes = await database.insert('channels', newChannel)
        await database.insert('userChannel', {
            userId: req.credentials.id,
            channelId: sqlRes.lastID,
        })
        res.statusCode = 200
        res.end()
    } catch (error) {
        res.setHeader('Content-Type', 'application/json')
        res.statusCode = 500
        res.flushHeaders()
        res.write(JSON.stringify(error, jsonUtils.replacer))
        res.end()
    }
})

router.get('/api/invitations', auth.middleware, async (req, res) => {
    try {
        const result = await (() => {
            if (req.query['channel']) {
                return databaseConnection.queryRaw('SELECT * FROM invitations WHERE invitations.userId = ? AND invitations.channelId = ?', [ req.credentials.id, req.query['channel'] + '' ])
            } else {
                return databaseConnection.queryRaw('SELECT * FROM invitations WHERE invitations.userId = ?', req.credentials.id)
            }
        })()
        res.setHeader('Content-Type', 'application/json')
        res.statusCode = 200
        res.flushHeaders()
        res.write(JSON.stringify(result.map(v => ({
            ...v,
            id: undefined,
            userId: undefined,
        }))))
        res.end()
    } catch (error) {
        res.setHeader('Content-Type', 'application/json')
        res.statusCode = 500
        res.flushHeaders()
        res.write(JSON.stringify(error, jsonUtils.replacer))
        res.end()
    }
})

router.post('/api/invitations', auth.middleware, async (req, res) => {
    try {
        const sqlRes = await database.insert('invitations', {
            uuid: uuid.v4(),
            channelId: req.body.channelId,
            usages: 0,
            userId: req.credentials.id,
            expiresAt: 0,
        })
        res.statusCode = 200
        res.json({
            id: sqlRes,
        })
        res.end()
    } catch (error) {
        console.error(error)
        res.setHeader('Content-Type', 'application/json')
        res.statusCode = 500
        res.flushHeaders()
        res.json(JSON.stringify(error, jsonUtils.replacer))
        res.end()
    }
})

router.delete('/api/invitations/:uuid', auth.middleware, async (req, res) => {
    try {
        const sqlRes = database.queryRaw('DELETE FROM invitations WHERE invitations.userId = ? AND invitations.uuid = ?', [ req.credentials.id, req.params['uuid'] + '' ])
        res.statusCode = 200
        res.json(sqlRes)
        res.end()
    } catch (error) {
        console.error(error)
        res.setHeader('Content-Type', 'application/json')
        res.statusCode = 500
        res.flushHeaders()
        res.json(JSON.stringify(error, jsonUtils.replacer))
        res.end()
    }
})

router.get('/api/invitations/:uuid/use', auth.middleware, async (req, res) => {
    try {
        const sqlInvitations = await database.queryRaw('SELECT * FROM invitations WHERE invitations.uuid = ? LIMIT 1', [ req.params['uuid'] ])
        if (!sqlInvitations.length) {
            res
                .status(404)
                .json({ error: 'Invitation not found' })
                .end()
            return
        }

        /** @type {import('../db/model').default['invitations']} */
        const sqlInvitation = sqlInvitations[0]

        const sqlChannels = await database.queryRaw('SELECT * FROM channels WHERE channels.uuid = ? LIMIT 1', [ sqlInvitation.channelId ])
        if (!sqlChannels.length) {
            res
                .status(404)
                .json({ error: 'Channel not found' })
                .end()
            return
        }

        /** @type {import('../db/model').default['channels']} */
        const sqlChannel = sqlChannels[0]

        const sqlUserChannels = await database.queryRaw('SELECT * FROM userChannel WHERE userChannel.channelId = ? AND userChannel.userId = ? LIMIT 1', [ sqlChannel.id, req.credentials.id ])
        if (sqlUserChannels.length) {
            res
                .status(400)
                .json({ error: 'You are already in this channel' })
                .end()
            return
        }

        await database.insert('userChannel', {
            userId: req.credentials.id,
            channelId: sqlChannel.id,
        })

        await database.queryRaw(`UPDATE invitations SET usages = usages + 1 WHERE id = ?`, [ sqlInvitation.id ])

        res
            .status(200)
            .end()
    } catch (error) {
        console.error(error)
        res.setHeader('Content-Type', 'application/json')
        res.statusCode = 500
        res.flushHeaders()
        res.json(JSON.stringify(error, jsonUtils.replacer))
        res.end()
    }
})

module.exports = router
