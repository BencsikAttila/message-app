const path = require('path')
const express = require('express')
const expressHandlebars = require('express-handlebars')
const expressWs = require('express-ws')
const App = require('./app')
const DB = require('./db')
const expressApp = express()

function create() {
    {
        const res = require('dotenv').config({
            path: [
                path.join(__dirname, '.env'),
            ]
        })
        if (res.error) throw res.error
    }

    const port = 6789

    const wss = expressWs(expressApp)
    expressApp.engine('handlebars', expressHandlebars.engine({
        partialsDir: path.join(__dirname, '..', 'public', 'partials'),
        helpers: {
            'JSON': function (obj) {
                return JSON.stringify(obj)
            },
            'eq': function (arg1, arg2, options) {
                return (arg1 == arg2) ? options.fn(this) : options.inverse(this)
            },
            'switch': function (value, options) {
                this.switch_value = value
                this.switch_break = false
                return options.fn(this)
            },
            'case': function (value, options) {
                if (value == this.switch_value) {
                    this.switch_break = true
                    return options.fn(this)
                }
            },
            'default': function (options) {
                if (this.switch_break == false) {
                    return options.fn(this)
                }
            },
        },
    }))
    expressApp.set('view engine', 'handlebars')
    expressApp.set('views', path.join(__dirname, '..', 'public', 'views'))

    expressApp.use(require('cookie-parser')())
    expressApp.use(express.json())
    expressApp.use(express.urlencoded({ extended: false }))
    expressApp.use(require('connect-busboy')())

    const router = express.Router(({ mergeParams: true }))
    const app = new App(DB.createSqliteDB(false), expressApp, wss)
    require('./router/api')(router, app)
    require('./router/web')(router, app)
    require('./router/ws')(router, app)
    expressApp.use(router)

    app.server = expressApp.listen(port, '0.0.0.0', () => {
        console.log(`Listening on http://localhost:${port}`)
    })

    app.server.addListener('close', () => {
        console.log(`Closed`)
    })

    return app
}

if (require.main === module) {
    create()
}

module.exports = create
