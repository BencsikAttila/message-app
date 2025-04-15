(() => {
    const dialog = document.getElement("new-invitation-dialog", 'dialog')
    const invitationsContainer = document.getElement('invitations-container', 'div')
    let currentForId = null

    function refreshInvitations() {
        if (!currentForId) { throw new Error(`currentForId is null`) }
        fetch(`/api/invitations?for=${encodeURIComponent(currentForId)}`)
            .then(v => v.json())
            .then(async (/** @type {ReadonlyArray<import('../../src/db/model').default['invitations']>} */ v) => {
                invitationsContainer.innerHTML = ''
                for (const invitation of v) {
                    invitationsContainer.appendChild(document.fromHTML((await window.getTemplate('invitation-item'))({
                        ...invitation,
                        expiresAt: new Date(invitation.expiresAt * 1000).toLocaleTimeString(),
                    })))
                }
            })
    }

    /**
     * @param {string} invitationId
     */
    window['deleteInvitation'] = function(invitationId) {
        fetch(`/api/invitations/${invitationId}`, {
            method: 'DELETE'
        })
            .then(() => {
                refreshInvitations()
            })
            .catch(console.error)
    }

    /**
     * @param {string} forId
     */
    window['showInvitationsModal'] = function(forId) {
        dialog.showModal()
        invitationsContainer.innerHTML = ''
        currentForId = forId
        refreshInvitations()
    }

    document.getElement('new-channel-invitation-button', 'button').addEventListener('click', () => {
        dialog.showModal()
        currentForId = window.ENV.channel.id
        refreshInvitations()
    })

    document.getElement('new-invitation-button-x', 'button').addEventListener('click', () => {
        dialog.close()
        currentForId = null
    })

    document.getElement('new-invitation-button-create', 'button').addEventListener('click', () => {
        if (!currentForId) { throw new Error(`currentForId is null`) }
        fetch('/api/invitations', {
            method: 'POST',
            body: JSON.stringify({
                for: currentForId,
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
})()
