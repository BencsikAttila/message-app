const path = require('path')
const express = require('express')
const expressHandlebars = require('express-handlebars')
const expressWs = require('express-ws')
const expressMinify = require('express-minify')
const App = require('./utils')
const DB = require('./db/interface')
const http = require('http')
const https = require('https')
const fs = require('fs')

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

    const httpServer = http.createServer(expressApp)
    const httpsServer = https.createServer({
        key: fs.readFileSync(path.join(__dirname, "ssl-key.pem")),
        cert: fs.readFileSync(path.join(__dirname, "ssl.pem")),
    }, expressApp)

    const wss = expressWs(expressApp, httpServer)
    const wsss = expressWs(expressApp, httpsServer)

    const router = express.Router(({ mergeParams: true }))
    const app = new App(config ? DB.createSqliteDB(true) : DB.createSqliteDB(false), expressApp, wss, wsss)
    require('./router/api')(router, app)
    require('./router/web')(router, app)
    require('./router/ws')(router, app)
    require('./router/push')(router, app)
    expressApp.use(router)

    httpServer.addListener('close', () => console.log(`HTTP server closed`))
    httpsServer.addListener('close', () => console.log(`HTTPS server closed`))

    httpServer.addListener('listening', () => console.log(`HTTP server listening`, httpServer.address()))
    httpsServer.addListener('listening', () => console.log(`HTTPS server listening`, httpsServer.address()))

    // @ts-ignore
    app.close = () => {
        httpServer.close()
        httpsServer.close()
    }

    httpServer.listen(8080, '0.0.0.0')
    httpsServer.listen(8443, '0.0.0.0')

    return app
}

if (require.main === module) {
    create()
}

module.exports = create
