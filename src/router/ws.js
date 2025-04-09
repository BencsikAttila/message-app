const express = require('express')
const database = require('../db')
const auth = require('../auth')
const router = express.Router(({ mergeParams: true }))

router.ws('/', async (ws, req, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '') ?? req.cookies?.['token']
    // @ts-ignore
    ws.token = token
    const verifyRes = await auth.verify(token)
    if (verifyRes) {
        const user = (await database.queryRaw('SELECT * FROM users WHERE users.id = ? LIMIT 1;', verifyRes.id))?.[0]
        if (user) {
            // @ts-ignore
            ws.credentials = verifyRes
            // @ts-ignore
            ws.user = user
            next()
            return
        }
    }

    ws.close(3000, 'Invalid token')
})

module.exports = router
