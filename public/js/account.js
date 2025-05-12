(() => {
    document.getElement('delete-avatar-button', 'button').addEventListener('click', () => {
        API.delete(`/api/user/avatar`)
            .then(() => {
                window.location.reload()
            })
    })

    document.getElement('update-nickname-button', 'button').addEventListener('click', async () => {
        const nicknameInput = document.getElement('account-nickname-input', 'input')
        const avatarInput = document.getElement('account-avatar-input', 'input')
        const passwordInput = document.getElement('account-password-input', 'input')
        const passwordAgainInput = document.getElement('account-password-input-again', 'input')
        const themeInput = document.getElement('account-theme-input', 'select')
        const errorText = document.getElement('error-text', 'div')
        errorText.textContent = ''

        if (!passwordAgainInput.reportValidity()) return

        try {
            await API.fetch(`/api/user`, {
                method: 'PATCH',
                body: JSON.stringify({
                    nickname: nicknameInput.value,
                    password: passwordInput.value ? passwordInput.value : undefined,
                    theme: themeInput.value,
                }),
                headers: {
                    "Content-type": "application/json; charset=UTF-8"
                },
            })
        } catch (error) {
            if (error instanceof Error && error.name === 'APIError') {
                errorText.textContent = `Failed to update the settings: ${error.message}`
            } else {
                errorText.textContent = `Failed to update the settings`
            }
            return
        }

        if (avatarInput.files[0]) {
            try {
                const data = new FormData()
                data.append('file', avatarInput.files[0], avatarInput.files[0].name)
                await API.fetch('/api/user/avatar', {
                    method: 'PUT',
                    body: data,
                })
            } catch (error) {
                if (error instanceof Error && error.name === 'APIError') {
                    errorText.textContent = `Failed to upload the avatar: ${error.message}`
                } else {
                    errorText.textContent = `Failed to upload the avatar`
                }
                return
            }
        }

        window.location.reload()
    })

    window['invalidateToken'] = function (token) {
        API.delete(`/api/loggedin/${encodeURIComponent(token)}`)
            .then(() => {
                window.location.reload()
            })
    }

    // API.get('/api/loggedin')
    //     .then(v => {
    //         for (const i of v) {
    //             document.getElement('loggedin-container').appendChild(document.fromHTML(Handlebars.compile(`
    //                 <div>
    //                     <span>Logged in at {{payload.iat}}</span>
    //                     <button onclick="window.invalidateToken('{{token}}')">Invalidate</button>
    //                 </div>
    //             `)(i)))
    //         }
    //     })
})()