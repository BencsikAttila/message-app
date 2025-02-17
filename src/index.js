const express = require('express')
const router = require('./router/router')
const port = 6789
const websocket = require('./websocket-server')
const databaseConnection = require('./db-connection')
const dbModel = require('./db-model')

// The connection is stored in the databaseConnection.connection
// so we can use it from other files
databaseConnection.connect()

const app = express()

app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(router)

const server = app.listen(port, () => {
    console.log(`Listening on port ${port}`)
})

new websocket(server)