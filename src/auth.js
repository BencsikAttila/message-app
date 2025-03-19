const { createSecretKey } = require('crypto')

const cryptoAlt = require('crypto').webcrypto
const cryptoKey = require('crypto').webcrypto.CryptoKey
// @ts-ignore
global.crypto = cryptoAlt
global.CryptoKey = cryptoKey

let SignJWT = null
let jwtVerify = null

import('jose/jwt/sign').then(v => SignJWT = v.SignJWT)
import('jose/jwt/verify').then(v => jwtVerify = v.jwtVerify)

const secretKey = createSecretKey(process.env.JWT_SECRET, 'utf-8')
const { createHash } = require('crypto')

const auth = {
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
            .setExpirationTime(process.env.JWT_EXPIRATION_TIME)
            .sign(secretKey)
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
            username: username,
            nickname: username,
            password: encryptedPassword,
        })

        return await auth.authenticate(database, username, password)
    },
    /**
     * @param {string} token
     * @returns {Promise<false | (import('jose').JWTPayload & { id: number })>}
     */
    async verify(token) {
        try {
            const { payload } = await jwtVerify(token, secretKey, {})
            // @ts-ignore
            return payload
        } catch (e) {
            return false
        }
    },
    /**
     * @type {import('express').Handler}
     */
    async middleware(req, res, next) {
        const token = req.header('Authorization')?.replace('Bearer ', '') ?? req.cookies?.['token']
        const verifyRes = await auth.verify(token)
        if (verifyRes) {
            req.credentials = verifyRes
            next()
            return
        }

        if (req.path.startsWith('/api')) {
            res
                .status(401)
                .json({
                    error: 'Invalid token'
                })
                .end()
        } else {
            res
                .status(401)
                .render('login', {
                    error: token ? 'Invalid token' : undefined
                })
        }
    },
}

module.exports = auth
