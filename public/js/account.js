(() => {
    document.getElement('delete-avatar-button', 'button').addEventListener('click', () => {
        fetch(`/api/user/avatar`, {
            method: 'DELETE',
        })
            .then(() => {
                window.location.reload()
            })
    })

    document.getElement('update-nickname-button', 'button').addEventListener('click', () => {
        const nicknameInput = document.getElement('account-nickname-input', 'input')
        const avatarInput = document.getElement('account-avatar-input', 'input')

        const tasks = []

        tasks.push(fetch(`/api/user`, {
            method: 'PATCH',
            body: JSON.stringify({
                nickname: nicknameInput.value,
            }),
            headers: {
                "Content-type": "application/json; charset=UTF-8"
            },
        }))

        if (avatarInput.files[0]) {
            const data = new FormData()
            data.append('file', avatarInput.files[0], avatarInput.files[0].name)
            tasks.push(fetch('/api/user/avatar', {
                method: 'PUT',
                body: data,
            }))
        }

        Promise.all(tasks)
            .then(() => {
                window.location.reload()
            })
    })
})()