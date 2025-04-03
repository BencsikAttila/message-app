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
const expressHandlebars = require('express-handlebars')
const expressWs = require('express-ws')

require('./db') // the instance is created once in this file

const app = express()
global['wsInstance'] = expressWs(app)
app.engine('handlebars', expressHandlebars.engine({
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
app.set('view engine', 'handlebars')
app.set('views', path.join(__dirname, '..', 'public', 'views'))

app.use(require('cookie-parser')())
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(require('connect-busboy')())
app.use(require('./router/api'))
app.use(require('./router/web'))
app.use(require('./router/ws'))

global['server'] = app.listen(port, () => {
    console.log(`Listening on http://localhost:${port}`)
})
