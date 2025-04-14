const path = require('path')
const express = require('express')
const database = require('./db')
const databaseConnection = require('./db')
const jsonUtils = require('./json-utils')
const auth = require('./auth')
const uuid = require('uuid')
const fs = require('fs')
const sharp = require('sharp')

class App {
    /**
     * @param {string} id
     * @returns {Promise<import('./db/model').default['channels']>}
     */
    async getChannel(id) {
        const res = await database.queryRaw('SELECT * FROM channels WHERE channels.id = ? LIMIT 1', id)
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
        const channels = await database.queryRaw('SELECT * FROM userChannel WHERE userChannel.channelId = ? AND userChannel.userId = ? LIMIT 1', [ channelId, userId ])
        if (channels.length) return true

        const bundles = await database.queryRaw('SELECT * FROM bundleUser JOIN bundles ON bundles.id = bundleUser.bundleId JOIN bundleChannel ON bundles.id = bundleChannel.bundleId WHERE bundleUser.userId = ? AND bundleChannel.channelId = ? LIMIT 1', [ userId, channelId ])
        if (bundles.length) return true

        return false
    }

    /**
     * @param {string} id
     * @returns {Promise<import('./db/model').default['bundles']>}
     */
    async getBundle(id) {
        const res = await database.queryRaw('SELECT * FROM bundles WHERE bundles.id = ? LIMIT 1', id)
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
        const res = await database.queryRaw('SELECT * FROM invitations WHERE invitations.id = ? LIMIT 1', id)
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
        const res = await database.queryRaw('SELECT * FROM users WHERE users.id = ? LIMIT 1', id)
        if (!res.length) {
            return null
        }
        return res[0]
    }
}

const app = new App()
module.exports = app
