/**
 * @param {import('./db').DB} connection
 * @param {import('./db/model').default['messages']} message
 */
function insertMessage(connection, message) {
    return connection.insert('messages', message)
}

/**
 * @param {import('./db').DB} connection
*/
function queryMessages(connection) {
    return connection.query('messages')
}

module.exports = {
    insertMessage,
    queryMessages,
}
