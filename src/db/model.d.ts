type tables = {
    messages: {
        id?: number,
        content: number,
        createdUtc: number,
        channelId: number,
        senderId: number,
    },
    channels: {
        id?: number,
        uuid: string,
        name: string,
        ownerId: number,
    },
    users: {
        id?: number,
        username: string,
        nickname: string,
        password: string,
    },
    userChannel: {
        userId: number
        channelId: number
    },
    invitations: {
        id?: number
        uuid: string,
        userId: number
        channelId: number
        expiresAt: number
        usages: number
    },
}

export default tables