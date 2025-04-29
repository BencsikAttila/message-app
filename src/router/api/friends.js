const express = require('express')
const jsonUtils = require('../../json-utils')
const uuid = require('uuid')

/**
 * @param {express.Router} router
 * @param {import('../../utils')} app
 */
module.exports = (router, app) => {
    const database = app.database

    router.get('/api/friends', app.auth.middleware, async (req, res) => {
        try {
            const friends = await app.getFriends(req.credentials.id)

            res
                .status(200)
                .json([...friends.incoming, ...friends.outgoing].map(v => ({
                    ...v,
                    password: undefined,
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

    router.post('/api/friends/:userId', app.auth.middleware, async (req, res) => {
        try {
            if (req.params.userId === req.credentials.id) {
                res
                    .status(400)
                    .json({ error: 'Can\'t friend yourself' })
                    .end()
                return
            }

            const res1 = await database.update('friends', `verified = 1`, `friends.user1_id = ? AND friends.user2_id = ?`, [req.params.userId, req.credentials.id])
            if (res1) {
                res
                    .status(201)
                    .json({ message: 'Friend request verified' })
                    .end()
                return
            }

            /**
             * @type {ReadonlyArray<import('../../db/model').default['friends']>}
             */
            const res2 = await database.queryRaw(`SELECT * FROM friends WHERE friends.user1_id = ? AND friends.user2_id = ? LIMIT 1`, [req.credentials.id, req.params.userId])

            if (res2.length) {
                res
                    .status(400)
                    .json({ error: 'Friend request already sent' })
                    .end()
                return
            }

            const res3 = await database.insert('friends', {
                user1_id: req.credentials.id,
                user2_id: req.params.userId,
                verified: 0,
            })

            if (!res3.changes) {
                res
                    .status(500)
                    .json({ error: 'Failed to sent the friend request' })
                    .end()
            }

            res
                .status(201)
                .json({ message: 'Friend request sent' })
                .end()
        } catch (error) {
            console.error(error)
            res
                .status(500)
                .json(jsonUtils.map(error))
                .end()
        }
    })

    router.get('/api/friends/:userId', app.auth.middleware, async (req, res) => {
        try {
            if (req.params.userId === req.credentials.id) {
                res
                    .status(400)
                    .json({ error: 'Invalid user id' })
                    .end()
                return
            }

            const incoming = (await database.queryRaw(`SELECT users.*, verified FROM friends JOIN users ON friends.user1_id = users.id AND friends.user2_id = ? WHERE users.id = ?`, [req.credentials.id, req.params.userId]))[0]
            const outgoing = (await database.queryRaw(`SELECT users.*, verified FROM friends JOIN users ON friends.user2_id = users.id AND friends.user1_id = ? WHERE users.id = ?`, [req.credentials.id, req.params.userId]))[0]

            if (!incoming && !outgoing) {
                res
                    .status(200)
                    .json({ status: 'NONE' })
                    .end()
                return
            }

            if (incoming?.verified || outgoing?.verified) {
                res
                    .status(200)
                    .json({ status: 'FRIEND' })
                    .end()
                return
            }

            if (incoming) {
                res
                    .status(200)
                    .json({ status: 'IN' })
                    .end()
                return
            }

            if (outgoing) {
                res
                    .status(200)
                    .json({ status: 'OUT' })
                    .end()
                return
            }

            res
                .status(500)
                .json({ error: 'Invalid state' })
                .end()
        } catch (error) {
            console.error(error)
            res
                .status(500)
                .json(jsonUtils.map(error))
                .end()
        }
    })

    router.get('/api/friends/:userId/channel', app.auth.middleware, async (req, res) => {
        try {
            const a = await database.queryRaw(`SELECT channelId FROM friends WHERE friends.user1_id = ? AND friends.user2_id = ? LIMIT 1`, [req.params.userId, req.credentials.id])
            const b = await database.queryRaw(`SELECT channelId FROM friends WHERE friends.user1_id = ? AND friends.user2_id = ? LIMIT 1`, [req.credentials.id, req.params.userId])

            const friendChannels = [...a, ...b]

            if (friendChannels.length > 1) {
                res
                    .status(500)
                    .json({ error: 'Invalid database :(' })
                    .end()
                return
            }

            if (!friendChannels.length) {
                res
                    .status(404)
                    .end()
                return
            }

            const channels = await database.queryRaw('SELECT channels.* FROM channels JOIN userChannel ON channels.id = userChannel.channelId WHERE userChannel.userId = ? AND channels.friendChannel = 1 AND channels.id = ? LIMIT 1', [req.credentials.id, friendChannels[0].channelId])

            if (channels.length > 1) {
                res
                    .status(500)
                    .json({ error: 'Invalid database :(' })
                    .end()
                return
            }

            if (!channels.length) {
                const channelId = uuid.v4()
                await database.insert('channels', {
                    id: channelId,
                    name: '',
                    ownerId: req.params.userId,
                    friendChannel: 1,
                })
                await database.insert('userChannel', {
                    channelId: channelId,
                    userId: req.params.userId,
                })
                await database.insert('userChannel', {
                    channelId: channelId,
                    userId: req.credentials.id,
                })
                await database.update('friends', `channelId = ?`, `friends.user1_id = ? AND friends.user2_id = ?`, [channelId, req.params.userId, req.credentials.id])

                res
                    .status(200)
                    .json(channelId)
                    .end()
            } else {
                res
                    .status(200)
                    .json(channels[0].id)
                    .end()
            }
        } catch (error) {
            console.error(error)
            res
                .status(500)
                .json(jsonUtils.map(error))
                .end()
        }
    })

    router.delete('/api/friends/:userId', app.auth.middleware, async (req, res) => {
        try {
            const res1 = (
                (await database.delete('friends', `friends.user1_id = ? AND friends.user2_id = ?`, [req.credentials.id, req.params.userId]))
                ||
                (await database.delete('friends', `friends.user2_id = ? AND friends.user1_id = ?`, [req.credentials.id, req.params.userId]))
            )
            if (!res1) {
                res
                    .status(500)
                    .json({ message: 'Failed to remove friend' })
                    .end()
                return
            }

            res
                .status(200)
                .json({ message: 'Friend removed' })
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
