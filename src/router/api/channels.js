const express = require('express')
const database = require('../../db')
const jsonUtils = require('../../json-utils')
const auth = require('../../auth')
const uuid = require('uuid')
const app = require('../../app')

/**
 * @param {express.Router} router
 */
module.exports = (router) => {

    router.get('/api/channels/:channelId', auth.middleware, async (req, res) => {
        try {
            const channel = await app.getChannel(req.params.channelId)
            if (!channel) {
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
    
            res
                .status(200)
                .json(channel)
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
    
    router.get('/api/channels/:channelId/users', auth.middleware, async (req, res) => {
        try {
            const channel = await app.getChannel(req.params.channelId)
            if (!channel) {
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
    
            /** @type {ReadonlyArray<import('../../db/model').default['users']>} */
            const sqlUsers1 = await database.queryRaw('SELECT users.* FROM users JOIN userChannel ON users.id = userChannel.userId WHERE userChannel.channelId = ?', req.params.channelId)
            /** @type {ReadonlyArray<import('../../db/model').default['users']>} */
            const sqlUsers2 = await database.queryRaw('SELECT users.* FROM bundleUser JOIN bundles ON bundles.id = bundleUser.bundleId JOIN bundleChannel ON bundles.id = bundleChannel.bundleId JOIN users ON users.id = bundleUser.userId WHERE bundleChannel.channelId = ?', [ req.params.channelId ])
    
            const _sqlUsers = {}
            for (const v of sqlUsers1) _sqlUsers[v.id] = v
            for (const v of sqlUsers2) _sqlUsers[v.id] = v
    
            /** @type {ReadonlyArray<import('../../db/model').default['users']>} */
            const sqlUsers = Object.values(_sqlUsers)
    
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
                password: undefined,
                // @ts-ignore
                isOnline: v.id === req.credentials.id ? true : wsClients.some(_v => _v.user?.id === v.id),
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
    
    router.post('/api/channels/:channelId/leave', auth.middleware, async (req, res) => {
        const sqlChannels = await app.getChannel(req.params.channelId)
        if (!sqlChannels) {
            res
                .status(400)
                .json({ error: 'Channel not found' })
                .end()
            return
        }
    
        await database.queryRaw('DELETE FROM userChannel WHERE userChannel.channelId = ? AND userChannel.userId = ?', [ req.params.channelId, req.credentials.id ])
    
        res
            .status(200)
            .end()
    })
    
    router.get('/api/channels', auth.middleware, async (req, res) => {
        try {
            const sqlChannels = await database.queryRaw('SELECT channels.* FROM channels JOIN userChannel ON channels.id = userChannel.channelId WHERE userChannel.userId = ?', req.credentials.id)
            res.setHeader('Content-Type', 'application/json')
            res.statusCode = 200
            res.flushHeaders()
            res.write(JSON.stringify(sqlChannels.map(v => ({
                ...v,
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
    
    router.post('/api/channels', auth.middleware, async (req, res) => {
        /** @type {import('../../db/model').default['channels']} */
        const newChannel = {
            id: uuid.v4(),
            name: (req.body.name ?? '').trim(),
            ownerId: req.credentials.id,
        }
    
        if (!newChannel.name) {
            res
                .status(400)
                .json({ error: 'Channel name is empty' })
                .end()
            return
        }
    
        try {
            await database.insert('channels', newChannel)
            await database.insert('userChannel', {
                userId: req.credentials.id,
                channelId: newChannel.id,
            })
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
