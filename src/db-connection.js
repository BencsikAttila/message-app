const mysql = require('mysql2')

module.exports = function () {
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

    return connection
}
