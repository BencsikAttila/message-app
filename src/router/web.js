const express = require('express')
const path = require('path')
const database = require('../db')
const auth = require('../auth')
const router = express.Router(({ mergeParams: true }))

router.get('/login', async (req, res) => {
    res.render('login')
})

router.get('/register', async (req, res) => {
    res.render('register')
})

router.post('/login', async (req, res) => {
    const { username, password, redirect } = req.body

    const authResult = await auth.authenticate(database, username, password)

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
        .cookie('token', authResult.token, { path: '/', maxAge: 1000 * 60 * 30 })
        .status(303)
        .header('Location', '/')
        .end()
})

router.post('/register', async (req, res) => {
    const { username, password, redirect } = req.body

    const authRes = await auth.create(database, username, password)

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

router.get('/logout', auth.middleware, async (req, res) => {
    await auth.logout(req.token)
    res
        .clearCookie('token')
        .status(303)
        .header('Location', '/')
        .end()
})

router.get('/', auth.middleware, async (req, res) => {
    const user = (await database.queryRaw('SELECT * FROM users WHERE users.id = ?;', req.credentials.id))[0]

    res.render('home', {
        user: {
            ...user,
            password: undefined,
        },
    })
})

router.get('/account', auth.middleware, async (req, res) => {
    res.render('account', {
        user: {
            ...req.user,
            password: undefined,
        },
    })
})

router.get('/channels/:id', auth.middleware, async (req, res) => {
    const sqlChannel = await database.queryRaw('SELECT * FROM channels WHERE channels.uuid = ? LIMIT 1', req.params.id)
    if (sqlChannel.length === 0) {
        res.status(404).end()
        return
    }

    const sqlPermission = await database.queryRaw('SELECT * FROM userChannel WHERE userChannel.channelId = ? AND userChannel.userId = ? LIMIT 1', [ sqlChannel[0].id, req.credentials.id ])
    if (!sqlPermission.length) {
        res.status(400).end()
        return
    }

    const user = (await database.queryRaw('SELECT * FROM users WHERE users.id = ?;', req.credentials.id))[0]

    res.render('channel', {
        user: {
            ...user,
            password: undefined,
        },
        channel: {
            ...sqlChannel[0],
            id: undefined,
        },
    })
})

router.get('/invitations/:uuid/use', auth.middleware, async (req, res) => {
    try {
        const sqlInvitations = await database.queryRaw('SELECT * FROM invitations WHERE invitations.uuid = ? LIMIT 1', [ req.params['uuid'] ])
        if (!sqlInvitations.length) {
            res.status(404)
            res.write('Invitation not found')
            res.end()
            return
        }

        /** @type {import('../db/model').default['invitations']} */
        const sqlInvitation = sqlInvitations[0]

        const sqlChannels = await database.queryRaw('SELECT * FROM channels WHERE channels.uuid = ? LIMIT 1', [ sqlInvitation.channelId ])
        if (!sqlChannels.length) {
            res.status(404)
            res.write('Channel not found')
            res.end()
            return
        }

        /** @type {import('../db/model').default['channels']} */
        const sqlChannel = sqlChannels[0]

        const sqlUserChannels = await database.queryRaw('SELECT * FROM userChannel WHERE userChannel.channelId = ? AND userChannel.userId = ? LIMIT 1', [ sqlChannel.id, req.credentials.id ])
        if (sqlUserChannels.length) {
            res.status(400)
            res.write('You are already in this channel')
            res.end()
            return
        }

        await database.insert('userChannel', {
            userId: req.credentials.id,
            channelId: sqlChannel.id,
        })

        await database.queryRaw(`UPDATE invitations SET usages = usages + 1 WHERE id = ?`, [ sqlInvitation.id ])

        res
            .status(303)
            .header('Location', '/channels/' + sqlChannel.uuid)
            .end()
    } catch (error) {
        console.error(error)
        res
            .status(500)
            .end()
    }
})

router.use(express.static(path.join(__dirname, '..', '..', 'public')))
router.use(express.static(path.join(__dirname, '..', 'node_modules', 'handlebars', 'dist')))

// router.use(express.static(path.join(__dirname, '..', '..', 'client', 'build')))
// router.get('*', (req,res) =>{ res.sendFile(path.join(__dirname, '..', '..', 'client', 'build', 'index.html')) })

module.exports = router
