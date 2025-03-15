const path = require('path')

{
    const res = require('dotenv').config({
        path: [
            path.join(__dirname, '.env'),
        ]
    })
    if (res.error) throw res.error
}

const express = require('express')
const port = 6789
const WebSocketManager = require('./websocket-server')
const expressHandlebars = require('express-handlebars')
require('./db') // the instance is created once in this file

const app = express()
app.engine('handlebars', expressHandlebars.engine({
    helpers: {
       'JSON': function(obj) {
            return JSON.stringify(obj)
       }
    },
}))
app.set('view engine', 'handlebars')
app.set('views', path.join(__dirname, '..', 'public', 'views'))

app.use(require('cookie-parser')())
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(require('./router/api'))
app.use(require('./router/web'))

const server = app.listen(port, () => {
    console.log(`Listening on http://localhost:${port}`)
})

new WebSocketManager(server)
