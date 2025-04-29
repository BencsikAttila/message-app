const path = require('path')
const express = require('express')
const expressHandlebars = require('express-handlebars')
const expressWs = require('express-ws')
const expressMinify = require('express-minify')
const App = require('./utils')
const DB = require('./db/interface')
const expressApp = express()

/**
 * 
 * @param {{
 *   inMemoryDatabase?: boolean
 * }} [config] 
 */
function create(config) {
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
        helpers: require('../public/js/hbs-helpers'),
    }))
    expressApp.set('view engine', 'handlebars')
    expressApp.set('views', path.join(__dirname, '..', 'public', 'views'))

    expressApp.use(require('cookie-parser')())
    expressApp.use(express.json())
    expressApp.use(express.urlencoded({ extended: false }))
    expressApp.use(require('connect-busboy')())
    expressApp.use(expressMinify({}))

    const router = express.Router(({ mergeParams: true }))
    const app = new App(config ? DB.createSqliteDB(true) : DB.createSqliteDB(false), expressApp, wss)
    require('./router/api')(router, app)
    require('./router/web')(router, app)
    require('./router/ws')(router, app)
    expressApp.use(router)

    // @ts-ignore
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
