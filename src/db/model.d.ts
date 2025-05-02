type UUID = string
type BOOL = 0 | 1
type INT = number
type VARCHAR = string

type tables = {
    messages: {
        id: UUID,
        content: string,
        attachmentCount: INT,
        createdUtc: INT,
        channelId: UUID,
        senderId: UUID,
    },
    messageAttachments: {
        id: UUID,
        messageId: UUID,
    },
    channels: {
        id: UUID,
        name: VARCHAR,
        ownerId: UUID,
        friendChannel: BOOL,
    },
    users: {
        id: UUID,
        username: VARCHAR,
        nickname: VARCHAR,
        password: VARCHAR,
        lastChannelId?: UUID,
    },
    userChannel: {
        userId: UUID
        channelId: UUID
    },
    invitations: {
        id: UUID
        userId: UUID
        channelId: UUID
        expiresAt: INT
        usages: INT
    },
    bundles: {
        id: UUID
        name: VARCHAR
    },
    bundleChannel: {
        channelId: UUID
        bundleId: UUID
    },
    bundleUser: {
        userId: UUID
        bundleId: UUID
    },
    friends: {
        user1_id: UUID
        user2_id: UUID
        verified: BOOL
        channel?: UUID
    },
}

export type TableNames = keyof tables

export default tables