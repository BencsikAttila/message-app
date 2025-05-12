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
    httpServer.addListener('close', () => console.log(`HTTP server closed`))
    httpServer.addListener('listening', () => console.log(`HTTP server listening`, httpServer.address()))
    httpServer.listen(8080, '0.0.0.0')
    const wss = expressWs(expressApp, httpServer)
    
    let httpsServer = null
    let wsss = null

    const keyPath = path.join(__dirname, "ssl-key.pem")
    const certPath = path.join(__dirname, "ssl.pem")
    if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
        httpsServer = https.createServer({
            key: fs.readFileSync(path.join(__dirname, "ssl-key.pem")),
            cert: fs.readFileSync(path.join(__dirname, "ssl.pem")),
        }, expressApp)
        httpsServer.addListener('close', () => console.log(`HTTPS server closed`))
        httpsServer.addListener('listening', () => console.log(`HTTPS server listening`, httpsServer.address()))
        httpsServer.listen(8443, '0.0.0.0')
        wsss = expressWs(expressApp, httpsServer)
    }

    const router = express.Router(({ mergeParams: true }))
    let database = null
    if (process.env.DATABASE_IN_MEMORY || config?.inMemoryDatabase) {
        database = DB.createSqliteDB(true)
    } else if (process.env.DATABASE_HOST) {
        database = DB.createMysqlDB()
    } else {
        database = DB.createSqliteDB(false)
    }
    const app = new App(database, expressApp, wss, wsss)
    require('./router/api')(router, app)
    require('./router/web')(router, app)
    require('./router/ws')(router, app)
    require('./router/push')(router, app)
    expressApp.use(router)

    // @ts-ignore
    app.close = () => {
        httpServer?.close()
        httpsServer?.close()
    }

    return app
}

if (require.main === module) {
    create()
}

module.exports = create
