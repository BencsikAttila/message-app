const express = require('express')
const database = require('../db')
const databaseConnection = require('../db')
const jsonUtils = require('../json-utils')
const wsServer = require('../websocket-server')
const auth = require('../auth')
const uuid = require('uuid')
const router = express.Router(({ mergeParams: true }))

router.get('/api/channels/:channelId/messages', auth.middleware, async (req, res) => {
    try {
        const sqlChannel = await database.queryRaw('SELECT id FROM channels WHERE channels.uuid = ? LIMIT 1', req.params.channelId)
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

    /** @type {import('../db/model').default['messages']} */
    const newMessage = {
        content: req.body.content,
        createdUtc: Math.floor(new Date().getTime() / 1000),
        channelId: sqlChannel[0].id,
        senderId: req.credentials.id,
    }

    try {
        await database.insert('messages', newMessage)
        for (const client of wsServer.Singleton.clients) {
            client.send(JSON.stringify(/** @type {import('../websocket-messages').MessageCreatedEvent} */ ({
                type: 'message_created',
                content: newMessage.content,
                channel: sqlChannel[0].uuid,
                createdUtc: newMessage.createdUtc,
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

router.get('/api/channels', auth.middleware, async (req, res) => {
    try {
        const sqlChannels = await databaseConnection.queryRaw('SELECT * FROM channels JOIN userChannel ON channels.id = userChannel.channelId WHERE userChannel.userId = ?', req.credentials.id)
        res.setHeader('Content-Type', 'application/json')
        res.statusCode = 200
        res.flushHeaders()
        res.write(JSON.stringify(sqlChannels.map(v => ({
            ...v,
            id: undefined,
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
        const result = await databaseConnection.queryRaw('SELECT * FROM invitations WHERE invitations.userId = ?', req.credentials.id)
        res.setHeader('Content-Type', 'application/json')
        res.statusCode = 200
        res.flushHeaders()
        res.write(JSON.stringify(result))
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

module.exports = router
