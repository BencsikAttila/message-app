(() => {
    document.getElement('update-nickname-button', 'button').addEventListener('click', () => {
        fetch(`/api/user`, {
            method: 'PATCH',
            body: JSON.stringify({
                nickname: document.getElement('account-nickname-input', 'input').value
            }),
            headers: {
                "Content-type": "application/json; charset=UTF-8"
            },
        })
            .then(() => {
                window.location.reload()
            })
    })
})()