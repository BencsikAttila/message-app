const express = require('express')
const path = require('path')
const fs = require('fs')

/**
 * @param {express.Router} router
 * @param {import('../utils')} app
 */
module.exports = (router, app) => {
    const database = app.database

    router.get('/login', async (req, res) => {
        res.render('login')
    })

    router.get('/register', async (req, res) => {
        res.render('register')
    })

    router.post('/login', async (req, res) => {
        const { username, password, redirect } = req.body

        const authResult = await app.auth.authenticate(database, username, password)

        if (authResult.error) {
            res
                .status(401)
                .render('login', {
                    error: authResult.error,
                    redirect: redirect,
                })
            return
        }

        res
            .cookie('token', authResult.token, { path: '/', maxAge: app.auth.exparationTimeSec * 1000 })
            .status(303)
            .header('Location', '/')
            .end()
    })

    router.post('/register', async (req, res) => {
        const { username, password, redirect } = req.body

        const authRes = await app.auth.create(database, username, password)

        if (authRes.error) {
            res
                .status(401)
                .json({
                    error: authRes.error,
                    redirect: redirect,
                })
                .end()
            return
        }

        res
            .cookie('token', authRes.token, { path: '/', maxAge: 1000 * 60 })
            .header('Location', '/')
            .status(303)
            .end()
    })

    router.get('/logout', app.auth.middleware, async (req, res) => {
        await app.auth.logout(req.token)
        res
            .clearCookie('token')
            .status(303)
            .header('Location', '/')
            .end()
    })

    router.get('/', app.auth.middleware, async (req, res) => {
        const user = await app.getUser(req.credentials.id)
        const channels = await database.queryRaw('SELECT channels.* FROM channels JOIN userChannel ON channels.id = userChannel.channelId WHERE userChannel.userId = ? AND channels.friendChannel = 0', req.credentials.id)

        if (user.lastChannelId && (await database.queryRaw('SELECT * FROM userChannel WHERE userChannel.userId = ? AND userChannel.channelId = ?', [req.credentials.id, user.lastChannelId])).length) {
            res.redirect(`/channels/${user.lastChannelId}`)
        } else {
            res.render('home', {
                user: {
                    ...user,
                    password: undefined,
                },
                channels: channels,
            })
        }
    })

    router.get('/friends', app.auth.middleware, async (req, res) => {
        const user = await app.getUser(req.credentials.id)
        const friends = await app.getFriends(req.credentials.id)
        const channels = await database.queryRaw('SELECT channels.* FROM channels JOIN userChannel ON channels.id = userChannel.channelId WHERE userChannel.userId = ? AND channels.friendChannel = 0', req.credentials.id)

        res.render('friends', {
            user: {
                ...user,
                password: undefined,
            },
            channels: channels,
            friends: [...friends.incoming, ...friends.outgoing]
                .filter(v => v.verified)
                .map(v => app.mapUser(v, req.credentials.id)),
            friendRequests: friends.incoming
                .filter(v => !v.verified)
                .map(v => app.mapUser(v, req.credentials.id)),
            sentFriendRequests: friends.outgoing
                .filter(v => !v.verified)
                .map(v => app.mapUser(v, req.credentials.id)),
        })
    })

    router.get('/account', app.auth.middleware, async (req, res) => {
        const channels = await database.queryRaw('SELECT channels.* FROM channels JOIN userChannel ON channels.id = userChannel.channelId WHERE userChannel.userId = ? AND channels.friendChannel = 0', req.credentials.id)

        res.render('account', {
            user: {
                ...req.user,
                password: undefined,
            },
            channels: channels,
        })
    })

    router.get('/channels/:id', app.auth.middleware, async (req, res) => {
        const channel = await app.getChannel(req.params.id)
        if (!channel) {
            res
                .status(404)
                .end()
            return
        }

        if (!(await app.checkChannelPermissions(req.credentials.id, req.params.id))) {
            res
                .status(400)
                .json({ error: 'No permissions' })
                .end()
            return
        }

        await database.update('users', 'lastChannelId = ?', 'users.id = ?', [req.params.id, req.credentials.id])

        const channels = await database.queryRaw('SELECT channels.* FROM channels JOIN userChannel ON channels.id = userChannel.channelId WHERE userChannel.userId = ?', req.credentials.id)

        const users = await database.queryRaw('SELECT users.* FROM users JOIN userChannel ON users.id = userChannel.userId WHERE userChannel.channelId = ?', channel.id)

        const messages = await database.queryRaw('SELECT messages.*, users.id as senderId, users.nickname as senderNickname, users.nickname as senderNickname FROM messages JOIN users ON users.id = messages.senderId WHERE messages.channelId = ?', channel.id)

        for (const message of messages) {
            const attachments = await database.queryRaw(`SELECT * FROM messageAttachments WHERE messageAttachments.messageId = ?`, [message.id])
            message.attachments = attachments.map(v => v.id)
        }

        res.render('channel', {
            user: {
                ...req.user,
                password: undefined,
            },
            channel: {
                ...channel,
            },
            members: users.map(v => app.mapUser(v, req.credentials.id)),
            messages: messages.map(v => ({
                ...v,
                createdAt: new Date(v.createdUtc * 1000).toLocaleTimeString(),
            })),
            channels: channels.filter(v => !v.friendChannel),
            ongoingCall: channel.id in require('../call-server').channels,
        })
    })

    router.get('/invitations/:id/use', app.auth.middleware, async (req, res) => {
        try {
            const sqlInvitation = await app.getInvitation(req.params.id)
            if (!sqlInvitation) {
                res.status(404)
                res.write('Invitation not found')
                res.end()
                return
            }

            const sqlChannels = await app.getChannel(sqlInvitation.channelId)
            if (sqlChannels) {
                const sqlUserChannels = await database.queryRaw('SELECT * FROM userChannel WHERE userChannel.channelId = ? AND userChannel.userId = ? LIMIT 1', [sqlChannels.id, req.credentials.id])
                if (sqlUserChannels.length) {
                    res.status(400)
                    res.write('You are already in this channel')
                    res.end()
                    return
                }

                await database.insert('userChannel', {
                    userId: req.credentials.id,
                    channelId: sqlChannels.id,
                })

                await database.queryRaw(`UPDATE invitations SET usages = usages + 1 WHERE id = ?`, [sqlInvitation.id])

                res
                    .status(303)
                    .header('Location', '/channels/' + sqlChannels.id)
                    .end()
                return
            }

            const sqlBundles = await app.getBundle(sqlInvitation.channelId)
            if (sqlBundles) {
                const sqlUserBundles = await database.queryRaw('SELECT * FROM bundleUser WHERE bundleUser.bundleId = ? AND bundleUser.userId = ? LIMIT 1', [sqlBundles.id, req.credentials.id])
                if (sqlUserBundles.length) {
                    res.status(400)
                    res.write('You are already in this bundle')
                    res.end()
                    return
                }

                await database.insert('bundleUser', {
                    userId: req.credentials.id,
                    bundleId: sqlBundles.id,
                })

                await database.queryRaw(`UPDATE invitations SET usages = usages + 1 WHERE id = ?`, [sqlInvitation.id])

                res
                    .status(303)
                    .header('Location', '/')
                    .end()
                return
            }

            res.status(404)
            res.write('Channel not found')
            res.end()
            return
        } catch (error) {
            console.error(error)
            res
                .status(500)
                .end()
        }
    })

    router.get('/hbs/partials', async (req, res) => {
        const files = fs.readdirSync(path.join(__dirname, '..', '..', 'public', 'partials'))
        const partials = {}
        for (const v of files) {
            const name = path.join(__dirname, '..', '..', 'public', 'partials', v)
            if (fs.existsSync(name)) {
                partials[v.replace('.handlebars', '')] = fs.readFileSync(name, 'utf8')
            }
        }
        res
            .status(200)
            .json(partials)
            .end()
    })

    router.use('/css', express.static(path.join(__dirname, '..', 'node_modules', 'fontawesome-free', 'css')))
    router.use('/webfonts', express.static(path.join(__dirname, '..', 'node_modules', 'fontawesome-free', 'webfonts')))
    router.use('/js', express.static(path.join(__dirname, '..', 'node_modules', 'fontawesome-free', 'js')))
    router.use(express.static(path.join(__dirname, '..', '..', 'public')))
    router.use(express.static(path.join(__dirname, '..', 'node_modules', 'handlebars', 'dist')))

}
