const path = require('path')
const express = require('express')
const database = require('../db')
const databaseConnection = require('../db')
const jsonUtils = require('../json-utils')
const auth = require('../auth')
const uuid = require('uuid')
const fs = require('fs')
const sharp = require('sharp')

const router = express.Router(({ mergeParams: true }))

router.post('/api/login', async (req, res) => {
    const { username, password } = req.body

    const authResult = await auth.authenticate(database, username, password)

    if (authResult.error) {
        res
            .status(401)
            .json({
                error: authResult.error,
            })
            .end()
        return
    }

    res
        .status(200)
        .json({
            token: authResult.token
        })
        .end()
})

router.post('/api/register', async (req, res) => {
    const { username, password } = req.body

    const authRes = await auth.create(database, username, password)

    if (authRes.error) {
        res
            .status(401)
            .json({
                error: authRes.error,
            })
            .end()
        return
    }

    res
        .status(200)
        .json({
            token: authRes.token,
        })
        .end()
})

router.get('/api/user', auth.middleware, async (req, res) => {
    try {
        res.setHeader('Content-Type', 'application/json')
        res.statusCode = 200
        res.flushHeaders()
        res.write(JSON.stringify({
            ...req.user,
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

router.patch('/api/user', auth.middleware, async (req, res) => {
    try {
        if ('nickname' in req.body) {
            await database.queryRaw('UPDATE users SET nickname = ? WHERE users.id = ?', [ req.body['nickname'], req.credentials.id ])
        }
        if ('theme' in req.body) {
            await database.queryRaw('UPDATE users SET theme = ? WHERE users.id = ?', [ req.body['theme'], req.credentials.id ])
        }
        res.status(200)
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

router.get('/users/:userId/avatar.webp', auth.middleware, async (req, res) => {
    try {
        const sqlUser = await database.queryRaw('SELECT * FROM users WHERE users.id = ? LIMIT 1', req.params.userId)
        if (!sqlUser.length) {
            res
                .status(404)
                .end()
            return
        }

        const size = Number.parseInt(req.query['size'] + '')

        const filePath = path.join(__dirname, '..', '..', 'database', 'images', 'avatars', `${req.params.userId}.webp`)
        if (!fs.existsSync(filePath)) {
            if (req.query['nodefault']) {
                res
                .status (404)
                .end()
            } else {
                if (req.query['size'] && !Number.isNaN(size)) {
                    res.redirect(`https://robohash.org/${encodeURIComponent(sqlUser[0].id)}.webp?set=set4&size=${size}x${size}`)
                } else {
                    res.redirect(`https://robohash.org/${encodeURIComponent(sqlUser[0].id)}.webp?set=set4`)
                }
            }
            return
        }

        res.status(200)
        res.setHeader('Content-Type', 'image/webp')

        if (req.query['size'] && !Number.isNaN(size)) {
            sharp(fs.readFileSync(filePath))
                .resize(size, size)
                .webp()
                .toBuffer()
                .then(buffer => {
                    res.write(buffer)
                    res.end()
                })
        } else {
            const fileStream = fs.createReadStream(filePath, {
                autoClose: true,
            })
            
            fileStream.pipe(res)
        }
    } catch (error) {
        console.error(error)
        res.setHeader('Content-Type', 'application/json')
        res.statusCode = 500
        res.flushHeaders()
        res.write(JSON.stringify(error, jsonUtils.replacer))
        res.end()
    }
})

router.put('/api/user/avatar', auth.middleware, async (req, res) => {
    try {
        req.pipe(req.busboy)
        req.busboy.on('file', (fieldname, file, filename) => {
            if (!fs.existsSync(path.join(__dirname, '..', '..', 'database', 'images', 'avatars'))) {
                fs.mkdirSync(path.join(__dirname, '..', '..', 'database', 'images', 'avatars'), { recursive: true })
            }
            const chunks = []
            file.on('data', chunk => chunks.push(chunk))
            file.on('end', () => {
                const buffer = Buffer.concat(chunks)
                sharp(buffer)
                    .resize(128, 128)
                    .toFile(path.join(__dirname, '..', '..', 'database', 'images', 'avatars', `${req.user.id}.webp`), (error, info) => {
                        if (error) {
                            console.error(error)
                            res
                                .status(500)
                                .json({
                                    error: error.message
                                })
                                .end()
                        } else {
                            res
                                .status(201)
                                .end()
                        }
                    })
            })
        })
    } catch (error) {
        console.error(error)
        res.setHeader('Content-Type', 'application/json')
        res.statusCode = 500
        res.flushHeaders()
        res.write(JSON.stringify(error, jsonUtils.replacer))
        res.end()
    }
})

router.delete('/api/user/avatar', auth.middleware, async (req, res) => {
    try {
        const filepath = path.join(__dirname, '..', '..', 'database', 'images', 'avatars', `${req.user.id}.webp`)
        if (fs.existsSync(filepath)) {
            fs.rmSync(filepath)
        }

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

        const sqlMessages = await database.queryRaw('SELECT messages.*, users.id as senderId, users.username as senderUsername, users.nickname as senderNickname FROM messages JOIN users ON users.id = messages.senderId WHERE messages.channelId = ?', sqlChannel[0].id)

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
        content: (req.body.content ?? '').trim(),
        createdUtc: Math.floor(new Date().getTime() / 1000),
        channelId: sqlChannel[0].id,
        senderId: req.credentials.id,
    }

    if (!newMessage.content) {
        res
            .status(400)
            .json({ error: 'Empty message' })
            .end()
        return
    }

    try {
        await database.insert('messages', newMessage)
        for (const client of (/** @type {ReturnType<import('express-ws')>} */ (global['wsInstance'])).getWss().clients.values()) {
            client.send(JSON.stringify(/** @type {import('../websocket-messages').MessageCreatedEvent} */ ({
                type: 'message_created',
                content: newMessage.content,
                channel: sqlChannel[0].uuid,
                createdUtc: newMessage.createdUtc,
                user: req.user,
                senderId: req.user.id,
                ...req.user,
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

router.delete('/api/channels/:channelId/messages/:messageId', auth.middleware, async (req, res) => {
    const sqlChannel = await database.queryRaw('SELECT * FROM channels WHERE channels.uuid = ? LIMIT 1', req.params.channelId)

    const sqlPermission = await database.queryRaw('SELECT * FROM userChannel WHERE userChannel.channelId = ? AND userChannel.userId = ? LIMIT 1', [ sqlChannel[0].id, req.credentials.id ])
    if (!sqlPermission.length) {
        res
            .status(400)
            .json({ error: 'No permissions' })
            .end()
        return
    }

    try {
        const sqlRes = await database.queryRaw('DELETE FROM messages WHERE messages.senderId = ? AND messages.id = ?', [ req.credentials.id, req.params['messageId'] + '' ])
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

router.get('/api/bundles', auth.middleware, async (req, res) => {
    try {
        const sqlBundles = await databaseConnection.queryRaw('SELECT bundles.* FROM bundles JOIN bundleUser ON bundles.id = bundleUser.bundleId WHERE bundleUser.userId = ?', req.credentials.id)
        res.setHeader('Content-Type', 'application/json')
        res.statusCode = 200
        res.flushHeaders()
        res.write(JSON.stringify(sqlBundles.map(v => ({
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

    /** @type {import('../db/model').default['bundles']} */
    const newBundle = {
        uuid: uuid.v4(),
        name: req.body.name,
    }

    try {
        const sqlRes = await database.insert('bundles', newBundle)
        await database.insert('bundleUser', {
            userId: req.credentials.id,
            bundleId: sqlRes.lastID,
        })

        for (const channel of req.body.channels) {
            const sqlChannels = await database.queryRaw('SELECT * FROM channels WHERE channels.uuid = ? LIMIT 1', channel)
            if (!sqlChannels.length) continue

            await database.insert('bundleChannel', {
                bundleId: sqlRes.lastID,
                channelId: sqlChannels[0].id,
            })
        }
        res
            .status(200)
            .end()
    } catch (error) {
        res
            .status(500)
            .setHeader('Content-Type', 'application/json')
            .flushHeaders()
        res.write(JSON.stringify(error, jsonUtils.replacer))
        res.end()
    }
})

router.delete('/api/bundles/:uuid', auth.middleware, async (req, res) => {
    try {
        const sqlBundles = await databaseConnection.queryRaw('SELECT bundles.* FROM bundles JOIN bundleUser ON bundles.id = bundleUser.bundleId WHERE bundleUser.userId = ? AND bundles.uuid = ?', [ req.credentials.id, req.params['uuid'] + '' ])
        if (!sqlBundles.length) {
            res
                .status(404)
                .end()
            return
        }
        
        const sqlRes1 = database.queryRaw('DELETE FROM bundleUser WHERE bundleUser.userId = ? AND bundleUser.bundleId = ?', [ req.credentials.id, sqlBundles[0].id ])
        res
            .status(200)
            .json(sqlRes1)
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

router.get('/api/bundles/:bundleId/channels', auth.middleware, async (req, res) => {
    try {
        const sqlBundles = await databaseConnection.queryRaw(`
            SELECT bundles.*
            FROM bundles
            JOIN bundleUser ON bundles.id = bundleUser.bundleId
            WHERE bundleUser.userId = ?
            AND bundles.uuid = ?
        `, [ req.credentials.id, req.params.bundleId ])

        if (!sqlBundles.length) {
            res
                .status(404)
                .end()
            return
        }

        const sqlChannels = await databaseConnection.queryRaw(`
            SELECT channels.*
            FROM channels
            JOIN bundleChannel ON channels.id = bundleChannel.channelId
            AND bundleChannel.bundleId = ?
        `, [ sqlBundles[0].id ])

        res
            .status(200)
            .setHeader('Content-Type', 'application/json')
            .flushHeaders()
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

router.post('/api/bundles/:bundleId/channels', auth.middleware, async (req, res) => {
    try {
        const sqlBundles = await database.queryRaw(`
            SELECT bundles.*
            FROM bundles
            JOIN bundleChannel ON bundles.id = bundleChannel.bundleId
            JOIN bundleUser ON bundles.id = bundleUser.bundleId
            WHERE bundleUser.userId = ?
            AND channels.uuid = ?
        `, [])
        if (!sqlBundles.length) {
            res
                .status(404)
                .end()
            return
        }

        const sqlChannels = await database.queryRaw('SELECT * FROM channels WHERE channels.uuid = ? LIMIT 1', req.params.channelId)
        if (!sqlChannels.length) {
            res
                .status(404)
                .end()
            return
        }

        await database.insert('bundleChannel', {
            bundleId: sqlBundles[0].id,
            channelId: sqlChannels[0].id,
        })

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

router.get('/hbs/partials', async (req, res) => {
    const files = fs.readdirSync(path.join(__dirname, '..', '..', 'public', 'partials'))
    res
        .status(200)
        .json(files.map(v => v.replace('.handlebars', '')))
        .end()
})

module.exports = router
