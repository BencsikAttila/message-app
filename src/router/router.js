const express = require('express')
const path = require('path')

const database = require('../db-connection')
const dbModel = require('../db-model')
const databaseConnection = require('../db-connection')
const jsonUtils = require('../json-utils')
const wsServer = require('../websocket-server')

const router = express.Router(({ mergeParams: true }))

router.get('/api/messages', (req, res) => {
    dbModel.queryMessages(databaseConnection.connection)
        .then((result) => {
            // TODO: learn how to do this properly
            res.setHeader('Content-Type', 'application/json')
            res.statusCode = 200
            res.flushHeaders()
            res.write(JSON.stringify(result))
            res.end()
        })
        .catch((error) => {
            // TODO: same as above
            res.setHeader('Content-Type', 'application/json')
            res.statusCode = 500
            res.flushHeaders()
            res.write(JSON.stringify(error, jsonUtils.replacer))
            res.end()
        })
})

router.post('/login', (req, res) => {
    const { Username, Password, RememberMe } = req.body
    console.log(Username, Password, RememberMe)
})

router.post('/register', (req, res) => {
    const { Username, Password, PasswordAgain } = req.body
    console.log(Username, Password, PasswordAgain)
})

router.post('/api/msg_endpoint', async (req, res) => {
    const { content } = req.body
    msgToDb(content)
})

// TODO: error handling
const msgToDb = async (content) => {
    const newMessage = {
        content: content,
        createdUtc: Math.floor(new Date().getTime() / 1000)
    }

    const result = await dbModel.insertMessage(database.connection, newMessage)

    for (const client of wsServer.Singleton.clients) {
        client.send(JSON.stringify({
            type: 'message_created',
            content: newMessage.content,
            createdUtc: newMessage.createdUtc,
        }))
    }
}

// Serve static files from the "public" directory
router.use(express.static(path.join(__dirname, '..', '..', 'public')))

// Serve the Handlebars source from the node_modules
router.use(express.static(path.join(__dirname, '..', 'node_modules', 'handlebars', 'dist')))

module.exports = router
