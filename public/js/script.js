document.getElement('button-toggle-left-side-bar', 'button')
    .addEventListener('click', () => {
        document.getElement('left-side-bar')
            .classList.toggle('side-bar-shown')
        document.getElement('right-side-bar')
            .classList.remove('side-bar-shown')
    })
document.getElement('button-toggle-right-side-bar', 'button')
    .addEventListener('click', () => {
        document.getElement('right-side-bar')
            .classList.toggle('side-bar-shown')
        document.getElement('left-side-bar')
            .classList.remove('side-bar-shown')
    })

// user data cacheing after sign in successfull
// Only for testing:
localStorage['name'] = window.prompt('name:')
localStorage['pass'] = window.prompt('pass:')

// TODO: reconnect if disconnected

const wsClient = new WebSocket(`ws://${window.location.host}/`)

document.getElement('chat-send', 'button').addEventListener('click', () => {
    // send cached data for validation
    const Msg = document.getElement('chat-input', 'input').value
    wsClient.send(`SendMsg;${localStorage['name']};${localStorage['pass']};idk;${Msg}`)
})

wsClient.onmessage = (ev) => {
    // handle incoming msg from server(eg. notify or display)
}
