const table = require('./table')

/**
 * @returns {ReadonlyArray<import('./table').Table>}
 */
module.exports = () => {
    const users = table('users')
    users.addId()
    users.addColumn('username', 'TEXT')
    users.addColumn('nickname', 'TEXT')
    users.addColumn('password', 'VARCHAR', 64)
    users.addColumn('theme', 'INT').setNullable()

    const channels = table('channels')
    channels.addId()
    channels.addColumn('name', 'TEXT')
    channels.addColumn('ownerId', 'UUID').referenceTo('users', 'id')

    const messages = table('messages')
    messages.addId()
    messages.addColumn('content', 'TEXT')
    messages.addColumn('createdUtc', 'BIGINT')
    messages.addColumn('channelId', 'UUID').referenceTo('channels', 'id')
    messages.addColumn('senderId', 'UUID').referenceTo('users', 'id')

    const userChannel = table('userChannel')
    userChannel.addColumn('userId', 'UUID').referenceTo('users', 'id')
    userChannel.addColumn('channelId', 'UUID').referenceTo('channels', 'id')

    const invitations = table('invitations')
    invitations.addId()
    invitations.addColumn('userId', 'UUID').referenceTo('users', 'id')
    invitations.addColumn('channelId', 'UUID').referenceTo('channels', 'id')
    invitations.addColumn('expiresAt', 'BIGINT')
    invitations.addColumn('usages', 'INT')

    const bundles = table('bundles')
    bundles.addId()
    bundles.addColumn('name', 'TEXT')

    const bundleChannel = table('bundleChannel')
    bundleChannel.addColumn('channelId', 'UUID').referenceTo('channels', 'id')
    bundleChannel.addColumn('bundleId', 'UUID').referenceTo('bundles', 'id')

    const bundleUser = table('bundleUser')
    bundleUser.addColumn('userId', 'UUID').referenceTo('users', 'id')
    bundleUser.addColumn('bundleId', 'UUID').referenceTo('bundles', 'id')

    return [
        users,
        channels,
        messages,
        userChannel,
        invitations,
        bundles,
        bundleChannel,
        bundleUser,
    ]
}
