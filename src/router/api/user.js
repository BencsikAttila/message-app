const path = require('path')
const express = require('express')
const jsonUtils = require('../../json-utils')
const fs = require('fs')
const sharp = require('sharp')
const levenshtein = require('fast-levenshtein').get

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
            .status(201)
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
            res
                .status(200)
                .json({
                    ...req.user,
                    password: undefined,
                })
                .end()
        } catch (error) {
            console.error(error)
            res
                .status(500)
                .json(jsonUtils.map(error))
                .end()
        }
    })

    router.patch('/api/user', app.auth.middleware, async (req, res) => {
        try {
            if ('nickname' in req.body) {
                let newNickname = String(req.body['nickname']).trim()
                if (!newNickname) {
                    res
                        .status(400)
                        .json({
                            error: `Nickname is empty`
                        })
                        .end()
                    return
                }
                await database.queryRaw('UPDATE users SET nickname = ? WHERE users.id = ?', [newNickname, req.credentials.id])
            }

            if ('password' in req.body) {
                let newPassword = String(req.body['password']).trim()
                if (!newPassword) {
                    res
                        .status(400)
                        .json({
                            error: `Password is empty`
                        })
                        .end()
                    return
                }
                const encryptedPassword = await app.auth.encrypt(newPassword)
                await database.queryRaw('UPDATE users SET password = ? WHERE users.id = ?', [encryptedPassword, req.credentials.id])
            }

            if ('theme' in req.body) {
                await database.queryRaw('UPDATE users SET theme = ? WHERE users.id = ?', [req.body['theme'], req.credentials.id])
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

    router.get('/api/users/:userId', app.auth.middleware, async (req, res) => {
        try {
            const sqlUser = await app.getUser(req.params.userId)
            if (!sqlUser) {
                res
                    .status(404)
                    .end()
                return
            }

            res
                .status(200)
                .json(app.mapUser(sqlUser, req.credentials.id))
                .end()
        } catch (error) {
            console.error(error)
            res
                .status(500)
                .json(jsonUtils.map(error))
                .end()
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

            const filePath = path.join(database.localPath, 'avatars', `${req.params.userId}.webp`)
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
            res
                .status(500)
                .json(jsonUtils.map(error))
                .end()
        }
    })

    router.put('/api/user/avatar', app.auth.middleware, async (req, res) => {
        try {
            req.pipe(req.busboy)
            req.busboy.on('file', (fieldname, file, filename) => {
                if (!fs.existsSync(path.join(database.localPath, 'avatars'))) {
                    fs.mkdirSync(path.join(database.localPath, 'avatars'), { recursive: true })
                }
                const chunks = []
                file.on('data', chunk => chunks.push(chunk))
                file.on('end', () => {
                    const buffer = Buffer.concat(chunks)
                    sharp(buffer)
                        .resize(128, 128)
                        .toFile(path.join(database.localPath, 'avatars', `${req.user.id}.webp`), (error, info) => {
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
            res
                .status(500)
                .json(jsonUtils.map(error))
                .end()
        }
    })

    router.delete('/api/user/avatar', app.auth.middleware, async (req, res) => {
        try {
            const filepath = path.join(database.localPath, 'avatars', `${req.user.id}.webp`)
            if (fs.existsSync(filepath)) {
                fs.rmSync(filepath)
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

    router.get('/api/user/search', app.auth.middleware, async (req, res) => {
        if (!req.query['nickname']) {
            res
                .status(400)
                .json({ error: 'Parameter "nickname" is required' })
                .end()
            return
        }

        const users = (await database.query('users'))
            .filter(v => v.id !== req.credentials.id)
            .map(v => ({
                v: v,
                score: levenshtein(v.nickname, req.query['nickname'] + '')
            }))
            .sort((a, b) => a.score - b.score)
            .map(v => v.v)
            .slice(0, 20)
        res
            .status(200)
            .json(users.map(v => app.mapUser(v, req.credentials.id)))
            .end()
    })

}
