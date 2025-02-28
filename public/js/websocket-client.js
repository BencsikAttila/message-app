class WebSocketMessageEvent extends Event {
    /** @readonly @type {import('../../src/websocket-events').ServerToClient} */ message

    /**
     * @param {import('../../src/websocket-events').ServerToClient} message
     */
    constructor(message) {
        super('message')
        this.message = message
    }
}

class WebSocketClient extends EventTarget {
    /** @type {WebSocket} */ #websocket

    constructor() {
        super()

        this.#websocket = null

        this.connect()
    }

    /**
     * @private
     */
    connect() {
        const _self = this
        this.#websocket = new WebSocket(`ws://${window.location.host}/`)
        this.#websocket.addEventListener('close', e => {
            this.dispatchEvent(new CloseEvent(e.type, {
                bubbles: e.bubbles,
                cancelable: e.cancelable,
                code: e.code,
                composed: e.composed,
                reason: e.reason,
                wasClean: e.wasClean,
            }))
            _self.connect()
        })
        this.#websocket.addEventListener('error', e => this.dispatchEvent(new Event(e.type, {
            bubbles: e.bubbles,
            cancelable: e.cancelable,
            composed: e.composed,
        })))
        this.#websocket.addEventListener('open', e => this.dispatchEvent(new Event(e.type, {
            bubbles: e.bubbles,
            cancelable: e.cancelable,
            composed: e.composed,
        })))
        this.#websocket.addEventListener('message', e => {
            try {
                _self.dispatchEvent(new WebSocketMessageEvent(JSON.parse(e.data)))
            } catch (error) {
                console.error(error)
            }
        })
    }

    /**
     * @param {import('../../src/websocket-events').ClientToServer} event
     */
    send(event) {
        this.#websocket.send(JSON.stringify(event))
    }
}
