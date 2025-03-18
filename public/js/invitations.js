(() => {

    const newChannelDialog = document.getElement("new-invitation-dialog", 'dialog')

    document.getElement('new-invitation-button', 'button').addEventListener('click', () => {
        newChannelDialog.showModal()
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
                window.location.reload()
            })
            .catch(console.error)
    })
})()
