(() => {
    const newChannelDialog = document.getElement("new-channel-dialog", 'dialog')
    const channelsContainer = document.getElement('channels-container', 'div')
    const channelsHeader = document.getElement('channels-header', 'h1')

    document.getElement('new-channel-button', 'button').addEventListener('click', () => {
        newChannelDialog.showModal()
    })

    document.getElement('new-channel-button-x', 'button').addEventListener('click', () => {
        newChannelDialog.close()
    })

    document.getElement('new-channel-button-create', 'button').addEventListener('click', () => {
        API.post('/api/channels', {
            name: document.getElement('new-channel-button-name-input', 'input').value,
        })
            .then(() => {
                window.location.reload()
            })
            .catch(console.error)
    })

    function refreshList() {
        API.get('/api/channels')
            .then(async v => {
                channelsContainer.innerHTML = ''
                channelsHeader.style.display = v.length ? null : 'none'
                for (const channel of v) {
                    const template = await window.getTemplate('channel')
                    const html = template({
                        ...channel,
                        isSelected: channel.id === window.ENV.channel?.id,
                    })
                    channelsContainer.appendChild(document.fromHTML(html))
                }
            })
            .catch(console.error)
    }

    // refreshList()

    if (window.ENV.channel?.id) {
        const membersContainer = document.getElement('users-container', 'div')
        API.get(`/api/channels/${window.ENV.channel?.id}/users`)
            .then(async v => {
                membersContainer.innerHTML = ''
                for (const user of v) {
                    const template = await window.getTemplate('user-item')
                    const html = template({
                        ...user,
                    })
                    membersContainer.appendChild(document.fromHTML(html))
                }
            })
    }

    wsClient.addEventListener('message', (/** @type {WebSocketMessageEvent} */ e) => {
        switch (e.message.type) {
            case 'user_status': {
                const element = document.getElementById(`user-${e.message.id}`)
                if (!element) break
                const statusElement = element.getElementsByClassName('user-status').item(0)
                if (!statusElement) break
                if (e.message.isOnline) {
                    statusElement.classList.add('user-status-online')
                    statusElement.classList.remove('user-status-offline')
                } else {
                    statusElement.classList.remove('user-status-online')
                    statusElement.classList.add('user-status-offline')
                }
                break
            }
        }
    })

    window['leaveChannel'] = function () {
        API.post(`/api/channels/${window.ENV.channel?.id}/leave`)
            .then(() => {
                window.location.replace(`${window.location.origin}/`)
            })
            .catch(console.error)
    }
})()
