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

    router.get('/api/invitations', auth.middleware, async (req, res) => {
        try {
            const result = await (() => {
                if (req.query['for']) {
                    return database.queryRaw('SELECT * FROM invitations WHERE invitations.userId = ? AND invitations.channelId = ?', [ req.credentials.id, req.query['for'] + '' ])
                } else {
                    return database.queryRaw('SELECT * FROM invitations WHERE invitations.userId = ?', req.credentials.id)
                }
            })()
            res.setHeader('Content-Type', 'application/json')
            res.statusCode = 200
            res.flushHeaders()
            res.write(JSON.stringify(result.map(v => ({
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
    
    router.post('/api/invitations', auth.middleware, async (req, res) => {
        try {
            await database.insert('invitations', {
                id: uuid.v4(),
                channelId: req.body.for,
                usages: 0,
                userId: req.credentials.id,
                expiresAt: 0,
            })
            res
                .status(200)
                .json({
                    
                })
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
    
    router.delete('/api/invitations/:id', auth.middleware, async (req, res) => {
        try {
            const sqlRes = database.queryRaw('DELETE FROM invitations WHERE invitations.userId = ? AND invitations.id = ?', [ req.credentials.id, req.params['id'] + '' ])
            res
                .status(200)
                .json(sqlRes)
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
    
    router.get('/api/invitations/:id/use', auth.middleware, async (req, res) => {
        try {
            const sqlInvitation = await app.getInvitation(req.params.id)
            if (!sqlInvitation) {
                res
                    .status(404)
                    .json({ error: 'Invitation not found' })
                    .end()
                return
            }
            const channel = await app.getChannel(sqlInvitation.channelId)
            if (channel) {
                const sqlUserChannels = await database.queryRaw('SELECT * FROM userChannel WHERE userChannel.channelId = ? AND userChannel.userId = ? LIMIT 1', [ channel.id, req.credentials.id ])
                if (sqlUserChannels.length) {
                    res
                        .status(400)
                        .json({ error: 'You are already in this channel' })
                        .end()
                    return
                }
    
                await database.insert('userChannel', {
                    userId: req.credentials.id,
                    channelId: channel.id,
                })
    
                await database.queryRaw(`UPDATE invitations SET usages = usages + 1 WHERE id = ?`, [ sqlInvitation.id ])
    
                res
                    .status(200)
                    .end()
                return
            }
    
            const bundle = await app.getBundle(sqlInvitation.channelId)
            if (bundle) {
                const sqlUserBundles = await database.queryRaw('SELECT * FROM bundleUser WHERE bundleUser.bundleId = ? AND bundleUser.userId = ? LIMIT 1', [ bundle.id, req.credentials.id ])
                if (sqlUserBundles.length) {
                    res
                        .status(400)
                        .json({ error: 'You are already in this bundle' })
                        .end()
                    return
                }
    
                await database.insert('bundleUser', {
                    userId: req.credentials.id,
                    bundleId: bundle.id,
                })
    
                await database.queryRaw(`UPDATE invitations SET usages = usages + 1 WHERE id = ?`, [ sqlInvitation.id ])
    
                res
                    .status(200)
                    .end()
                return
            }
    
            res
                .status(404)
                .json({ error: 'Channel or bundle not found' })
                .end()
            return
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
