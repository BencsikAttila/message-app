// https://github.com/anoek/webrtc-group-chat-example/blob/master/signaling-server.js

const uuid = require('uuid')

/**
 * @type {Record<any, any>}
 */
const channels = {}
/**
 * @type {Record<string, import('ws').WebSocket>}
 */
const sockets = {}

/**
 * @param {import('ws').WebSocket} ws
 * @param {import('./utils')} app
 */
module.exports = (ws, app) => {
    console.log('connection accepted')
    const wsId = uuid.v4()
    const wsChannels = {}
    sockets[wsId] = ws

    /**
     * @param {string} channel
     */
    const leave = async (channel) => {
        console.log('Leave')

        if (!(channel in wsChannels)) {
            console.error('Not in channel', channel)
            return
        }

        delete wsChannels[channel]
        delete channels[channel][wsId]

        for (const id in channels[channel]) {
            channels[channel][id].send(JSON.stringify({
                type: 'removePeer',
                peer_id: wsId,
            }))
            ws.send(JSON.stringify({
                type: 'removePeer',
                peer_id: id,
            }))
        }

        if (Object.keys(channels[channel]).length === 0) {
            delete channels[channel]
            for (const ws of app.ws.clients) {
                if (!ws.user) continue
                if (!(await app.checkChannelPermissions(ws.user.id, channel))) continue
                ws.send(JSON.stringify({
                    type: 'unjoined_call_ended',
                }))
            }
            console.log('Channel removed')
        }
    }

    ws.addEventListener('close', async () => {
        for (const channel in wsChannels) {
            await leave(channel)
        }
        console.log('Disconnected')
        delete sockets[wsId]
    })

    ws.addEventListener('message', async e => {
        const m = JSON.parse(e.data)
        switch (m.type) {
            case 'join': {
                console.log('join ', m)
                const channel = m.channel

                if (channel in wsChannels) {
                    console.error('Already joined to', channel)
                    return
                }

                if (!(channel in channels)) {
                    for (const ws of app.ws.clients) {
                        if (!ws.user) continue
                        if (!(await app.checkChannelPermissions(ws.user.id, channel))) continue
                        ws.send(JSON.stringify({
                            type: 'unjoined_call_started',
                        }))
                    }
                    channels[channel] = {}
                }

                for (const id in channels[channel]) {
                    channels[channel][id].send(JSON.stringify({
                        type: 'addPeer',
                        peer_id: wsId,
                        should_create_offer: false,
                    }))
                    ws.send(JSON.stringify({
                        type: 'addPeer',
                        peer_id: id,
                        should_create_offer: true,
                    }))
                }

                channels[channel][wsId] = ws
                wsChannels[channel] = channel
                break
            }
            case 'part': {
                await leave(m.channel)
                break
            }
            case 'relayICECandidate': {
                const peer_id = m.peer_id
                const ice_candidate = m.ice_candidate
                console.log(`Relaying ICE candidate to ${peer_id}`, ice_candidate)

                if (peer_id in sockets) {
                    sockets[peer_id].send(JSON.stringify({
                        type: 'iceCandidate',
                        peer_id: wsId,
                        ice_candidate: ice_candidate,
                    }))
                }
                break
            }
            case 'relaySessionDescription': {
                const config = m
                const peer_id = config.peer_id
                const session_description = config.session_description
                console.log(`Relaying session description to ${peer_id}`, session_description)

                if (peer_id in sockets) {
                    sockets[peer_id].send(JSON.stringify({
                        type: 'sessionDescription',
                        peer_id: wsId,
                        session_description: session_description,
                    }))
                }
                break
            }
        }
    })
}

module.exports['channels'] = channels
