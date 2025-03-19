const express = require('express')
const path = require('path')
const database = require('../db')
const auth = require('../auth')
const router = express.Router(({ mergeParams: true }))

/*
router.get('/login', async (req, res) => {
    res.render('login')
})

router.get('/register', async (req, res) => {
    res.render('register')
})

router.post('/login', async (req, res) => {
    const { username, password } = req.body

    const authResult = await auth.authenticate(database, username, password)

    if (authResult.error) {
        res
            .status(401)
            .render('login', {
                error: authResult.error
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
        .cookie('token', authRes.token, { path: '/', maxAge: 1000 * 60 })
        .header('Location', '/')
        .status(303)
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

router.get('/channels/:id', auth.middleware, async (req, res) => {
    const channel = await database.queryRaw('SELECT * FROM channels WHERE channels.uuid = ? LIMIT 1', req.params.id)
    if (channel.length === 0) {
        res.status(404).end()
        return
    }

    const user = (await database.queryRaw('SELECT * FROM users WHERE users.id = ?;', req.credentials.id))[0]

    res.render('channel', {
        user: {
            ...user,
            password: undefined,
        },
        channel: {
            ...channel[0],
            id: undefined,
        },
    })
})
*/

// router.use(express.static(path.join(__dirname, '..', '..', 'public')))
// router.use(express.static(path.join(__dirname, '..', 'node_modules', 'handlebars', 'dist')))
router.use(express.static(path.join(__dirname, '..', '..', 'client', 'build')))
router.get('*', (req,res) =>{ res.sendFile(path.join(__dirname, '..', '..', 'client', 'build', 'index.html')) })

module.exports = router
