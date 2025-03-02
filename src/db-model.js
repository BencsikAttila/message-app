/**
 * @param {import('./db').DB} connection
 * @param {{
 *   content: string;
 *   createdUtc: number;
 * }} message
 */
function insertMessage(connection, message) {
    return connection.insert('messages', {
        'content': message.content,
        'createdUtc': message.createdUtc,
    })
}

/**
 * @param {import('./db').DB} connection
 * @returns {Promise<ReadonlyArray<import('./db/model').messages>>}
*/
function queryMessages(connection) {
    return connection.query('messages')
}

module.exports = {
    insertMessage,
    queryMessages,
}
