const express = require('express')
const router = require('./router/router')
const port = 6789
const WebSocketManager = require('./websocket-server')
require('./db') // the instance is created once in this file

const app = express()

app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(router)

const server = app.listen(port, () => {
    console.log(`Listening on port ${port}`)
})

new WebSocketManager(server)
