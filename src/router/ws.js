/**
 * @param {import('express-ws').Router} router
 * @param {import('../utils')} app
 */
module.exports = (router, app) => {
    router.ws('/', async (ws, req, next) => {
        const token = req.header('Authorization')?.replace('Bearer ', '') ?? req.cookies?.['token']
        // @ts-ignore
        ws.token = token

        let error = 'Invalid token'

        if (token) {
            const verifyRes = await app.auth.verify(token)
            if (verifyRes) {
                const user = await app.getUser(verifyRes.id)
                if (user) {
                    // @ts-ignore
                    ws.credentials = verifyRes
                    // @ts-ignore
                    ws.user = user
                    next()
                    return
                } else {
                    error = 'User not found'
                }
            } else {
                error = 'Invalid token'
            }
        } else {
            error = 'No token provided'
        }

        ws.close(3000, error)
    })
    
}
