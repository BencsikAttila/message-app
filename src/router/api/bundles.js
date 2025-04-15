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

    router.get('/api/bundles', auth.middleware, async (req, res) => {
        try {
            const sqlBundles = await database.queryRaw('SELECT bundles.* FROM bundles JOIN bundleUser ON bundles.id = bundleUser.bundleId WHERE bundleUser.userId = ?', req.credentials.id)
            res.setHeader('Content-Type', 'application/json')
            res.statusCode = 200
            res.flushHeaders()
            res.write(JSON.stringify(sqlBundles.map(v => ({
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
    
    router.post('/api/bundles', auth.middleware, async (req, res) => {
        if (!req.body.name || !('' + req.body.name).trim()) {
            res
                .status(400)
                .json({ error: 'Bundle name is empty' })
                .end()
            return
        }
    
        if (!req.body.channels || !req.body.channels.length) {
            res
                .status(400)
                .json({ error: 'Bundle content is empty' })
                .end()
            return
        }
    
        /** @type {import('../../db/model').default['bundles']} */
        const newBundle = {
            id: uuid.v4(),
            name: req.body.name,
        }
    
        try {
            await database.insert('bundles', newBundle)
            await database.insert('bundleUser', {
                userId: req.credentials.id,
                bundleId: newBundle.id,
            })
    
            for (const channel of req.body.channels) {
                const sqlChannels = await app.getChannel(channel)
                if (!sqlChannels) continue
    
                await database.insert('bundleChannel', {
                    bundleId: newBundle.id,
                    channelId: sqlChannels.id,
                })
            }
            res
                .status(200)
                .end()
        } catch (error) {
            console.error(error)
            res
                .status(500)
                .setHeader('Content-Type', 'application/json')
                .flushHeaders()
            res.write(JSON.stringify(error, jsonUtils.replacer))
            res.end()
        }
    })
    
    router.delete('/api/bundles/:bundleId', auth.middleware, async (req, res) => {
        try {
            const sqlBundles = await database.queryRaw('SELECT bundles.* FROM bundles JOIN bundleUser ON bundles.id = bundleUser.bundleId WHERE bundleUser.userId = ? AND bundles.id = ?', [ req.credentials.id, req.params.bundleId ])
            if (!sqlBundles.length) {
                res
                    .status(404)
                    .json({ error: 'Bundle not found' })
                    .end()
                return
            }
            
            const sqlRes1 = database.queryRaw('DELETE FROM bundleUser WHERE bundleUser.userId = ? AND bundleUser.bundleId = ?', [ req.credentials.id, req.params.bundleId ])
            res
                .status(200)
                .json(sqlRes1)
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
    
    router.get('/api/bundles/:bundleId/channels', auth.middleware, async (req, res) => {
        try {
            const sqlBundles = await database.queryRaw(`
                SELECT bundles.*
                FROM bundles
                JOIN bundleUser ON bundles.id = bundleUser.bundleId
                WHERE bundleUser.userId = ?
                AND bundles.id = ?
            `, [ req.credentials.id, req.params.bundleId ])
            if (!sqlBundles.length) {
                res
                    .status(404)
                    .json({ error: 'Bundle not found' })
                    .end()
                return
            }
    
            const sqlChannels = await database.queryRaw(`
                SELECT channels.*
                FROM channels
                JOIN bundleChannel ON channels.id = bundleChannel.channelId
                AND bundleChannel.bundleId = ?
            `, [ req.params.bundleId ])
    
            res
                .status(200)
                .setHeader('Content-Type', 'application/json')
                .flushHeaders()
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
    
    router.post('/api/bundles/:bundleId/channels', auth.middleware, async (req, res) => {
        try {
            const sqlBundles = await database.queryRaw(`
                SELECT bundles.*
                FROM bundles
                JOIN bundleChannel ON bundles.id = bundleChannel.bundleId
                JOIN bundleUser ON bundles.id = bundleUser.bundleId
                WHERE bundleUser.userId = ?
                AND channels.id = ?
            `, [ req.credentials.id, req.params.bundleId ])
            if (!sqlBundles.length) {
                res
                    .status(404)
                    .json({ error: 'Bundle not found' })
                    .end()
                return
            }
    
            const channel = await app.getChannel(req.params.channelId)
            if (!channel) {
                res
                    .status(404)
                    .json({ error: 'Channel not found' })
                    .end()
                return
            }
    
            await database.insert('bundleChannel', {
                bundleId: req.params.bundleId,
                channelId: req.params.channelId,
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
