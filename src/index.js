const express = require('express')
const router = require('./router/router')
const port = 6789
const {WebSocketServer, errorMonitor} = require('ws')
const mysql = require('mysql2')
const bcrypt = require('bcrypt')

const app = express()
const WSServer = new WebSocketServer({ port: 8080 })
const db = mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: 'root',
    database: 'message_app',
    port: 3306
})

app.use(router)

app.listen(port, () => {
    console.log(`Listening on port ${port}`)
})

db.connect((err) => {
    if (err) {
        console.error("Failed connection to MySQL:", err.stack)
        return;
    }
    console.log("Connected to MySQL:", db.threadId)
})

WSServer.on('connection', (ws) => { 
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
            case "SendMsg":
                // action, name, pass, to, content
                if (MsgArr.length != 5) {
                    console.error("Wrong size received")
                    ws.send("SizeErr")
                    break;
                }

                db.query(`SELECT account.AccountPassword FROM account WHERE account.AccountName = "${MsgArr[1]}";`, (err, results, fields) => {
                    if (err) {
                        console.error('Failed query:', err.stack)
                        return;
                    }
                    if (results[0].AccountPassword != MsgArr[2]) {
                        ws.send('Account detail error')
                        console.error('Password mismatch')
                        return;
                    }
                    console.log("Valid SendMsg:", MsgArr[4])
                    // record to db msg table
                    // send to actives who have open connection and are in the destination channel(sql query)
                })
                break;
        
            default:
                break;
        }
    })
})