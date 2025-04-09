class Client {
    /** @readonly @type {string} */ #origin

    /**
     * @param {string} origin
     */
    constructor(origin) {
        this.#origin = origin ?? window.location.origin
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
                    console.log(v)
                    if (v.error) {
                        reject(v.error)
                    } else {
                        resolve()
                    }
                })
                .catch(reject)
        })
    }
}

if (module) {
    module.exports = Client
}
