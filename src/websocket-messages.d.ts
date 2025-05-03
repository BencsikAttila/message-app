import { WebSocketServer } from 'ws'

export interface GenericEvent<T extends string> {
    type: T
}

export interface MessageCreatedEvent extends GenericEvent<'message_created'> {
    id: string
    content: string
    createdUtc: number
    channel: string
    user: {
        nickname: string
    }
}

export interface MessageDeletedEvent extends GenericEvent<'message_deleted'> {
    id: string
}

export interface UserStatusEvent extends GenericEvent<'user_status'> {
    id: string
    isOnline: boolean
}

export type WebSocketMessage = (
    MessageCreatedEvent |
    MessageDeletedEvent |
    UserStatusEvent
)
