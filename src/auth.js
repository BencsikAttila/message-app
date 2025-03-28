const { createSecretKey } = require('crypto')
const database = require('./db')

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

const secretKey = createSecretKey(process.env.JWT_SECRET, 'utf-8')
const { createHash } = require('crypto')

const auth = {
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
    // @ts-ignore
    /** @param {string} token @returns {Promise<false | (import('jose').JWTPayload & { id: number })>} */
    async verify(token) {
        if (this.tokenBlacklist.has(token)) {
            return false
        }
        try {
            const { payload } = await jwtVerify(token, secretKey, {})
            // @ts-ignore
            return payload
        } catch (e) {
            return false
        }
    },
    /**
     * @param {string} token
     */
    async logout(token) {
        this.tokenBlacklist.add(token)
    },
    /**
     * @type {import('express').Handler}
     */
    async middleware(req, res, next) {
        const token = req.header('Authorization')?.replace('Bearer ', '') ?? req.cookies?.['token']
        req.token = token
        const verifyRes = await auth.verify(token)
        if (verifyRes && (await database.queryRaw('SELECT * FROM users WHERE users.id = ?;', verifyRes.id))?.[0]) {
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
                .status(303)
                .header('Location', `/login?error=${encodeURIComponent('Invalid token' ?? '')}&redirect=${encodeURIComponent(req.url)}`)
                .end()
        }
    },
}

module.exports = auth
