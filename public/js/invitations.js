(() => {
    const newChannelDialog = document.getElement("new-invitation-dialog", 'dialog')

    function refreshInvitations() {
        fetch(`/api/invitations?channel=${encodeURIComponent(window.ENV.channel.uuid)}`)
            .then(v => v.json())
            .then(async (/** @type {ReadonlyArray<import('../../src/db/model').default['invitations']>} */ v) => {
                const container = document.getElement('invitations-container', 'div')
                container.innerHTML = ''
                for (const invitation of v) {
                    container.appendChild(document.fromHTML((await window.getTemplate('invitation-item'))({
                        ...invitation,
                        expiresAt: new Date(invitation.expiresAt * 1000).toLocaleTimeString(),
                    })))
                }
            })
    }

    document.getElement('new-invitation-button', 'button').addEventListener('click', () => {
        newChannelDialog.showModal()
        refreshInvitations()
    })

    document.getElement('new-invitation-button-x', 'button').addEventListener('click', () => {
        newChannelDialog.close()
    })

    document.getElement('new-invitation-button-create', 'button').addEventListener('click', () => {
        fetch('/api/invitations', {
            method: 'POST',
            body: JSON.stringify({
                channelId: window.ENV.channel.uuid,
            }),
            headers: {
                "Content-type": "application/json; charset=UTF-8"
            }
        })
            .then(() => {
                refreshInvitations()
            })
            .catch(console.error)
    })

    window['deleteInvitation'] = function(uuid) {
        fetch(`/api/invitations/${uuid}`, {
            method: 'DELETE'
        })
            .then(() => {
                refreshInvitations()
            })
            .catch(console.error)
    }
})()
