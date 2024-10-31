const { WebSocketServer, errorMonitor } = require('ws')

/**
 * @param {import('http').Server<typeof import('http').IncomingMessage, typeof import('http').ServerResponse>} server
 * @returns {import('ws').WebSocket.Server<typeof import('ws').WebSocket, typeof import('http').IncomingMessage>}
 */
module.exports = function (server) {
    const wsServer = new WebSocketServer({ noServer: true })

    server.on('upgrade', (req, socket, head) => {
        wsServer.handleUpgrade(req, socket, head, (webSocket) => {
            wsServer.emit('connection', webSocket, req)
        })
    })

    return wsServer
}
