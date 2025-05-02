const fs = require('fs')
const path = require('path')

module.exports = class App {
    /** @readonly @type {import('./db/interface').DB} */ database
    /** @readonly @type {import('express').Application} */ express
    /** @readonly @type {import('express-ws').Instance} */ wss
    /** @readonly @type {ReturnType<import('./auth')>} */ auth
    /** @readonly @type {import('http').Server} */ server

    /**
     * @param {import('./db/interface').DB} database
     * @param {import('express').Application} express
     * @param {import('express-ws').Instance} wss
     */
    constructor(database, express, wss) {
        this.database = database
        this.express = express
        this.wss = wss
        this.auth = require('./auth')(this)
    }

    /**
     * @param {string} id
     * @returns {Promise<import('./db/model').default['channels']>}
     */
    async getChannel(id) {
        const res = await this.database.queryRaw('SELECT * FROM channels WHERE channels.id = ? LIMIT 1', id)
        if (!res.length) {
            return null
        }
        return res[0]
    }

    /**
     * @param {string} userId
     * @param {string} channelId
     */
    async checkChannelPermissions(userId, channelId) {
        const channels = await this.database.queryRaw('SELECT * FROM userChannel WHERE userChannel.channelId = ? AND userChannel.userId = ? LIMIT 1', [channelId, userId])
        if (channels.length) return true

        const bundles = await this.database.queryRaw('SELECT * FROM bundleUser JOIN bundles ON bundles.id = bundleUser.bundleId JOIN bundleChannel ON bundles.id = bundleChannel.bundleId WHERE bundleUser.userId = ? AND bundleChannel.channelId = ? LIMIT 1', [userId, channelId])
        if (bundles.length) return true

        return false
    }

    /**
     * @param {string} id
     * @returns {Promise<import('./db/model').default['bundles']>}
     */
    async getBundle(id) {
        const res = await this.database.queryRaw('SELECT * FROM bundles WHERE bundles.id = ? LIMIT 1', id)
        if (!res.length) {
            return null
        }
        return res[0]
    }

    /**
     * @param {string} id
     * @returns {Promise<import('./db/model').default['invitations']>}
     */
    async getInvitation(id) {
        const res = await this.database.queryRaw('SELECT * FROM invitations WHERE invitations.id = ? LIMIT 1', id)
        if (!res.length) {
            return null
        }
        return res[0]
    }

    /**
     * @param {string} id
     * @returns {Promise<import('./db/model').default['users']>}
     */
    async getUser(id) {
        const res = await this.database.queryRaw('SELECT * FROM users WHERE users.id = ? LIMIT 1', id)
        if (!res.length) {
            return null
        }
        return res[0]
    }

    /**
     * @param {string} id
     * @returns {Promise<{
     *   incoming: ReadonlyArray<import('./db/model').default['users'] & { verified: any }>
     *   outgoing: ReadonlyArray<import('./db/model').default['users'] & { verified: any }>
     * }>}
     */
    async getFriends(id) {
        const incoming = await this.database.queryRaw(`SELECT users.*, verified FROM friends JOIN users ON friends.user1_id = users.id AND friends.user2_id = ?`, [id])
        const outgoing = await this.database.queryRaw(`SELECT users.*, verified FROM friends JOIN users ON friends.user2_id = users.id AND friends.user1_id = ?`, [id])
        return {
            incoming,
            outgoing,
        }
    }

    /**
     * @param {string} id
     * @returns {Promise<number>}
     */
    async deleteMessage(id) {
        const attachments = await this.database.queryRaw('SELECT * FROM messageAttachments WHERE messageAttachments.messageId = ?', [id])
        for (const attachment of attachments) {
            for (const file of fs.readdirSync(path.join(this.database.localPath, 'attachments'))) {
                if (file === attachment.id || file.startsWith(attachment.id + path.extname(file))) {
                    fs.rmSync(path.join(this.database.localPath, 'attachments', file))
                }
            }
        }
        await this.database.delete('messageAttachments', 'messageAttachments.messageId = ?', [id])
        return await this.database.delete('messages', 'messages.id = ?', [id])
    }
}
