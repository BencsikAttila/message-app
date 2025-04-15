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
     * @param {string} path
     */
    get(path) {
        return new Promise((resolve, reject) => {
            fetch(`${this.#origin}${path}`, {
                method: 'GET',
                headers: {
                    'Authorization': this.#token,
                },
            })
                .then(v => {
                    console.log(v.headers.get('content-type'))
                    return v.json()
                })
                .then(v => {
                    if ('error' in v) {
                        reject(v.error)
                    } else {
                        resolve(v)
                    }
                })
                .catch(reject)
        })
    }

    /**
     * @param {string} path
     * @param {any} body
     */
    post(path, body) {
        return new Promise((resolve, reject) => {
            fetch(`${this.#origin}${path}`, {
                method: 'POST',
                body: JSON.stringify(body),
                headers: {
                    'Content-type': 'application/json; charset=UTF-8',
                    'Authorization': this.#token,
                },
            })
                .then(v => {
                    if (v.status >= 200 && v.status < 300) {
                        resolve()
                    } else {
                        console.log(v.headers.get('content-type'))
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
    delete(path) {
        return new Promise((resolve, reject) => {
            fetch(`${this.#origin}${path}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': this.#token,
                },
            })
                .then(v => {
                    console.log(v.headers.get('content-type'))
                    return v.json()
                })
                .then(v => {
                    if ('error' in v) {
                        reject(v.error)
                    } else {
                        resolve(v)
                    }
                })
                .catch(reject)
        })
    }

    /**
     * @param {string} name
     */
    async createChannel(name) {
        await this.post(`/api/channels`, {
            name: name,
        })
    }
}

if (module) {
    module.exports = Client
}
