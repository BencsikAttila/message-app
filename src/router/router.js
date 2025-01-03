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

// Serve static files from the "public" directory
router.use(express.static(path.join(__dirname, '..', '..', 'public')))

// Serve the Handlebars source from the node_modules
router.use(express.static(path.join(__dirname, '..', 'node_modules', 'handlebars', 'dist')))

module.exports = router
