const mysql = require('mysql2')

/**
 * Sends an `INSERT INTO` command to the database.
 * The values and the table name are escaped.
 * @param {mysql.Connection} connection
 * @param {string} table
 * @param {Record<string, number | string>} values
 * @returns {Promise<{
 *   results: mysql.QueryResult
 *   fields: Array<mysql.FieldPacket>
 * }>}
 */
function insert(connection, table, values) {
    return new Promise((resolve, reject) => {
        table = connection.escapeId(table)

        // Construct the field name list and the values in one for-loop.
        const fieldNames = Object.keys(values)
        let fieldsBuilder = ''
        let valuesBuilder = ''
        for (const fieldName of fieldNames) {
            if (valuesBuilder) { valuesBuilder += ',' }
            if (fieldsBuilder) { fieldsBuilder += ',' }

            fieldsBuilder += fieldName

            let value = values[fieldName]
            value = connection.escape(value)
            valuesBuilder += value
        }

        connection.query(`INSERT INTO ${table} (${fieldsBuilder}) VALUES (${valuesBuilder});`, (error, results, fields) => {
            if (error) {
                reject(error)
                return
            }

            resolve({ results, fields })
        })
    })
}

/**
 * Inserts a new message to the `messages` table.
 * @param {mysql.Connection} connection
 * @param {{
 *   content: string;
 *   createdUtc: number;
 * }} message
 */
async function insertMessage(connection, message) {
    return await insert(connection, 'messages', {
        'content': message.content,
        'createdUtc': message.createdUtc,
    })
}

/**
 * Queries all the messages from the `messages` table.
 * @param {mysql.Connection} connection
 * @returns {Promise<Array<import('./db/model').messages>>}
*/
function queryMessages(connection) {
    return new Promise((resolve, reject) => {
        connection.query('SELECT * FROM messages;', (error, results, fields) => {
            if (error) {
                reject(error)
                return
            }

            // @ts-ignore
            resolve(results)
        })
    })
}

module.exports = {
    insertMessage,
    queryMessages,
}
