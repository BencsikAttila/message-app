const express = require('express')
const jsonUtils = require('../../json-utils')
const uuid = require('uuid')

/**
 * @param {express.Router} router
 * @param {import('../../utils')} app
 */
module.exports = (router, app) => {
    const database = app.database

    router.get('/api/bundles', app.auth.middleware, async (req, res) => {
        try {
            const sqlBundles = await database.queryRaw('SELECT bundles.* FROM bundles JOIN bundleUser ON bundles.id = bundleUser.bundleId WHERE bundleUser.userId = ?', req.credentials.id)
            res
                .status(200)
                .json(sqlBundles.map(v => ({
                    ...v,
                })))
                .end()
        } catch (error) {
            console.error(error)
            res
                .status(500)
                .json(jsonUtils.map(error))
                .end()
        }
    })

    router.get('/api/bundles/:bundleId', app.auth.middleware, async (req, res) => {
        try {
            const sqlBundles = await database.queryRaw('SELECT bundles.* FROM bundles JOIN bundleUser ON bundles.id = bundleUser.bundleId WHERE bundleUser.userId = ? AND bundles.id = ?', [req.credentials.id, req.params.bundleId])
            res
                .status(200)
                .json(sqlBundles[0])
                .end()
        } catch (error) {
            console.error(error)
            res
                .status(500)
                .json(jsonUtils.map(error))
                .end()
        }
    })

    router.post('/api/bundles', app.auth.middleware, async (req, res) => {
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
                .status(201)
                .json(newBundle)
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

    router.post('/api/bundles/:bundleId/leave', app.auth.middleware, async (req, res) => {
        try {
            const sqlBundles = await database.queryRaw('SELECT bundles.* FROM bundles JOIN bundleUser ON bundles.id = bundleUser.bundleId WHERE bundleUser.userId = ? AND bundles.id = ?', [req.credentials.id, req.params.bundleId])
            if (!sqlBundles.length) {
                res
                    .status(404)
                    .json({ error: 'Bundle not found' })
                    .end()
                return
            }

            await database.delete('bundleUser', 'bundleUser.userId = ? AND bundleUser.bundleId = ?', [req.credentials.id, req.params.bundleId])

            // Cleanup
            const usersInBundle = (await database.queryRaw(`SELECT COUNT(*) FROM bundleUser WHERE bundleUser.bundleId = ?`, [req.params.bundleId]))
            if (!(usersInBundle[0][Object.keys(usersInBundle[0])[0]])) {
                await database.delete('bundleChannel', 'bundleChannel.bundleId = ?', [req.params.bundleId])
                await database.delete('bundles', 'bundles.id = ?', [req.params.bundleId])
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

    router.get('/api/bundles/:bundleId/channels', app.auth.middleware, async (req, res) => {
        try {
            const sqlBundles = await database.queryRaw(`
                SELECT bundles.*
                FROM bundles
                JOIN bundleUser ON bundles.id = bundleUser.bundleId
                WHERE bundleUser.userId = ?
                AND bundles.id = ?
            `, [req.credentials.id, req.params.bundleId])
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
            `, [req.params.bundleId])

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
            res
                .status(500)
                .json(jsonUtils.map(error))
                .end()
        }
    })

    router.post('/api/bundles/:bundleId/channels', app.auth.middleware, async (req, res) => {
        try {
            const sqlBundles = await database.queryRaw(`
                SELECT bundles.*
                FROM bundles
                JOIN bundleUser ON bundles.id = bundleUser.bundleId
                WHERE bundleUser.userId = ?
                AND bundles.id = ?
            `, [req.credentials.id, req.params.bundleId])
            if (!sqlBundles.length) {
                res
                    .status(404)
                    .json({ error: 'Bundle not found' })
                    .end()
                return
            }

            const channel = await app.getChannel(req.body.id)
            if (!channel) {
                res
                    .status(404)
                    .json({ error: 'Channel not found' })
                    .end()
                return
            }

            const sqlChannels = await database.queryRaw(`
                SELECT channels.*
                FROM channels
                JOIN bundleChannel ON channels.id = bundleChannel.channelId
                AND bundleChannel.bundleId = ?
                WHERE bundleChannel.channelId = ?
                LIMIT 1
            `, [req.params.bundleId, req.body.id])

            if (sqlChannels.length) {
                res
                    .status(404)
                    .json({ error: 'Channel already in the bundle' })
                    .end()
                return
            }

            await database.insert('bundleChannel', {
                bundleId: req.params.bundleId,
                channelId: req.body.id,
            })

            res
                .status(201)
                .end()
        } catch (error) {
            console.error(error)
            res
                .status(500)
                .json(jsonUtils.map(error))
                .end()
        }
    })

    router.delete('/api/bundles/:bundleId/channels', app.auth.middleware, async (req, res) => {
        try {
            const sqlBundles = await database.queryRaw(`
                SELECT bundles.*
                FROM bundles
                JOIN bundleChannel ON bundles.id = bundleChannel.bundleId
                JOIN bundleUser ON bundles.id = bundleUser.bundleId
                WHERE bundleUser.userId = ?
                AND bundles.id = ?
            `, [req.credentials.id, req.params.bundleId])
            if (!sqlBundles.length) {
                res
                    .status(404)
                    .json({ error: 'Bundle not found' })
                    .end()
                return
            }

            const channel = await app.getChannel(req.body.id)
            if (!channel) {
                res
                    .status(404)
                    .json({ error: 'Channel not found' })
                    .end()
                return
            }

            const deleteResult = await database.delete('bundleChannel', `
                bundleChannel.bundleId = ? AND
                bundleChannel.channelId = ?
            `, [req.params.bundleId, req.body.id])

            if (!deleteResult) {
                res
                    .status(500)
                    .json({ error: 'Failed to remove the channel from the bundle' })
                    .end()
                return
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
