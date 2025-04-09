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
                    console.log(v)
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
                .then(v => v.json())
                .then(v => {
                    if ('error' in v) {
                        reject(v.error)
                    } else {
                        resolve(v)
                    }
                })
        })
    }

    /**
     * @param {string} path
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
                .then(v => v.json())
                .then(v => {
                    if ('error' in v) {
                        reject(v.error)
                    } else {
                        resolve(v)
                    }
                })
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
                .then(v => v.json())
                .then(v => {
                    if ('error' in v) {
                        reject(v.error)
                    } else {
                        resolve(v)
                    }
                })
        })
    }

    /**
     * @param {string} name
     */
    async createChannel(name) {
        return await this.post(`/api/channels`, {
            name: name,
        })
    }
}

if (module) {
    module.exports = Client
}
