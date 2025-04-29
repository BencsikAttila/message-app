(() => {
    const userPopup = document.getElement("user-popup", 'dialog')

    document.getElement('user-popup-x').addEventListener('click', () => {
        userPopup.close()
    })

    /**
     * @param {string} id
     */
    window['openUser'] = (id) => {
        API.get(`/api/users/${id}`)
            .then(user => {
                let friend = null
                API.get(`/api/friends/${id}`)
                    .then(_friend => {
                        friend = _friend
                    })
                    .finally(() => {
                        userPopup.showModal()
                        const content = document.getElement('user-popup-content')
                        content.innerHTML = Handlebars.compile(`
                            <h1 style="display: flex; align-items: center;">
                                <img src="/users/{{user.id}}/avatar.webp?size=64" width=64 height=64 class="user-avatar" style="margin-right: 16px;">
                                {{user.nickname}}
                            </h1>
                            <div>
                                <b>Id:</b> {{user.id}}
                            </div>
                            {{#if friend}}
                            <div>
                                {{#switch friend.status}}
                                    {{#case "NONE"}}
                                        <button id="add-friend">Send friend request</button>
                                    {{/case}}
                                    {{#case "IN"}}
                                        <button id="accept-friend">Accept friend request</button>
                                    {{/case}}
                                    {{#case "OUT"}}
                                        <button id="cancel-friend">Cancel friend request</button>
                                    {{/case}}
                                    {{#case "FRIEND"}}
                                        <button id="remove-friend">Remove friend</button>
                                    {{/case}}
                                {{/switch}}
                            </div>
                            {{/if}}
                        `)({ user, friend })
                        content.querySelector('#add-friend')?.addEventListener('click', () => {
                            API.post(`/api/friends/${id}`)
                                .then(() => {
                                    // @ts-ignore
                                    window.openUser(id)
                                })
                        })
                        content.querySelector('#accept-friend')?.addEventListener('click', () => {
                            API.post(`/api/friends/${id}`)
                                .then(() => {
                                    // @ts-ignore
                                    window.openUser(id)
                                })
                        })
                        content.querySelector('#cancel-friend')?.addEventListener('click', () => {
                            API.delete(`/api/friends/${id}`)
                                .then(() => {
                                    // @ts-ignore
                                    window.openUser(id)
                                })
                        })
                        content.querySelector('#remove-friend')?.addEventListener('click', () => {
                            API.delete(`/api/friends/${id}`)
                                .then(() => {
                                    // @ts-ignore
                                    window.openUser(id)
                                })
                        })
                    })
            })
    }
})()
