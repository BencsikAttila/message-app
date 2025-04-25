const path = require('path')
const express = require('express')
const jsonUtils = require('../../json-utils')
const fs = require('fs')
const sharp = require('sharp')

/**
 * @param {express.Router} router
 * @param {import('../../utils')} app
 */
module.exports = (router, app) => {
    const database = app.database

    router.post('/api/logout', app.auth.middleware, async (req, res) => {
        await app.auth.logout(req.token)
        res
            .status(200)
            .end()
    })

    router.post('/api/login', async (req, res) => {
        const { username, password } = req.body

        const authResult = await app.auth.authenticate(database, username, password)

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

        const authRes = await app.auth.create(database, username, password)

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

    router.get('/api/loggedin', app.auth.middleware, async (req, res) => {
        const result = []
        for (const token of app.auth.tokens) {
            const v = await app.auth.verify(token)
            if (!v) continue
            if (v.id !== req.credentials.id) continue
            result.push({
                token: token,
                payload: v,
            })
        }

        res
            .status(200)
            .json(result)
            .end()
    })

    router.delete('/api/loggedin/:token', app.auth.middleware, async (req, res) => {
        for (const token of app.auth.tokens) {
            const v = await app.auth.verify(token)
            if (!v) continue
            if (v.id !== req.credentials.id) continue
            await app.auth.logout(token)
            res
                .status(200)
                .end()
            return
        }

        res
            .status(400)
            .json({ error: 'Invalid token' })
            .end()
    })

    router.get('/api/user', app.auth.middleware, async (req, res) => {
        try {
            res.setHeader('Content-Type', 'application/json')
            res.statusCode = 200
            res.flushHeaders()
            res.write(JSON.stringify({
                ...req.user,
                password: undefined,
            }))
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

    router.patch('/api/user', app.auth.middleware, async (req, res) => {
        try {
            if ('nickname' in req.body) {
                await database.queryRaw('UPDATE users SET nickname = ? WHERE users.id = ?', [req.body['nickname'], req.credentials.id])
            }
            if ('theme' in req.body) {
                await database.queryRaw('UPDATE users SET theme = ? WHERE users.id = ?', [req.body['theme'], req.credentials.id])
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

    router.get('/users/:userId/avatar.webp', app.auth.middleware, async (req, res) => {
        try {
            const sqlUser = await app.getUser(req.params.userId)
            if (!sqlUser) {
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
                        .status(404)
                        .end()
                } else {
                    if (req.query['size'] && !Number.isNaN(size)) {
                        res.redirect(`https://robohash.org/${encodeURIComponent(sqlUser.id)}.webp?set=set4&size=${size}x${size}`)
                    } else {
                        res.redirect(`https://robohash.org/${encodeURIComponent(sqlUser.id)}.webp?set=set4`)
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

    router.put('/api/user/avatar', app.auth.middleware, async (req, res) => {
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

    router.delete('/api/user/avatar', app.auth.middleware, async (req, res) => {
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

    router.get('/api/users/search', app.auth.middleware, async (req, res) => {
        if (!req.query['nickname']) {
            res
                .status(400)
                .json({ error: 'Parameter "nickname" is required' })
                .end()
            return
        }

        const users = await database.queryRaw(`SELECT * FROM users WHERE users.nickname = ?`, [ req.query['nickname'] ])
        res
            .status(200)
            .json(users.map(v => ({
                ...v,
                password: undefined,
            })))
            .end()
    })

}
