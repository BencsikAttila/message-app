/**
 * @param {Client} client
 * @param {import('../../src/db/model').default['channels']} data
 */
function channel(client, data) {
    return {
        ...data,
        /**
         * @param {string} content
         */
        async send(content) {
            /** @type {import('../../src/db/model').default['messages']} */
            const res = await client.post(`/api/channels/${this.id}/messages`, {
                content: content,
            })
            return message(client, res)
        },
        async leave() {
            await client.post(`/api/channels/${this.id}/leave`)
        },
        async createInvitation() {
            /** @type {import('../../src/db/model').default['invitations']} */
            const res = await client.post(`/api/invitations`, {
                for: this.id,
            })
            return invitation(client, res)
        },
    }
}

/**
 * @param {Client} client
 * @param {import('../../src/db/model').default['invitations']} data
 */
function invitation(client, data) {
    return {
        ...data,
        async delete() {
            await client.delete(`/api/invitations/${this.id}`)
        },
    }
}

/**
 * @param {Client} client
 * @param {import('../../src/db/model').default['messages']} data
 */
function message(client, data) {
    return {
        ...data,
        async delete() {
            await client.delete(`/api/channels/${this.channelId}/messages/${this.id}`)
        },
    }
}

/**
 * @param {Client} client
 * @param {import('../../src/db/model').default['bundles']} data
 */
function bundle(client, data) {
    return {
        ...data,
        /**
         * @param {string} id
         */
        async addChannel(id) {
            await client.post(`/api/bundles/${this.id}/channels`, {
                id: id,
            })
        },
        /**
         * @param {string} id
         */
        async removeChannel(id) {
            await client.delete(`/api/bundles/${this.id}/channels/${id}`)
        },
        async leave() {
            await client.post(`/api/bundles/${this.id}/leave`)
        },
    }
}

class Client {
    /** @readonly @type {string} */ #origin
    /** @type {string | null} */ #token

    /**
     * @param {string} origin
     */
    constructor(origin) {
        this.#origin = origin ?? window.location.origin
        this.#token = null
    }

    /**
     * @param {string} username
     * @param {string} password
     */
    register(username, password) {
        return new Promise((resolve, reject) => {
            fetch(`${this.#origin}/api/register`, {
                method: 'POST',
                body: JSON.stringify({ username, password }),
                headers: {
                    'Content-type': 'application/json; charset=UTF-8'
                },
            })
                .then(v => v.json())
                .then(v => {
                    if (v.error) {
                        reject(v.error)
                    } else {
                        this.#token = v.token
                        resolve()
                    }
                })
                .catch(reject)
        })
    }

    /**
     * @param {string} username
     * @param {string} password
     */
    login(username, password) {
        return new Promise((resolve, reject) => {
            fetch(`${this.#origin}/api/login`, {
                method: 'POST',
                body: JSON.stringify({ username, password }),
                headers: {
                    'Content-type': 'application/json; charset=UTF-8'
                },
            })
                .then(v => v.json())
                .then(v => {
                    if (v.error) {
                        reject(v.error)
                    } else {
                        this.#token = v.token
                        resolve()
                    }
                })
                .catch(reject)
        })
    }

    async logout() {
        await this.post(`/api/logout`)
        this.#token = null
    }

    /**
     * @param {'GET' | 'POST' | 'DELETE'} method
     * @param {string} path
     * @param {object} [body=null]
     * @private
     */
    fetch(method, path, body = null) {
        return new Promise((resolve, reject) => {
            fetch(`${this.#origin}${path}`, {
                method: method,
                body: body ? JSON.stringify(body) : undefined,
                headers: {
                    ...(body ? {
                        'Content-type': 'application/json; charset=UTF-8',
                    } : {

                    }),
                    'Authorization': this.#token,
                },
            })
                .then(v => {
                    if (v.status >= 200 && v.status < 300) {
                        if (v.headers.get('content-type')?.startsWith('application/json')) {
                            v.json()
                                .then(resolve)
                                .catch(reject)
                        } else {
                            resolve(null)
                        }
                    } else {
                        v.json()
                            .then(v => {
                                if ('error' in v) {
                                    reject(v.error)
                                } else {
                                    resolve(new Error('Failed'))
                                }
                            })
                    }
                })
                .catch(reject)
        })
    }

    /**
     * @param {string} path
     */
    get(path) {
        return this.fetch('GET', path)
    }

    /**
     * @param {string} path
     * @param {object} body
     */
    post(path, body) {
        return this.fetch('POST', path, body)
    }

    /**
     * @param {string} path
     */
    delete(path) {
        return this.fetch('DELETE', path)
    }

    /**
     * @param {string} invitationId
     */
    async useInvitation(invitationId) {
        await this.get(`/api/invitations/${invitationId}/use`)
    }

    /**
     * @param {string} id
     */
    async getChannel(id) {
        /** @type {import('../../src/db/model').default['channels']} */
        const res = await this.get(`/api/channels/${id}`)

        return channel(this, res)
    }

    /**
     * @param {string} id
     */
    async getBundle(id) {
        /** @type {import('../../src/db/model').default['bundles']} */
        const res = await this.get(`/api/bundles/${id}`)

        return bundle(this, res)
    }

    /**
     * @param {string} name
     */
    async createChannel(name) {
        /** @type {import('../../src/db/model').default['channels']} */
        const res = await this.post(`/api/channels`, {
            name: name,
        })

        return channel(this, res)
    }

    /**
     * @param {string} name
     * @param {ReadonlyArray<string>} channels
     */
    async createBundle(name, channels) {
        /** @type {import('../../src/db/model').default['bundles']} */
        const res = await this.post(`/api/bundles`, {
            name: name,
            channels: channels,
        })

        return bundle(this, res)
    }
}

if (module) {
    module.exports = Client
}
