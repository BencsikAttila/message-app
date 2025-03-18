import { WebSocketServer } from 'ws'

export interface GenericEvent<T extends string> {
    type: T
}

export interface SqlErrorEvent extends GenericEvent<'error'> {
    source: 'sql'
    error: import('mysql2').QueryError
}

export interface ErrorEvent extends GenericEvent<'error'> {
    source: null
    error: Error
}

export interface MessageCreatedEvent extends GenericEvent<'message_created'> {
    content: number
    createdUtc: number
    channel: string
}

export interface SqlResultEvent extends GenericEvent<'sql_result'> {
    result: import('mysql2').QueryResult
}

export type WebSocketMessage = (
    SqlErrorEvent |
    ErrorEvent |
    SqlResultEvent |
    MessageCreatedEvent
)
