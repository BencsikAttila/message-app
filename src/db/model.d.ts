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
        name: string,
        ownerId: number,
    },
    users: {
        id?: number,
        username: string,
        nickname: string,
        password: string,
    },
}

export default tables