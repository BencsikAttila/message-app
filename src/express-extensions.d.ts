namespace Express {
    interface Request {
        token: string
        credentials: import('jose').JWTPayload & {
            id: string
        }
        user: import('./db/model').default['users']
    }
}

namespace expressWs {
    interface Instance {
        getWss2(): number
    }
}
