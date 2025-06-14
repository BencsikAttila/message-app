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
            const usersInChannel = await database.queryRaw('SELECT users.* FROM users JOIN userChannel ON users.id = userChannel.userId WHERE userChannel.channelId = ?', req.params.channelId)
            /** @type {ReadonlyArray<import('../../db/model').default['users']>} */
            const usersInBundle = await database.queryRaw('SELECT users.* FROM bundleUser JOIN bundles ON bundles.id = bundleUser.bundleId JOIN bundleChannel ON bundles.id = bundleChannel.bundleId JOIN users ON users.id = bundleUser.userId WHERE bundleChannel.channelId = ?', [req.params.channelId])

            const usersTemp = {}
            for (const v of usersInChannel) usersTemp[v.id] = v
            for (const v of usersInBundle) usersTemp[v.id] = v

            /** @type {ReadonlyArray<import('../../db/model').default['users']>} */
            const users = Object.values(usersTemp)

            res
                .status(200)
                .json(users.map(v => app.mapUser(v, req.credentials.id)))
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
            const messagesInChannel = await database.queryRaw(`SELECT * FROM messages WHERE messages.channelId = ?`, [req.params.channelId])
            for (const message of messagesInChannel) {
                await app.deleteMessage(message.id)
            }
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
