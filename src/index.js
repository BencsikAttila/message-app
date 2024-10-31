const express = require('express')
const router = require('./router/router')
const port = 6789
const websocket = require('./websocket')
const connectToDb = require('./db-connection')
const dbModel = require('./db-model')
const bcrypt = require('bcrypt')

const app = express()
app.use(router)
const server = app.listen(port, () => {
    console.log(`Listening on port ${port}`)
})

const wsServer = websocket(server)

const db = connectToDb()

wsServer.on('connection', (ws) => {
    ws.on('error', console.error)

    ws.on('message', (msg) => {
        const MsgArr = msg.toString().split(';')

        // MsgArr[0] = action to perform(eg. send message)
        // TODO:
        // better parsing for MsgArr
        // use bcrypt to handle user passwords
        // have hashmap of open connections with usernames
        // sanitize db inputs
        switch (MsgArr[0]) {
            case 'SendMsg':
                // action, name, pass, to, content
                if (MsgArr.length !== 5) {
                    console.error('Wrong size received')
                    ws.send('SizeErr')
                    break
                }

                dbModel.queryUser(db, {
                    username: MsgArr[1],
                    password: MsgArr[2],
                })
                    .then(result => {
                        console.log('Valid SendMsg:', MsgArr[4])
                        // record to db msg table
                        // send to actives who have open connection and are in the destination channel(sql query)
                    })
                    .catch(error => {
                        // TODO: better error handling
                        if ('sql' in error) {
                            ws.send('SQL error')
                        } else if (error === 'NOT_FOUND') {
                            ws.send('Account not found')
                        } else if (error === 'WRONG_PASSWORD') {
                            ws.send('Account detail error')
                        } else {
                            ws.send('Error')
                        }
                    })
                break
            default:
                break
        }
    })
})
