(() => {
    const messagesContainer = document.getElement('chat-messages-container', 'div')
    const attachmentsContainer = document.getElement('chat-input-attachments-container', 'div')
    const inputAttachment = document.getElement('chat-input-attachment', 'input')

    /**
     * @type {Array<File>}
     */
    const attachments = []

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
        refreshMessageAttachments()
    }

    wsClient.addEventListener('message', (/** @type {WebSocketMessageEvent} */ e) => {
        const m = e.message
        switch (m.type) {
            case 'message_created': {
                if (m.channel === window.ENV.channel.id) {
                    appendMessage(m)
                }

                if (m.channel !== window.ENV.channel.id || !document.hasFocus()) {
                    const notification = new Notification(m.user.nickname, {
                        body: m.content,
                        icon: `/users/${m.user.id}/avatar.webp?size=128`,
                    })

                    if (m.channel !== window.ENV.channel.id) {
                        notification?.addEventListener('click', () => {
                            window.focus()
                            window.location.replace(`/channels/${m.channel}`)
                        })
                    }
                }
                break
            }
            case 'message_deleted': {
                document.getElementById(`message-${m.id}`)?.remove()
                break
            }
            default: {
                break
            }
        }
    })

    wsClient.addEventListener('open', () => {
        API.get(`/api/channels/${window.ENV.channel.id}/messages`)
            .then(res => {
                for (const message of res) {
                    appendMessage(message)
                }
            })
            .catch(console.error)
    })

    function sendMessage() {
        const messageContent = document.getElement('chat-input', 'input').value
        if (!messageContent.trim()) return

        const currentAttachments = [...attachments]
        attachments.splice(0, attachments.length)
        inputAttachment.value = ''
        refreshAttachments()

        API.post(`/api/channels/${window.ENV.channel.id}/messages`, {
            content: messageContent,
            attachmentCount: currentAttachments.length,
        })
            .then((/** @type {import('../../src/db/model').default['messages']} */ message) => {
                for (let i = 0; i < currentAttachments.length; i++) {
                    const index = i
                    const file = currentAttachments[i]
                    const formData = new FormData()
                    formData.append('f', file)
                    API.fetch(`/api/channels/${window.ENV.channel.id}/messages/${message.id}/attachments`, {
                        method: 'PUT',
                        body: formData,
                    })
                        .then(res => {
                            res.json().then(res => {
                                message['attachments'][index] = res.id
                                appendMessage(message)
                            })
                        })
                }
            })

        document.getElement('chat-input', 'input').value = ''
    }

    function refreshAttachments() {
        attachmentsContainer.innerHTML = ''
        for (const attachment of attachments) {
            let html = null
            if (attachment.type.startsWith('image')) {
                html = `
                    <div>
                        <span>${attachment.name}</span>
                        <img>
                        <button>Remove</button>
                    </div>
                `
            } else {
                html = `
                    <div>
                        <span>${attachment.name}</span>
                        <button>Remove</button>
                    </div>
                `
            }
            const element = attachmentsContainer.appendChild(document.fromHTML(Handlebars.compile(html)()))
            element.querySelector('button').addEventListener('click', () => {
                attachments.splice(attachments.indexOf(attachment), 1)
                refreshAttachments()
            })
            if (attachment.type.startsWith('image')) {
                attachment.arrayBuffer()
                    .then(buffer => {
                        let binary = ''
                        const bytes = new Uint8Array(buffer)
                        for (let i = 0; i < bytes.byteLength; i++) {
                            binary += String.fromCharCode(bytes[i])
                        }
                        element.querySelector('img').src = `data:${attachment.type};base64,${btoa(binary)}`
                    })
            }
        }
    }

    document.getElement('chat-add-attachment', 'button').addEventListener('click', () => inputAttachment.click())

    function refreshMessageAttachments() {
        const messageElements = document.getElementsByClassName('message')
        for (const messageElement of messageElements) {
            const messageId = messageElement.id.replace('message-', '')
            const attachmentElements = messageElement.getElementsByClassName('message-attachment')
            for (const attachmentElement of attachmentElements) {
                const attachmentId = attachmentElement.id.replace('attachment-', '')
                if (attachmentElement.innerHTML.trim()) continue
                if (!attachmentId) continue
                attachmentElement.innerHTML = `
                    Loading ...
                `
                fetch(`/api/channels/${window.ENV.channel.id}/messages/${messageId}/attachments/${attachmentId}`, {
                    method: 'HEAD'
                })
                    .then(res => {
                        const contentType = res.headers.get('content-type')
                        if (contentType?.startsWith('image/')) {
                            attachmentElement.innerHTML = `
                                <img defer src="/api/channels/${window.ENV.channel.id}/messages/${messageId}/attachments/${attachmentId}">
                            `
                        } else if (contentType?.startsWith('video/')) {
                            attachmentElement.innerHTML = `
                                <video defer src="/api/channels/${window.ENV.channel.id}/messages/${messageId}/attachments/${attachmentId}" />
                            `
                        } else {
                            console.log(`Unknown attachment type ${contentType}`)
                            attachmentElement.innerHTML = `
                                <a href="/api/channels/${window.ENV.channel.id}/messages/${messageId}/attachments/${attachmentId}" target="_blank">Download</a>
                            `
                        }
                    })
            }
        }
    }

    refreshAttachments()
    refreshMessageAttachments()

    inputAttachment.addEventListener('change', e => {
        for (const file of inputAttachment.files) {
            attachments.push(file)
        }
        refreshAttachments()
        inputAttachment.value = ''
    })

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

    messagesContainer.scrollTo(0, messagesContainer.scrollHeight)
})()
