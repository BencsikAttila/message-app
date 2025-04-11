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
        const themeInput = document.getElement('account-theme-input', 'select')

        const tasks = []

        tasks.push(fetch(`/api/user`, {
            method: 'PATCH',
            body: JSON.stringify({
                nickname: nicknameInput.value,
                theme: themeInput.value,
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

    window.invalidateToken = function (token) {
        fetch(`/api/loggedin/${encodeURIComponent(token)}`, {
            method: 'DELETE'
        })
            .finally(() => {
                window.location.reload()
            })
    }

    fetch('/api/loggedin')
        .then(v => v.json())
        .then(v => {
            for (const i of v) {
                document.getElement('loggedin-container').appendChild(document.fromHTML(Handlebars.compile(`
                    <div>
                        <span>Logged in at {{payload.iat}}</span>
                        <button onclick="window.invalidateToken('{{token}}')">Invalidate</button>
                    </div>
                `)(i)))
            }
        })
})()