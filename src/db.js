// Handles the different database providers
// Supports MySQL and Sqlite

/**
 * @typedef {{
 *   query<Table extends keyof import('./db/model').default>(table: Table): Promise<ReadonlyArray<import('./db/model').default[Table]>>
 *   queryRaw(query: string, params: any): Promise<ReadonlyArray<any>>
 *   insert<Table extends keyof import('./db/model').default>(table: Table, values: import('./db/model').default[Table]): Promise<Readonly<{ changes: number; lastID: number; }>>
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
                    // @ts-ignore
                    else resolve(rows)
                })
            })
        },
        queryRaw(query, params) {
            return new Promise((resolve, reject) => {
                db.query(query, params, (error, rows) => {
                    if (error) reject(error)
                    // @ts-ignore
                    else resolve(rows)
                })
            })
        },
        insert(table, values) {
            return new Promise((resolve, reject) => {
                const _keys = Object.keys(values)
                const _values = _keys.map((v) => values[v])

                db.execute(`INSERT INTO ${table} (${_keys.join(', ')}) VALUES (${_values.map(() => '?').join(', ')});`, _values, (error, result, fields) => {
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

    const db = new sqlite.Database(path.join(__dirname, 'db.sqlite'))
    // TODO: read setup sql from file
    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    content TEXT NOT NULL,
                    createdUtc BIGINT NOT NULL,
                    channelId INTEGER NOT NULL,
                    senderId INTEGER NOT NULL
                );`)
            .on('error', console.error)
        db.run(`CREATE TABLE IF NOT EXISTS channels (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    uuid VARCHAR(36) NOT NULL,
                    name TEXT NOT NULL,
                    ownerId INTEGER NOT NULL
                );`)
            .on('error', console.error)
        db.run(`CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT NOT NULL,
                    nickname TEXT NOT NULL,
                    password VARCHAR(64) NOT NULL
                );`)
            .on('error', console.error)
        db.run(`CREATE TABLE IF NOT EXISTS userChannel (
                    userId INT,
                    channelId INT
                );`)                
            .on('error', console.error)
        db.run(`CREATE TABLE IF NOT EXISTS invitations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    uuid VARCHAR(36) NOT NULL,
                    userId INT NOT NULL,
                    channelId INT NOT NULL,
                    expiresAt BIGINT NOT NULL,
                    usages INT NOT NULL
                );`)
            .on('error', console.error)
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
        queryRaw(query, params) {
            return new Promise((resolve, reject) => {
                db.prepare(query)
                    .all(params, (error, rows) => {
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
                    .run(_values, function(error) {
                        if (error) reject(error)
                        else resolve(this)
                    })
            })
        },
    }
}

// TODO: choose the provider based on a config file
const database = createSqliteDB()
module.exports = database
