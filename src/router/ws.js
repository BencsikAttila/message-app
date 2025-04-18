/**
 * @param {import('express-ws').Router} router
 * @param {import('../utils')} app
 */
module.exports = (router, app) => {
    /**
     * @type {Record<string, NodeJS.Timeout>}
     */
    const userOnlineTimers = {}

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

                    for (const client of app.wss.getWss().clients.values().filter(v => v.user?.id !== user.id)) {
                        client.send(JSON.stringify(/** @type {import('../websocket-messages').WebSocketMessage} */({
                            type: 'user_status',
                            id: user.id,
                            nickname: user.nickname,
                            isOnline: true,
                        })))
                    }

                    ws.addEventListener('close', e => {
                        if (userOnlineTimers[user.id]) clearTimeout(userOnlineTimers[user.id])
                        userOnlineTimers[user.id] = setTimeout(() => {
                            delete userOnlineTimers[user.id]
                            if (!app.wss.getWss().clients.values().some(v => v.user?.id === user.id)) {
                                for (const client of app.wss.getWss().clients.values().filter(v => v.user?.id !== user.id)) {
                                    client.send(JSON.stringify(/** @type {import('../websocket-messages').WebSocketMessage} */({
                                        type: 'user_status',
                                        id: user.id,
                                        isOnline: false,
                                    })))
                                }
                            }
                        }, 2000)
                    })
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
