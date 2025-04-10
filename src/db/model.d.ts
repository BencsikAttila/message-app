type UUID = string

type tables = {
    messages: {
        id: UUID,
        content: number,
        createdUtc: number,
        channelId: UUID,
        senderId: UUID,
    },
    channels: {
        id: UUID,
        name: string,
        ownerId: UUID,
    },
    users: {
        id: UUID,
        username: string,
        nickname: string,
        password: string,
    },
    userChannel: {
        userId: UUID
        channelId: UUID
    },
    invitations: {
        id: UUID
        userId: UUID
        channelId: UUID
        expiresAt: number
        usages: number
    },
    bundles: {
        id: UUID
        name: string
    },
    bundleChannel: {
        channelId: UUID
        bundleId: UUID
    },
    bundleUser: {
        userId: UUID
        bundleId: UUID
    },
}

export default tables