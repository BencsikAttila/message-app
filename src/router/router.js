const database = require('../db-connection')

const express = require('express')
const path = require('path')
const dbModel = require('../db-model')
const databaseConnection = require('../db-connection')

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
            res.write(JSON.stringify(error))
            res.end()
        })
})

router.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', 'public', 'login', 'login.html'))
})

router.post('/login', (req, res) => {
    const { Username, Password, RememberMe } = req.body;
    console.log(Username, Password, RememberMe);
})

router.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', 'public', 'register', 'register.html'))
})

router.post('/register', (req, res) => {
    const { Username, Password, PasswordAgain } = req.body;
    console.log(Username, Password, PasswordAgain);
})

router.post('/api/msg_endpoint', async (req, res) => {
    const { type, content } = req.body
    
    switch (type) {
        case "send_message":
            msgToDb(content);
            
            break;
    
        default:
            break;
    }
})

// TODO: error handling
const msgToDb = async (content) => {
    const newMsg = {
        content: content,
        createdUtc: new Date().getTime()
    }

    const result = await dbModel.insertMessage(database.connection, newMsg)
}

// Serve static files from the "public" directory
router.use(express.static(path.join(__dirname, '..', '..', 'public')))

// Serve the Handlebars source from the node_modules
router.use(express.static(path.join(__dirname, '..', 'node_modules', 'handlebars', 'dist')))

module.exports = router
