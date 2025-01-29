const express = require('express')
const router = require('./router/router')
const port = 6789
const websocket = require('./websocket')
const databaseConnection = require('./db-connection')
const dbModel = require('./db-model')

// The connection is stored in the databaseConnection.connection
// so we can use it from other files
databaseConnection.connect()

const app = express()

app.use(express.json())
app.use(router)

const server = app.listen(port, () => {
    console.log(`Listening on port ${port}`)
})

const wsServer = websocket(server)

wsServer.on('connection', (ws) => {
    ws.on('error', console.error)

    /**
     * Sends an event to the specified client.
     * I made this function so we can use the vscode auto completion for
     * the event types.
     * @param {import('ws').WebSocket} client
     * @param {import('./websocket-events').ServerToClient} message
     */
    const send = function (client, message) {
        client.send(JSON.stringify(message))
    }

    ws.on('message', (raw, isBinary) => {
        // Idk what it is???
        if (isBinary) { return }

        // This can be anything since the user can
        // open the devtools and send anything
        /** @type {import('./websocket-events').ClientToServer} */
        let message

        try {
            message = JSON.parse(raw.toString('utf8'))
        } catch (error) {
            return
        }

        if (message.type === 'send_message') {
            const newMessage = {
                content: message.content,
                // The 'new Date().getTime()' returns milliseconds
                // but the SQL int type can't store a number that big.
                createdUtc: Math.floor(new Date().getTime() / 1000),
            }
            dbModel.insertMessage(databaseConnection.connection, newMessage)
                .then((result) => {
                    // For debugging only we send back the sql result.
                    send(ws, {
                        type: 'sql_result',
                        result: result.results,
                    })
                    for (const client of wsServer.clients) {
                        send(client, {
                            type: 'message_created',
                            content: newMessage.content,
                            createdUtc: newMessage.createdUtc,
                        })
                    }
                })
                .catch((error) => {
                    // TODO: better error handling
                    if ('sql' in error) {
                        send(ws, {
                            type: 'error',
                            source: 'sql',
                            error: error,
                        })
                    } else {
                        send(ws, {
                            type: 'error',
                            source: null,
                            error: error,
                        })
                    }
                })
        }
    })
})
