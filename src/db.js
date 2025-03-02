// Handles the different database providers
// Supports MySQL and Sqlite

/**
 * @typedef {{
 *   query(table: string): Promise<ReadonlyArray<any>>
 *   insert(table: string, values: Record<string, any>): Promise<void>
 * }} DB
 */

/**
 * @returns {DB}
 */
function createMysqlDB() {
    const mysql = require('mysql2')

    // TODO: reconnect if disconnected

    // TODO: handle the case if the database aint reachable (send an error page to the users)

    const db = mysql.createConnection({
        // TODO: environment variables
        host: '127.0.0.1',
        user: 'root',
        password: 'root',
        database: 'message_app',
        port: 3306,
    })

    db.connect((error) => {
        if (error) {
            console.error('Failed connection to MySQL:', error)
            return
        }
        console.log('Connected to MySQL on thread', db.threadId)
    })

    return {
        query(table) {
            return new Promise((resolve, reject) => {
                db.query(`SELECT * FROM ${table};`, (error, rows) => {
                    if (error) reject(error)
                    else resolve(rows)
                })
            })
        },
        insert(table, values) {
            return new Promise((resolve, reject) => {
                const _keys = Object.keys(values)
                const _values = _keys.map((v) => values[v])

                db.execute(`INSERT INTO ${table} (${_keys.join(', ')}) VALUES (${_values.map(() => '?').join(', ')});`, _values, (error) => {
                    if (error) reject(error)
                    else resolve()
                })
            })
        },
    }
}

/**
 * @returns {DB}
 */
function createSqliteDB() {
    const sqlite = require('sqlite3')
    const path = require('path')

    const db = new sqlite.Database(':memory:')
    // TODO: read setup sql from file
    db.serialize(() => {
        db.run(`CREATE TABLE messages (
                    id INT AUTO_INCREMENT,
                    content TEXT NOT NULL,
                    createdUtc BIGINT NOT NULL,
                    PRIMARY KEY (id)
                );`)
    })
    return {
        query(table) {
            return new Promise((resolve, reject) => {
                db.prepare(`SELECT * FROM ${table};`)
                    .all((error, rows) => {
                        if (error) reject(error)
                        else resolve(rows)
                    })
                    .finalize()
            })
        },
        insert(table, values) {
            return new Promise((resolve, reject) => {
                const _keys = Object.keys(values)
                const _values = _keys.map((v) => values[v])

                db.prepare(`INSERT INTO ${table} (${_keys.join(', ')}) VALUES (${_values.map(() => '?').join(', ')});`)
                    .run(_values, (error) => {
                        if (error) reject(error)
                        else resolve()
                    })
            })
        },
    }
}

// TODO: choose the provider based on a config file
const database = createSqliteDB()
module.exports = database
