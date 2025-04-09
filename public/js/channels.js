(() => {
    if (false)
    {
        const regex = /[a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12}/
        const uuid = regex.exec(location.pathname)?.[0]
        // @ts-ignore
        window.ENV ??= {}
        fetch(`/api/channels/${uuid}`)
            .then(v => v.json())
            .then(v => window.ENV.channel = v)
    }

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
        fetch('/api/channels', {
            method: 'POST',
            body: JSON.stringify({
                name: document.getElement('new-channel-button-name-input', 'input').value,
            }),
            headers: {
                "Content-type": "application/json; charset=UTF-8"
            }
        })
            .then(() => {
                window.location.reload()
            })
            .catch(console.error)
    })

    function refreshList() {
        fetch('/api/channels', { method: 'GET' })
            .then(res => res.json())
            .then(async v => {
                channelsContainer.innerHTML = ''
                channelsHeader.style.display = v.length ? null : 'none'
                for (const channel of v) {
                    const template = await window.getTemplate('channel')
                    const html = template({
                        ...channel,
                        isSelected: channel.uuid === window.ENV.channel?.uuid,
                    })
                    channelsContainer.appendChild(document.fromHTML(html))
                }
            })
            .catch(console.error)
    }

    refreshList()

    if (window.ENV.channel?.uuid) {
        fetch(`/api/channels/${window.ENV.channel?.uuid}/users`)
            .then(v => v.json())
            .then(async v => {
                for (const user of v) {
                    const template = await window.getTemplate('user-item')
                    const html = template({
                        ...user,
                    })
                    document.getElement('users-container', 'div').appendChild(document.fromHTML(html))
                }
            })
    }

    window['leaveChannel'] = function() {
        fetch(`/api/channels/${window.ENV.channel?.uuid}/leave`, { method: 'POST' })
            .then(v => {
                window.location.replace(`${window.location.origin}/`)
            })
            .catch(console.error)
    }
})()
