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
        id: string
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

// Client bound

export interface RTCAddPeer extends GenericEvent<'addPeer'> {
    peer_id: string
    should_create_offer: bool
    user: {
        id: string
        nickname: string
    }
}

export interface RTCSessionDescription extends GenericEvent<'sessionDescription'> {
    peer_id: string
    session_description: RTCSessionDescriptionInit
}

export interface RTCICECandidate extends GenericEvent<'iceCandidate'> {
    peer_id: string
    ice_candidate: RTCIceCandidateInit
}

export interface RTCRemovePeere extends GenericEvent<'removePeer'> {
    peer_id: string
}

// Server bound

export interface RTCJoin extends GenericEvent<'join'> {
    channel: string
}

export interface RTCLeave extends GenericEvent<'part'> {
    channel: string
}

export interface RTCRelayICECandidate extends GenericEvent<'relayICECandidate'> {
    peer_id: string
    ice_candidate: any
}

export interface RTCRelaySessionDescription extends GenericEvent<'relaySessionDescription'> {
    peer_id: string
    session_description: any
    
}

export type WebSocketMessage = (
    MessageCreatedEvent |
    MessageDeletedEvent |
    UserStatusEvent |
    RTCAddPeer |
    RTCSessionDescription |
    RTCICECandidate |
    RTCRemovePeere |
    RTCJoin |
    RTCLeave |
    RTCRelayICECandidate |
    RTCRelaySessionDescription
)
