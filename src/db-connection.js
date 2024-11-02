const mysql = require('mysql2')

const database = {
    /** @type {import('mysql2').Connection} */
    connection: null,
    connect() {
        // TODO: reconnect if disconnected

        // TODO: handle the case if the database aint reachable
        // (send an error page to the users)

        const connection = mysql.createConnection({
            // TODO: environment variables
            host: '127.0.0.1',
            user: 'root',
            password: 'root',
            database: 'message_app',
            port: 3306,
        })

        connection.connect((error) => {
            if (error) {
                console.error('Failed connection to MySQL:', error)
                return
            }
            console.log('Connected to MySQL on thread', connection.threadId)
        })

        this.connection = connection
    },
}

module.exports = database
