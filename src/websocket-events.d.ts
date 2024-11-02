//#region Generic Events

export interface GenericEvent<T extends string> {
    type: T
}

//#endregion

//#region Server -> Client

export interface SqlErrorEvent extends GenericEvent<'error'> {
    source: 'sql'
    error: import('../src/node_modules/mysql2/index').QueryError
}

export interface ErrorEvent extends GenericEvent<'error'> {
    source: null
    error: Error
}

export interface MessageCreatedEvent extends GenericEvent<'message_created'> {
    content: string
    createdUtc: number
}

export interface SqlResultEvent extends GenericEvent<'sql_result'> {
    result: import('../src/node_modules/mysql2/index').QueryResult
}

export type ServerToClient = (
    SqlErrorEvent |
    ErrorEvent |
    SqlResultEvent |
    MessageCreatedEvent
)

//#endregion

//#region Client -> Server

export type ClientToServer = (
    SendMessageEvent
)

export interface SendMessageEvent extends GenericEvent<'send_message'> {
    content: string
}

//#endregion
