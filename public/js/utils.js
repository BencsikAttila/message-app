// See the utils.d.ts for documentation

/**
 * @template {keyof HTMLElementTagNameMap} TagName
 * @param {string} id
 * @param {TagName} [tagName]
 * @returns {HTMLElementTagNameMap[TagName]}
 */
Document.prototype.getElement = function (id, tagName) {
    const element = this.getElementById(id)
    if (!element) {
        throw new Error(`Element #${id} not found`)
    }

    if (tagName && element.tagName.toLowerCase() !== tagName.toLowerCase()) {
        throw new Error(`Element #${id} is not ${tagName}`)
    }

    // @ts-ignore
    return element
}

/**
 * @param {string} html
 */
document.fromHTML = function (html) {
    html = html.trim()
    if (!html) {
        throw new Error('Tried to add an empty element')
    }

    const container = document.createElement('div')
    container.innerHTML = html
    if (container.childElementCount !== 1) {
        throw new Error('You can append only one element as an HTML at the moment')
    }

    return /** @type {HTMLElement} */ (container.firstChild)
}

document.addEventListener('DOMContentLoaded', () => {
    for (const dialog of document.getElementsByTagName('dialog')) {
        dialog.addEventListener('click', (event) => {
            if (event.target !== dialog) return
            const r = dialog.getBoundingClientRect()
            if (event.clientX > r.left && event.clientX < r.right &&
                event.clientY > r.top && event.clientY < r.bottom) return
            dialog.close()
        })
    }
})

globalThis['API'] = {
    /**
     * @param {string} route
     * @returns {Promise<any | void>}
     */
    get(route) {
        return new Promise((resolve, reject) => {
            fetch(route)
                .then(res => {
                    if (res.headers.get('content-type').startsWith('application/json')) {
                        res.json()
                            .then(resolve)
                            .catch(reject)
                    } else {
                        resolve()
                    }
                })
                .catch(reject)
        })
    },
    /**
     * @param {string} route
     * @param {any} body
     * @returns {Promise<any | void>}
     */
    post(route, body) {
        return new Promise((resolve, reject) => {
            fetch(route, {
                body: JSON.stringify(body),
                headers: {
                    'content-type': "application/json; charset=UTF-8"
                }
            })
                .then(res => {
                    if (res.headers.get('content-type') === 'application/json') {
                        res.json()
                            .then(resolve)
                            .catch(reject)
                    } else {
                        resolve()
                    }
                })
                .catch(reject)
        })
    },
}
