// Handling the side-bar buttons
document.getElement('button-toggle-left-side-bar', 'button')
    .addEventListener('click', () => {
        document.getElement('left-side-bar')
            .classList.toggle('side-bar-shown')
        document.getElement('right-side-bar')
            .classList.remove('side-bar-shown')
    })

document.getElement('button-toggle-right-side-bar', 'button')
    .addEventListener('click', () => {
        document.getElement('right-side-bar')
            .classList.toggle('side-bar-shown')
        document.getElement('left-side-bar')
            .classList.remove('side-bar-shown')
    })

const wsClient = new WebSocketClient()
wsClient.addEventListener('message', (/** @type {WebSocketMessageEvent} */ e) => {
    // TODO: better message type routing,
    switch (e.message.type) {
        case 'error': {
            switch (e.message.source) {
                case 'sql':
                case null: {
                    console.error(e.message.error)
                    break
                }
                default: {
                    console.error('Unknown error')
                    break
                }
            }
            break
        }

        default: {
            break
        }
    }
})
wsClient.addEventListener('open', (e) => {
    document.getElement('label-status', 'span').textContent = 'Connected'
})
wsClient.addEventListener('close', (e) => {
    document.getElement('label-status', 'span').textContent = 'Disconnected'
})
