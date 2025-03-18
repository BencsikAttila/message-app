(() => {

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

    wsClient.addEventListener('message', (/** @type {WebSocketMessageEvent} */ e) => {
        // TODO: better message type routing,
        switch (e.message.type) {
            case 'message_created': {
                if (e.message.channel === window.ENV.channel.uuid) {
                    appendMessage(e.message)
                }
                break
            }
            default: {
                break
            }
        }
    })

    /**
    * Sends a message. This will send a websocket event to the server
    * and adds a new message element to the container.
    */
    function sendMessage() {
        const messageContent = document.getElement('chat-input', 'input').value

        fetch(`/api/channels/${window.ENV.channel.uuid}/messages`, {
            method: "POST",
            body: JSON.stringify({
                type: "send_message",
                content: messageContent
            }),
            headers: {
                "Content-type": "application/json; charset=UTF-8"
            }
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

    // TODO: Fetch the messages server-side and send the populated HTML
    // to the client
    fetch(`/api/channels/${window.ENV.channel.uuid}/messages`, { method: 'GET' })
        .then(res => res.json())
        .then(res => {
            for (const message of res) {
                appendMessage(message)
            }
        })
        .catch(console.error)
})()
