(() => {
    const messagesContainer = document.getElement('chat-messages-container', 'div')

    async function appendMessage(message) {
        // TODO: Append/insert the messages in order

        const template = await window.getTemplate('message')
        const html = template({
            ...message,
            createdAt: new Date(message.createdUtc * 1000).toLocaleTimeString(),
        })
        const existing = document.getElementById(`message-${message.id}`)
        if (existing) {
            existing.outerHTML = html
        } else {
            messagesContainer.appendChild(document.fromHTML(html))
            messagesContainer.scrollTo(0, messagesContainer.scrollHeight)
        }
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

        API.post(`/api/channels/${window.ENV.channel.id}/messages`, {
            content: messageContent
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
        API.delete(`/api/channels/${window.ENV.channel.id}/messages/${id}`)
            .then(() => {

            })
            .catch(console.error)
    }

    // API.get(`/api/channels/${window.ENV.channel.id}/messages`)
    //     .then(res => {
    //         messagesContainer.innerHTML = ''
    //         for (const message of res) {
    //             appendMessage(message)
    //         }
    //     })
    //     .catch(console.error)
})()
