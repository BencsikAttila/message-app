// https://github.com/anoek/webrtc-group-chat-example/blob/master/client.html

(() => {
    const callPeersContainer = document.getElement('call-peers-container', 'div')

    const currentChannel = window.ENV.channel?.id ?? 'global'

    /** https://gist.github.com/zziuni/3741933 **/
    const ICE_SERVERS = [
        { urls: 'stun:stun.l.google.com:19302' }
    ]

    /** @type {boolean} */
    let isInCall = false
    /** @type {MediaStream | null} */
    let localMediaStream = null
    /** @type {Record<string, { rtc: RTCPeerConnection; user: { nickname: string; id: string; } }>} */
    let peers = {}

    /**
     * @param {string} id
     * @param {MediaStream} stream
     * @param {any} user
     */
    function createMediaElement(id, stream, user) {
        const element = document.fromHTML(Handlebars.compile(`
            <div class="call-peer" id="call-peer-{{id}}">
                <div class="call-peer-details-wrapper">
                    <div class="call-peer-details">
                        <span>{{user.nickname}}</span>
                    </div>
                </div>
                {{#if video}}
                <video autoplay {{#if local}}muted=true{{/if}}></video>
                {{else}}
                <div class="peer-nomedia" style="background-image: url(/users/{{user.id}}/avatar.webp)">
                    <audio autoplay {{#if local}}muted=true{{/if}}></audio>
                </div>
                {{/if}}
                <div class="call-peer-controls-wrapper">
                    <div class="call-peer-controls">
                        {{#if local}}
                        {{else}}
                        <button class="call-peer-mute-button"></button>
                        {{/if}}
                    </div>
                </div>
            </div>
        `)({
            id: id,
            local: id === 'local',
            video: !!stream.getVideoTracks()[0],
            user: user,
        }))
        callPeersContainer.append(element)
        /** @type {HTMLVideoElement | HTMLAudioElement} */
        const media = element.querySelector('video') ?? element.querySelector('audio')
        const buteButton = element.querySelector('button.call-peer-mute-button')
        const refreshMuteIcon = () => {
            if (buteButton) buteButton.innerHTML = `<i class="fa ${media.muted ? 'fa-microphone-slash' : 'fa-microphone'}"></i>`
        }
        buteButton?.addEventListener('click', () => {
            media.muted = !media.muted
            refreshMuteIcon()
        })
        refreshMuteIcon()
        media.srcObject = stream
        return media
    }

    /**
     * @param {{ video: boolean; audio: boolean; }} param0 
     */
    function setupLocalMedia({ video, audio }) {
        return new Promise((resolve, reject) => {
            if (localMediaStream != null) {
                resolve()
                return
            }

            // @ts-ignore
            navigator.getUserMedia = (navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia)

            navigator.mediaDevices.getUserMedia({ video: video, audio: audio })
                .then((stream) => {
                    console.log('Access granted to audio/video', stream.id)
                    localMediaStream = stream
                    createMediaElement('local', stream, window.ENV.user)
                    resolve()
                })
                .catch(error => {
                    console.error(error)
                    if (video) {
                        alert('You have to give microphone and camera access for video call to work.')
                    } else {
                        alert('You have to give microphone access for audio call to work.')
                    }
                    reject(error)
                })
        })
    }

    function cleanup() {
        callPeersContainer.innerHTML = ''

        for (const peer_id in peers) {
            peers[peer_id].rtc.close()
        }

        for (const track of localMediaStream.getTracks()) {
            track.stop()
        }

        document.getElement('call-container').style.display = 'none'

        peers = {}
        localMediaStream = null
        isInCall = false
    }

    /**
     * @param {{ video: boolean; audio: boolean; }} options 
     */
    window['startCall'] = async (options) => {
        await setupLocalMedia(options)

        document.getElement('call-container').style.display = ''
        document.getElement('unjoined-call-container').style.display = 'none'

        wsClient.send({
            type: 'join',
            channel: currentChannel,
        })

        isInCall = true

        wsClient.addEventListener('close', (/** @type {CloseEvent} */ e) => {
            console.log('Disconnected from signaling server', e.code, e.reason)
            cleanup()
        })

        wsClient.addEventListener('message', (/** @type {WebSocketMessageEvent} */ e) => {
            const m = e.message
            switch (m.type) {
                /** 
                * When we join a group, our signaling server will send out 'addPeer' events to each pair
                * of users in the group (creating a fully-connected graph of users, ie if there are 6 people
                * in the channel you will connect directly to the other 5, so there will be a total of 15 
                * connections in the network). 
                */
                case 'addPeer': {
                    isInCall = true

                    console.log(`[RTC ${m.user.nickname}] Peer joined`, m)
                    if (m.peer_id in peers) {
                        /* This could happen if the user joins multiple channels where the other peer is also in. */
                        console.log(`[RTC ${m.user.nickname}] Peer already joined`)
                        return
                    }

                    const peerConnection = new RTCPeerConnection({
                        iceServers: ICE_SERVERS
                    })
                    peers[m.peer_id] = {
                        rtc: peerConnection,
                        user: m.user,
                    }

                    peerConnection.addEventListener('icecandidate', e => {
                        if (!e.candidate) return

                        wsClient.send({
                            type: 'relayICECandidate',
                            peer_id: m.peer_id,
                            ice_candidate: {
                                sdpMLineIndex: e.candidate.sdpMLineIndex,
                                candidate: e.candidate.candidate
                            }
                        })
                    })

                    peerConnection.addEventListener('track', e => {
                        console.log(`[RTC ${m.user.nickname}] Received new ${e.track.kind} track`, e.track)
                        if (document.getElementById(`call-peer-${m.peer_id}`)) {
                            console.warn(`[RTC ${m.user.nickname}] Multiple tracks received`)
                            return
                        }

                        createMediaElement(m.peer_id, e.streams[0], m.user)
                    })

                    localMediaStream
                        .getTracks()
                        .forEach((track) => {
                            console.log(`[RTC ${m.user.nickname}] Adding ${track.kind} track`)
                            peerConnection.addTrack(track, localMediaStream)
                        })

                    if (m.should_create_offer) {
                        console.log(`[RTC ${m.user.nickname}] Creating RTC offer ...`)
                        peerConnection.createOffer()
                            .then(localDescription => {
                                console.log(`[RTC ${m.user.nickname}] Local offer description is`, localDescription)
                                peerConnection.setLocalDescription(localDescription)
                                    .then(() => {
                                        wsClient.send({
                                            type: 'relaySessionDescription',
                                            peer_id: m.peer_id,
                                            session_description: localDescription
                                        })
                                        console.log(`[RTC ${m.user.nickname}] The local description set, realying ...`)
                                    })
                                    .catch(error => {
                                        console.error(`[RTC ${m.user.nickname}] Failed to set the local description`, error)
                                    })
                            })
                            .catch(error => {
                                console.error(`[RTC ${m.user.nickname}] Failed to send offer`, error)
                            })
                    }
                    break
                }

                /** 
                 * Peers exchange session descriptions which contains information
                 * about their audio / video settings and that sort of stuff. First
                 * the 'offerer' sends a description to the 'answerer' (with type
                 * 'offer'), then the answerer sends one back (with type 'answer').  
                 */
                case 'sessionDescription': {
                    isInCall = true

                    const desc = new RTCSessionDescription(m.session_description)
                    console.log(`[RTC ${peers[m.peer_id].user.nickname}] Session description is`, desc, m)
                    peers[m.peer_id].rtc.setRemoteDescription(desc)
                        .then(() => {
                            console.log(`[RTC ${peers[m.peer_id].user.nickname}] The remote description set`)
                            if (m.session_description.type == 'offer') {
                                console.log(`[RTC ${peers[m.peer_id].user.nickname}] Creating answer`)
                                peers[m.peer_id].rtc.createAnswer()
                                    .then(localDescription => {
                                        console.log(`[RTC ${peers[m.peer_id].user.nickname}] Answer description is`, localDescription)
                                        peers[m.peer_id].rtc.setLocalDescription(localDescription)
                                            .then(() => {
                                                wsClient.send({
                                                    type: 'relaySessionDescription',
                                                    peer_id: m.peer_id,
                                                    session_description: localDescription
                                                })
                                                console.log(`[RTC ${peers[m.peer_id].user.nickname}] The local description set, relaying ...`)
                                            })
                                            .catch(error => {
                                                console.error(`[RTC ${peers[m.peer_id].user.nickname}] Failed to set the local description`, error)
                                            })
                                    })
                                    .catch(error => {
                                        console.error(`[RTC ${peers[m.peer_id].user.nickname}] Failed to create answer`, error)
                                    })
                            }
                        })
                        .catch(error => {
                            console.error(`[RTC ${peers[m.peer_id].user.nickname}] Failed to set the remote description`, error)
                        })

                    break
                }

                /**
                 * The offerer will send a number of ICE Candidate blobs to the answerer so they 
                 * can begin trying to find the best path to one another on the net.
                 */
                case 'iceCandidate': {
                    isInCall = true
                    console.log(`[RTC ${peers[m.peer_id]?.user.nickname}] Received ICE candidate`, m.ice_candidate)
                    peers[m.peer_id].rtc.addIceCandidate(new RTCIceCandidate(m.ice_candidate))
                    break
                }

                /**
                 * When a user leaves a channel (or is disconnected from the
                 * signaling server) everyone will recieve a 'removePeer' message
                 * telling them to trash the media channels they have open for those
                 * that peer. If it was this client that left a channel, they'll also
                 * receive the removePeers. If this client was disconnected, they
                 * wont receive removePeers, but rather the
                 * signaling_socket.on('disconnect') code will kick in and tear down
                 * all the peer sessions.
                 */
                case 'removePeer': {
                    console.log(`[RTC ${peers[m.peer_id]?.user.nickname}] Server said to remove peer`)
                    document.getElementById(`call-peer-${m.peer_id}`)?.remove()
                    peers[m.peer_id]?.rtc.close()
                    delete peers[m.peer_id]
                    break
                }
            }
        })
    }

    window['endCall'] = () => {
        wsClient.send({
            type: 'part',
            channel: currentChannel,
        })
        cleanup()
    }

    wsClient.addEventListener('message', (/** @type {WebSocketMessageEvent} */ e) => {
        switch (e.message.type) {
            // @ts-ignore
            case 'unjoined_call_started': {
                if (document.getElement('call-container').style.display === 'none') {
                    document.getElement('unjoined-call-container').style.display = ''
                }
                break
            }
            // @ts-ignore
            case 'unjoined_call_ended': {
                document.getElement('unjoined-call-container').style.display = 'none'
                break
            }
        }
    })

    window.addEventListener('beforeunload', e => {
        if (isInCall) {
            if (!prompt(`Do you want to leave the call?`)) {
                e.preventDefault()
                e.returnValue = true
            }
        }
    })
})()