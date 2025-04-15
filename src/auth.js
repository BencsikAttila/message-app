const { createSecretKey, randomUUID } = require('crypto')

const cryptoAlt = require('crypto').webcrypto
const cryptoKey = require('crypto').webcrypto.CryptoKey
// @ts-ignore
global.crypto = cryptoAlt
global.CryptoKey = cryptoKey

// @ts-ignore
/** @type {import('jose/jwt/sign')['SignJWT']} */
let SignJWT = null
// @ts-ignore
/** @type {import('jose/jwt/verify')['jwtVerify']} */
let jwtVerify = null

import('jose/jwt/sign').then(v => SignJWT = v.SignJWT)
import('jose/jwt/verify').then(v => jwtVerify = v.jwtVerify)
const { createHash } = require('crypto')

/**
 * @param {import('./app')} app
 */
module.exports = (app) => {
    const secretKey = createSecretKey(process.env.JWT_SECRET, 'utf-8')

    const auth = {
        /**
         * @private @readonly
         * @type {Set<string>}
         */
        tokens: new Set(),
        /**
         * @private @readonly
         * @type {Set<string>}
         */
        tokenBlacklist: new Set(),
        /**
         * @param {import('./db').DB} database
         * @param {string} username
         * @param {string} password
         */
        async authenticate(database, username, password) {
            const user = (await database.queryRaw(`SELECT * FROM users WHERE users.username = ?`, username))[0]

            if (!user) {
                return {
                    error: 'Invalid credentials',
                }
            }

            const encryptedPassword = createHash('sha256').update(password).digest('base64')

            if (user.password !== encryptedPassword) {
                return {
                    error: 'Invalid credentials',
                }
            }

            const token = await new SignJWT({ id: user.id })
                .setProtectedHeader({ alg: 'HS256' })
                .setIssuedAt()
                .setExpirationTime('1d')
                .sign(secretKey)
            auth.tokens.add(token)
            return {
                token: token,
            }
        },
        /**
         * @param {import('./db').DB} database
         * @param {string} username
         * @param {string} password
         */
        async create(database, username, password) {
            const user = (await database.queryRaw(`SELECT * FROM users WHERE users.username = ?`, username))[0]
            if (user) {
                return {
                    error: 'User already exists'
                }
            }

            const encryptedPassword = createHash('sha256').update(password).digest('base64')
            await database.insert('users', {
                id: require('uuid').v4(),
                username: username,
                nickname: username,
                password: encryptedPassword,
            })

            return await auth.authenticate(database, username, password)
        },
        // @ts-ignore
        /** @param {string} token @returns {Promise<false | (import('jose').JWTPayload & { id: string })>} */
        async verify(token) {
            if (auth.tokenBlacklist.has(token)) {
                return false
            }

            try {
                const { payload } = await jwtVerify(token, secretKey, {})
                auth.tokens.add(token)
                // @ts-ignore
                return payload
            } catch (e) {
                console.error(e)
                return false
            }
        },
        /**
         * @param {string} token
         */
        async logout(token) {
            auth.tokenBlacklist.add(token)
        },
        /**
         * @type {import('express').Handler}
         */
        async middleware(req, res, next) {
            const token = req.header('Authorization')?.replace('Bearer ', '') ?? req.cookies?.['token']
            req.token = token

            let error = 'Invalid token'

            if (token) {
                const verifyRes = await auth.verify(token)
                if (verifyRes) {
                    const user = (await app.database.queryRaw('SELECT * FROM users WHERE users.id = ?;', verifyRes.id))?.[0]
                    if (user) {
                        req.credentials = verifyRes
                        req.user = user
                        next()
                        return
                    } else {
                        error = 'User not found'
                    }
                } else {
                    error = 'Invalid token'
                }
            } else {
                error = null
            }

            if (req.path.startsWith('/api')) {
                res
                    .status(401)
                    .json({
                        error: error
                    })
                    .end()
            } else {
                res
                    .status(303)
                    .header('Location', `/login?error=${encodeURIComponent(error ?? '')}&redirect=${encodeURIComponent(req.url)}`)
                    .end()
            }
        },
    }
    return auth
}
