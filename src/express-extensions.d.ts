namespace Express {
    interface Request {
        token: string
        credentials: import('jose').JWTPayload & {
            id: number
        }
    }
}
