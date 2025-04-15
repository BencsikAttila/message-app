const fs = require('fs')
const table = require('./db/table')

// Handles the different database providers
// Supports MySQL and Sqlite

/**
 * @typedef {{
 *   query<Table extends keyof import('./db/model').default>(table: Table): Promise<ReadonlyArray<import('./db/model').default[Table]>>
 *   queryRaw(query: string, params: any): Promise<ReadonlyArray<any>>
 *   insert<Table extends keyof import('./db/model').default>(table: Table, values: import('./db/model').default[Table]): Promise<Readonly<{ changes: number; lastID: number; }>>
 *   delete<Table extends keyof import('./db/model').default>(table: Table, filter: string, params: any): Promise<number>
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
        delete(table, filter, params) {
            return new Promise((resolve, reject) => {
                db.execute(`DELETE FROM ${table} WHERE ${filter};`, params, (error, result, fields) => {
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

    if (!fs.existsSync(path.join(__dirname, '..', 'database'))) {
        fs.mkdirSync(path.join(__dirname, '..', 'database'), { recursive: true })
    }

    const db = new sqlite.Database(':memory:')
    //const db = new sqlite.Database(path.join(__dirname, '..', 'database', 'db.sqlite'))
    // TODO: read setup sql from file
    db.serialize(() => {
        const users = table('users')
        users.addId()
        users.addColumn('username', 'TEXT')
        users.addColumn('nickname', 'TEXT')
        users.addColumn('password', 'VARCHAR', 64)
        users.addColumn('theme', 'INT').setNullable()
        db.run(users.compile('sqlite')).on('error', console.error)

        const channels = table('channels')
        channels.addId()
        channels.addColumn('name', 'TEXT')
        channels.addColumn('ownerId', 'UUID').referenceTo('users', 'id')
        db.run(channels.compile('sqlite')).on('error', console.error)

        const messages = table('messages')
        messages.addId()
        messages.addColumn('content', 'TEXT')
        messages.addColumn('createdUtc', 'BIGINT')
        messages.addColumn('channelId', 'UUID').referenceTo('channels', 'id')
        messages.addColumn('senderId', 'UUID').referenceTo('users', 'id')
        db.run(messages.compile('sqlite')).on('error', console.error)

        const userChannel = table('userChannel')
        userChannel.addColumn('userId', 'UUID').referenceTo('users', 'id')
        userChannel.addColumn('channelId', 'UUID').referenceTo('channels', 'id')
        db.run(userChannel.compile('sqlite')).on('error', console.error)

        const invitations = table('invitations')
        invitations.addId()
        invitations.addColumn('userId', 'UUID').referenceTo('users', 'id')
        invitations.addColumn('channelId', 'UUID').referenceTo('channels', 'id')
        invitations.addColumn('expiresAt', 'BIGINT')
        invitations.addColumn('usages', 'INT')
        db.run(invitations.compile('sqlite')).on('error', console.error)

        const bundles = table('bundles')
        bundles.addId()
        bundles.addColumn('name', 'TEXT')
        db.run(bundles.compile('sqlite')).on('error', console.error)

        const bundleChannel = table('bundleChannel')
        bundleChannel.addColumn('channelId', 'UUID').referenceTo('channels', 'id')
        bundleChannel.addColumn('bundleId', 'UUID').referenceTo('bundles', 'id')
        db.run(bundleChannel.compile('sqlite')).on('error', console.error)

        const bundleUser = table('bundleUser')
        bundleUser.addColumn('userId', 'UUID').referenceTo('users', 'id')
        bundleUser.addColumn('bundleId', 'UUID').referenceTo('bundles', 'id')
        db.run(bundleUser.compile('sqlite')).on('error', console.error)
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
        insert(table, params) {
            return new Promise((resolve, reject) => {
                const _keys = Object.keys(params)
                const _values = _keys.map((v) => params[v])

                db.prepare(`INSERT INTO ${table} (${_keys.join(', ')}) VALUES (${_values.map(() => '?').join(', ')});`)
                    .run(_values, function(error) {
                        if (error) reject(error)
                        else resolve(this)
                    })
            })
        },
        delete(table, filter, params) {
            return new Promise((resolve, reject) => {
                db.prepare(`DELETE FROM ${table} WHERE ${filter};`)
                    .run(params, function(error) {
                        if (error) reject(error)
                        else resolve(this.changes)
                    })
            })
        },
    }
}

// TODO: choose the provider based on a config file
const database = createSqliteDB()
module.exports = database
