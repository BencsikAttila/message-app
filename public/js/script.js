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

/**
 * Appends a new message to the messages container.
 * This is async because it uses Handlebars templates and
 * maybe the template aint loaded yet so we have to wait for it.
 * @param {{
 *   content: string
 *   createdUtc: number
 * }} message
 */
async function appendMessage(message) {
    // TODO: Append/insert the messages in order

    // Fetch the template (or load from cache)
    const template = await window.templates['message']
    // Compile the template into HTML source
    const html = template({
        content: message.content,
        createdAt: new Date(message.createdUtc * 1000).toLocaleTimeString(),
    })
    // Append the HTML to the container
    const container = document.getElement('chat-messages-container', 'div')
    const newElement = document.fromHTML(html)
    container.appendChild(newElement)
    document.getElement('chat-messages-container').scrollTo(0, document.getElement('chat-messages-container').scrollHeight)
}

// TODO: reconnect if disconnected

const wsClient = new WebSocket(`ws://${window.location.host}/`)

// TODO: better websocket event type handling

/**
 * Sends an event to the websocket server.
 * I made this function so you get type suggestions for the events.
 * @param {import('../../src/websocket-events').ClientToServer} event
 */
function wsSend(event) {
    wsClient.send(JSON.stringify(event))
}

/**
 * Sends a message. This will send a websocket event to the server
 * and adds a new message element to the container.
 */
function sendMessage() {
    const messageContent = document.getElement('chat-input', 'input').value
    wsSend({
        type: 'send_message',
        content: messageContent,
    })
    document.getElement('chat-input', 'input').value = ''
}

// Handle explicit button press
document.getElement('chat-send', 'button').addEventListener('click', () => {
    sendMessage()
})

// Handle ENTER keypress
document.getElement('chat-input', 'input').addEventListener('keydown', event => {
    if (event.key === 'Enter') {
        sendMessage()
    }
})

wsClient.addEventListener('message', event => {
    // Parse the message to JSON object.
    // This will always be a valid JSON string,
    // but I wrapped it in a try-catch just in case.
    /** @type {import('../../src/websocket-events').ServerToClient} */
    let wsEvent
    try {
        wsEvent = JSON.parse(event.data)
    } catch (error) {
        console.error(error)
        return
    }

    // TODO: better message type routing,
    // maybe different functions for each type?
    switch (wsEvent.type) {
        case 'error': {
            // This is for debugging only, so you
            // don't have to switch to the server console
            switch (wsEvent.source) {
                case 'sql':
                case null: {
                    console.error(wsEvent.error)
                    break
                }
                default: {
                    console.error('Unknown error')
                    break
                }
            }
            break
        }
        case 'message_created': {
            appendMessage(wsEvent)
            break
        }
        default: {
            break
        }
    }
})

// TODO: Fetch the messages server-side and send the populated HTML
// to the client
fetch('/api/messages', { method: 'GET' })
    .then(res => res.json())
    .then(res => {
        for (const message of res) {
            appendMessage(message)
        }
    })
    .catch(console.error)

