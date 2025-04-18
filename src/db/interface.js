const fs = require('fs')
const table = require('./table')
const init = require('./init')

/**
 * @typedef {{
 *   query<Table extends keyof import('./model').default>(table: Table): Promise<ReadonlyArray<import('./model').default[Table]>>
 *   queryRaw(query: string, params: any): Promise<ReadonlyArray<any>>
 *   insert<Table extends keyof import('./model').default>(table: Table, values: import('./model').default[Table]): Promise<Readonly<{ changes: number; lastID: number; }>>
 *   delete<Table extends keyof import('./model').default>(table: Table, filter: string, params: any): Promise<number>
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
 * @param {boolean} inMemory
 * @returns {DB}
 */
function createSqliteDB(inMemory) {
    const sqlite = require('sqlite3')
    const path = require('path')
    const filename = path.join(__dirname, '..', '..', 'database', 'db.sqlite')

    if (!fs.existsSync(path.dirname(filename))) {
        fs.mkdirSync(path.dirname(filename), { recursive: true })
    }

    const db = new sqlite.Database(inMemory ? ':memory:' : filename)
    db.serialize(() => {
        for (const table of init()) {
            db.run(table.compile('sqlite')).on('error', console.error)
        }
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

module.exports = {
    createSqliteDB,
    createMysqlDB,
}
