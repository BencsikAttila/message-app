const express = require('express')
const database = require('../db')
const dbModel = require('../db-model')
const databaseConnection = require('../db')
const jsonUtils = require('../json-utils')
const wsServer = require('../websocket-server')
const auth = require('../auth')
const router = express.Router(({ mergeParams: true }))

router.get('/api/channels/:channelId/messages', auth.middleware, async (req, res) => {
    try {
        const result = await database.queryRaw('SELECT * FROM messages WHERE messages.channelId = ?', req.params.channelId)
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

router.post('/api/channels/:channelId/messages', auth.middleware, async (req, res) => {
    /** @type {import('../db/model').default['messages']} */
    const newMessage = {
        content: req.body.content,
        createdUtc: Math.floor(new Date().getTime() / 1000),
        channelId: Number.parseInt(req.params.channelId),
        senderId: req.credentials.id,
    }

    try {
        await dbModel.insertMessage(database, newMessage)
        for (const client of wsServer.Singleton.clients) {
            client.send(JSON.stringify({
                type: 'message_created',
                v: newMessage,
            }))
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
        const result = await databaseConnection.query('channels')
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

router.post('/api/channels', auth.middleware, async (req, res) => {
    /** @type {import('../db/model').default['channels']} */
    const newChannel = {
        name: req.body.name,
        ownerId: req.credentials.id,
    }

    try {
        await database.insert('channels', newChannel)
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

module.exports = router
