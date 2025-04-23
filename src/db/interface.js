const fs = require('fs')
const init = require('./init')

/**
 * @typedef {{
 *   query<Table extends keyof import('./model').default>(table: Table): Promise<ReadonlyArray<import('./model').default[Table]>>
 *   queryRaw(query: string, params: any): Promise<ReadonlyArray<any>>
 *   insert<Table extends keyof import('./model').default>(table: Table, values: import('./model').default[Table]): Promise<Readonly<{ changes: number; lastId: number; }>>
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

    if (!process.env.DATABASE_USERNAME) {
        throw new Error(`Environment variable DATABASE_USERNAME isn't set`)
    }

    if (!process.env.DATABASE_PASSWORD) {
        throw new Error(`Environment variable DATABASE_PASSWORD isn't set`)
    }

    if (!process.env.DATABASE_HOST) {
        throw new Error(`Environment variable DATABASE_HOST isn't set`)
    }

    const db = mysql.createConnection({
        host: process.env.DATABASE_HOST,
        port: Number(process.env.DATABASE_PORT) ?? 3306,
        user: process.env.DATABASE_USERNAME,
        password: process.env.DATABASE_PASSWORD,
    })

    db.connect((error) => {
        if (error) {
            throw error
        }
        console.log(`Connected to MySQL database ${db.config.host}:${db.config.port}`)

        if (!process.env.DATABASE_NAME) {
            throw new Error(`Environment variable DATABASE_NAME isn't set`)
        }

        ;(async () => {
            await (() => new Promise((resolve, reject) => {
                db.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DATABASE_NAME}`, (error, result, fields) => {
                    if (error) {
                        reject(error)
                        return
                    }
                    resolve()
                })
            }))()

            await (() => new Promise((resolve, reject) => {
                db.query(`USE ${process.env.DATABASE_NAME}`, (error, result, fields) => {
                    if (error) {
                        reject(error)
                        return
                    }
                    resolve()
                })
            }))()

            for (const table of init()) {
                await (() => new Promise((resolve, reject) => {
                    db.query(table.compile('mysql'), (error, result, fields) => {
                        if (error) {
                            reject(error)
                            return
                        }
                        resolve()
                    })
                }))()
            }
        })()
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
                    else resolve({
                        // @ts-ignore
                        changes: result.affectedRows,
                        // @ts-ignore
                        lastId: result.insertId,
                    })
                })
            })
        },
        delete(table, filter, params) {
            return new Promise((resolve, reject) => {
                db.execute(`DELETE FROM ${table} WHERE ${filter};`, params, (error, result, fields) => {
                    if (error) reject(error)
                    // @ts-ignore
                    else resolve(result.affectedRows)
                })
            })
        },
    }
}

/**
 * @param {boolean} [inMemory]
 * @returns {DB}
 */
function createSqliteDB(inMemory = false) {
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
    db.on('open', () => {
        console.log(`Opened SQLite database at ${inMemory ? ':memory:' : filename}`)
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
                        else resolve({
                            changes: this.changes,
                            lastId: this.lastID,
                        })
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
