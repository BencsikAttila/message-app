namespace Express {
    interface Request {
        credentials: import('jose').JWTPayload & {
            id: number;
        }
    }
}
