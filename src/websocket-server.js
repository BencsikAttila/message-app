const ws = require('ws')

module.exports = class _ {
    /** @type {ws.WebSocketServer} */
    static Singleton = null;

    /**
     * @param {import('http').Server<typeof import('http').IncomingMessage, typeof import('http').ServerResponse>} server
     */
    constructor(server) {
        if (_.Singleton) {
            throw new Error('Please do not do this')
        }

        const wsServer = new ws.WebSocketServer({ noServer: true })

        server.on('upgrade', (req, socket, head) => {
            wsServer.handleUpgrade(req, socket, head, (webSocket) => {
                wsServer.emit('connection', webSocket, req)
            })
        })

        wsServer.on('connection', (ws) => {
            ws.on('error', console.error)
        
            /**
             * Sends an event to the specified client.
             * I made this function so we can use the vscode auto completion for
             * the event types.
             * @param {import('ws').WebSocket} client
             * @param {import('./websocket-events').ServerToClient} message
             */
            const send = function (client, message) {
                client.send(JSON.stringify(message))
            }
        
            ws.on('message', (raw, isBinary) => {
                // Idk what it is???
                if (isBinary) { return }
        
                // This can be anything since the user can
                // open the devtools and send anything
                /** @type {import('./websocket-events').ClientToServer} */
                let message
        
                try {
                    message = JSON.parse(raw.toString('utf8'))
                } catch (error) {
                    return
                }
            })
        })
        
        _.Singleton = wsServer
    }
}
