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
    const template = await window.getTemplate('message')
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

        case 'message_created': {
            appendMessage(e.message)
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

/**
 * Sends a message. This will send a websocket event to the server
 * and adds a new message element to the container.
 */
function sendMessage() {
    const messageContent = document.getElement('chat-input', 'input').value

    fetch("/api/messages", {
        method: "POST",
        body: JSON.stringify({
            type: "send_message",
            content: messageContent
        }),
        headers: {
            "Content-type": "application/json; charset=UTF-8"
        }
    });

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
