(() => {
    const searchInput = document.getElement("user-search-input", 'input')
    const searchButton = document.getElement("user-search-button", 'button')
    const usersContainer = document.getElement("user-search-users-container", 'div')

    searchButton.addEventListener('click', () => {
        usersContainer.innerHTML = ''
        API.get(`/api/users/search?nickname=${encodeURIComponent(searchInput.value)}`)
            .then(users => {
                for (const user of users) {
                    const element = document.fromHTML(Handlebars.compile(`
                        <div>
                            <span>{{nickname}}</span>
                            <button>Add friend</button>
                        </div>
                    `)(user))
                    const addFriendButton = element.querySelector('button')
                    addFriendButton.addEventListener('click', () => {
                        addFriendButton.disabled = true
                        API.post(`/api/friends/${user.id}`)
                            .finally(() => {
                                window.location.reload()
                            })
                    })
                    usersContainer.appendChild(element)
                }
            })
    })

    window.acceptFriend = (id) => {
        API.post(`/api/friends/${id}`)
            .finally(() => {
                window.location.reload()
            })
    }

    window.cancelFriend = (id) => {
        API.delete(`/api/friends/${id}`)
            .finally(() => {
                window.location.reload()
            })
    }
})()
