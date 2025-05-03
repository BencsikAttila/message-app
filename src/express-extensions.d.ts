namespace Express {
    interface Request {
        token: string
        credentials: import('jose').JWTPayload & {
            id: string
        }
        user: import('./db/model').default['users']
    }
}

type ManagedWebSocket = import('ws').WebSocket & {
    user: import('./db/model').default['users']
}
