const mysql = require('mysql2')

// TODO: maybe return the results and errors in JSON
// so we can send it back to the client directly

/**
 * @param {mysql.Connection} connection
 * @param {{
 *   username: string;
 *   password: string;
 * }} query
 */
function queryUser(connection, query) {
    return new Promise((resolve, reject) => {
        connection.query(`SELECT account.AccountPassword FROM account WHERE account.AccountName = "${query.username}";`, (error, results, fields) => {
            if (error) {
                reject(error)
                return
            }

            if (!results[0]) {
                reject('NOT_FOUND')
                return
            }

            if (results[0].AccountPassword !== query.password) {
                reject('WRONG_PASSWORD')
                return
            }

            resolve(true)
        })
    })
}

module.exports = {
    queryUser,
}
