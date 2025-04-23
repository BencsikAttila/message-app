(() => {
    const messagesContainer = document.getElement('chat-messages-container', 'div')

    async function appendMessage(message) {
        // TODO: Append/insert the messages in order

        const template = await window.getTemplate('message')
        const html = template({
            ...message,
            createdAt: new Date(message.createdUtc * 1000).toLocaleTimeString(),
        })
        messagesContainer.appendChild(document.fromHTML(html))
        messagesContainer.scrollTo(0, messagesContainer.scrollHeight)
    }

    wsClient.addEventListener('message', (/** @type {WebSocketMessageEvent} */ e) => {
        // TODO: better message type routing,
        switch (e.message.type) {
            case 'message_created': {
                if (e.message.channel === window.ENV.channel.id) {
                    appendMessage(e.message)
                }
                break
            }
            case 'message_deleted': {
                document.getElementById(`message-${e.message.id}`)?.remove()
                break
            }
            default: {
                break
            }
        }
    })

    function sendMessage() {
        const messageContent = document.getElement('chat-input', 'input').value

        fetch(`/api/channels/${window.ENV.channel.id}/messages`, {
            method: "POST",
            body: JSON.stringify({
                content: messageContent
            }),
            headers: {
                "Content-type": "application/json; charset=UTF-8"
            }
        })

        document.getElement('chat-input', 'input').value = ''
    }

    document.getElement('chat-send', 'button').addEventListener('click', () => {
        sendMessage()
    })

    document.getElement('chat-input', 'input').addEventListener('keydown', event => {
        if (event.key === 'Enter') {
            sendMessage()
        }
    })

    window['deleteMessage'] = (id) => {
        fetch(`/api/channels/${window.ENV.channel.id}/messages/${id}`, { method: 'DELETE' })
            .then(() => {
                
            })
            .catch(console.error)
    }

    fetch(`/api/channels/${window.ENV.channel.id}/messages`, { method: 'GET' })
        .then(res => res.json())
        .then(res => {
            messagesContainer.innerHTML = ''
            for (const message of res) {
                appendMessage(message)
            }
        })
        .catch(console.error)
})()
