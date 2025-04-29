const express = require('express')
const jsonUtils = require('../../json-utils')
const uuid = require('uuid')

/**
 * @param {express.Router} router
 * @param {import('../../utils')} app
 */
module.exports = (router, app) => {
    const database = app.database

    router.get('/api/channels/:channelId', app.auth.middleware, async (req, res) => {
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
            res
                .status(500)
                .json(jsonUtils.map(error))
                .end()
        }
    })

    router.get('/api/channels/:channelId/users', app.auth.middleware, async (req, res) => {
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
            const sqlUsers2 = await database.queryRaw('SELECT users.* FROM bundleUser JOIN bundles ON bundles.id = bundleUser.bundleId JOIN bundleChannel ON bundles.id = bundleChannel.bundleId JOIN users ON users.id = bundleUser.userId WHERE bundleChannel.channelId = ?', [req.params.channelId])

            const _sqlUsers = {}
            for (const v of sqlUsers1) _sqlUsers[v.id] = v
            for (const v of sqlUsers2) _sqlUsers[v.id] = v

            /** @type {ReadonlyArray<import('../../db/model').default['users']>} */
            const sqlUsers = Object.values(_sqlUsers)

            /** @type {Array<import('ws').WebSocket>} */
            const wsClients = []
            for (const wsClient of app.wss.getWss().clients.values()) {
                wsClients.push(wsClient)
            }

            res
                .status(200)
                .json(sqlUsers.map(v => ({
                    ...v,
                    password: undefined,
                    // @ts-ignore
                    isOnline: v.id === req.credentials.id ? true : wsClients.some(_v => _v.user?.id === v.id),
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

    router.post('/api/channels/:channelId/leave', app.auth.middleware, async (req, res) => {
        const channel = await app.getChannel(req.params.channelId)

        if (!channel) {
            res
                .status(400)
                .json({ error: 'Channel not found' })
                .end()
            return
        }

        if (channel.friendChannel) {
            res
                .status(400)
                .json({ error: 'Cannot leave from a friend channel' })
                .end()
            return
        }

        await database.queryRaw('DELETE FROM userChannel WHERE userChannel.channelId = ? AND userChannel.userId = ?', [req.params.channelId, req.credentials.id])

        // Cleanup
        const usersInChannel = (await database.queryRaw(`SELECT COUNT(*) FROM userChannel WHERE userChannel.channelId = ?`, [req.params.channelId]))
        const bundlesWithChannel = (await database.queryRaw(`SELECT COUNT(*) FROM bundleChannel WHERE bundleChannel.channelId = ?`, [req.params.channelId]))
        if (!(usersInChannel[0][Object.keys(usersInChannel[0])[0]]) && !(bundlesWithChannel[0][Object.keys(bundlesWithChannel[0])[0]])) {
            await database.delete('channels', 'channels.id = ?', [req.params.channelId])
            await database.delete('messages', 'messages.channelId = ?', [req.params.channelId])
        }

        res
            .status(200)
            .end()
    })

    router.get('/api/channels', app.auth.middleware, async (req, res) => {
        try {
            const sqlChannels = await database.queryRaw('SELECT channels.* FROM channels JOIN userChannel ON channels.id = userChannel.channelId WHERE userChannel.userId = ? AND channels.friendChannel = 0', req.credentials.id)
            res
                .status(200)
                .json(sqlChannels)
                .end()
        } catch (error) {
            console.error(error)
            res
                .status(500)
                .json(jsonUtils.map(error))
                .end()
        }
    })

    router.post('/api/channels', app.auth.middleware, async (req, res) => {
        /** @type {import('../../db/model').default['channels']} */
        const newChannel = {
            id: uuid.v4(),
            name: (req.body.name ?? '').trim(),
            ownerId: req.credentials.id,
            friendChannel: 0,
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
                .status(201)
                .json(newChannel)
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
