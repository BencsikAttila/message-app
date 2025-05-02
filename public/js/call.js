// https://github.com/anoek/webrtc-group-chat-example/blob/master/client.html

(() => {
    const callPeersContainer = document.getElement('call-peers-container', 'div')

    const USE_AUDIO = true
    const USE_VIDEO = true
    const DEFAULT_CHANNEL = window.ENV.channel?.id ?? 'global'

    /** https://gist.github.com/zziuni/3741933 **/
    const ICE_SERVERS = [
        { urls: 'stun:stun.l.google.com:19302' }
    ]

    /**
     * @param {HTMLAudioElement | HTMLVideoElement} element
     * @param {MediaStream} stream
     */
    function attachMediaStream(element, stream) {
        console.warn('DEPRECATED, attachMediaStream will soon be removed.')
        element.srcObject = stream
    }

    /** @type {WebSocket} */
    let ws = null
    /** @type {MediaStream | null} */
    let localMediaStream = null
    /** @type {Record<string, RTCPeerConnection>} */
    let peers = {}

    /**
     * @param {string} id
     */
    function createMediaElement(id) {
        const element = document.fromHTML(Handlebars.compile(`
            <div class="call-peer" id="call-peer-{{id}}">
                <video autoplay {{#if local}}muted=true{{/if}}></video>
                <div class="call-peer-controls-wrapper">
                    <div class="call-peer-controls">
                        <label for="peer-mute-{{id}}" class="button"></label>
                        <input id="peer-mute-{{id}}" type=checkbox style="display:none">
                    </div>
                </div>
            </div>
        `)({
            id: id,
            local: id === 'local',
        }))
        callPeersContainer.append(element)
        const video = element.querySelector('video')
        const muteCheck = element.querySelector('input')
        const muteLabel = element.querySelector('label')
        const refreshMuteIcon = () => {
            muteLabel.innerHTML = `<i class="fa ${video.muted ? 'fa-microphone-slash' : 'fa-microphone'}"></i>`
        }
        muteCheck?.addEventListener('change', e => {
            video.muted = muteCheck.checked
            refreshMuteIcon()
        })
        refreshMuteIcon()
        return video
    }

    function setupLocalMedia() {
        return new Promise((resolve, reject) => {
            if (localMediaStream != null) {
                resolve()
                return
            }

            // @ts-ignore
            navigator.getUserMedia = (navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia)

            navigator.mediaDevices.getUserMedia({ video: USE_VIDEO, audio: USE_AUDIO })
                .then((stream) => {
                    console.log('Access granted to audio/video', stream.id)
                    localMediaStream = stream
                    const local_media = createMediaElement('local')
                    attachMediaStream(local_media, stream)

                    resolve()
                })
                .catch(error => {
                    console.error(error)
                    alert('You chose not to provide access to the camera/microphone, demo will not work.')
                    reject(error)
                })
        })
    }

    window['startCall'] = () => {
        if (ws) { return }
        ws = new WebSocket(`ws://${window.location.host}/`)

        ws.addEventListener('open', () => {
            console.log('Connected to signaling server')
            setupLocalMedia()
                .then(() => {
                    document.getElement('call-container').style.display = ''
                    document.getElement('unjoined-call-container').style.display = 'none'

                    ws.send(JSON.stringify({
                        type: 'join',
                        channel: DEFAULT_CHANNEL,
                        userdata: {},
                    }))
                })
        })

        ws.addEventListener('close', e => {
            console.log('Disconnected from signaling server', e.code, e.reason)

            callPeersContainer.innerHTML = ''

            for (const peer_id in peers) {
                peers[peer_id].close()
            }

            for (const track of localMediaStream.getTracks()) {
                track.stop()
            }

            document.getElement('call-container').style.display = 'none'

            peers = {}
            localMediaStream = null
            ws = null
        })

        ws.addEventListener('message', e => {
            const m = JSON.parse(e.data)
            switch (m.type) {
                /** 
                * When we join a group, our signaling server will send out 'addPeer' events to each pair
                * of users in the group (creating a fully-connected graph of users, ie if there are 6 people
                * in the channel you will connect directly to the other 5, so there will be a total of 15 
                * connections in the network). 
                */
                case 'addPeer': {
                    const config = m
                    console.log('Signaling server said to add peer', config)
                    const peer_id = config.peer_id
                    if (peer_id in peers) {
                        /* This could happen if the user joins multiple channels where the other peer is also in. */
                        console.log('Already connected to peer', peer_id)
                        return
                    }
                    const peer_connection = new RTCPeerConnection({
                        iceServers: ICE_SERVERS
                    })
                    peers[peer_id] = peer_connection

                    peer_connection.onicecandidate = function (event) {
                        if (event.candidate) {
                            ws.send(JSON.stringify({
                                type: 'relayICECandidate',
                                peer_id: peer_id,
                                ice_candidate: {
                                    sdpMLineIndex: event.candidate.sdpMLineIndex,
                                    candidate: event.candidate.candidate
                                }
                            }))
                        }
                    }
                    peer_connection.ontrack = function (event) {
                        console.log('ontrack', event)
                        if (document.getElementById(`call-peer-${peer_id}`)) {
                            console.warn(`Multiple tracks received`)
                            return
                        }
                        const remote_media = createMediaElement(peer_id)
                        attachMediaStream(remote_media, event.streams[0])
                    }

                    /* Add our local stream */
                    localMediaStream
                        .getTracks()
                        .forEach((track) => peer_connection.addTrack(track, localMediaStream))

                    /* Only one side of the peer connection should create the
                        * offer, the signaling server picks one to be the offerer. 
                        * The other user will get a 'sessionDescription' event and will
                        * create an offer, then send back an answer 'sessionDescription' to us
                        */
                    if (config.should_create_offer) {
                        console.log('Creating RTC offer to ', peer_id)
                        peer_connection.createOffer()
                            .then(local_description => {
                                console.log('Local offer description is: ', local_description)
                                peer_connection.setLocalDescription(local_description)
                                    .then(() => {
                                        ws.send(JSON.stringify({
                                            type: 'relaySessionDescription',
                                            peer_id: peer_id,
                                            session_description: local_description
                                        }))
                                        console.log('Offer setLocalDescription succeeded')
                                    })
                                    .catch(error => {
                                        console.error(error)
                                        alert('Offer setLocalDescription failed!')
                                    })
                            })
                            .catch(error => {
                                console.error('Error sending offer: ', error)
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
                    console.log('Remote description received: ', m)
                    const peer_id = m.peer_id
                    const peer = peers[peer_id]
                    const remote_description = m.session_description

                    const desc = new RTCSessionDescription(remote_description)
                    console.log('Description Object: ', desc)
                    peer.setRemoteDescription(desc)
                        .then(function () {
                            console.log('setRemoteDescription succeeded')
                            if (remote_description.type == 'offer') {
                                console.log('Creating answer')
                                peer.createAnswer()
                                    .then(function (local_description) {
                                        console.log('Answer description is: ', local_description)
                                        peer.setLocalDescription(local_description)
                                            .then(function () {
                                                ws.send(JSON.stringify({
                                                    type: 'relaySessionDescription',
                                                    peer_id: peer_id,
                                                    session_description: local_description
                                                }))
                                                console.log('Answer setLocalDescription succeeded')
                                            })
                                            .catch(function () {
                                                alert('Answer setLocalDescription failed!')
                                            })
                                    })
                                    .catch(function (error) {
                                        console.error('Error creating answer: ', error)
                                        console.log(peer)
                                    })
                            }
                        })
                        .catch(function (error) {
                            console.error('setRemoteDescription error: ', error)
                        })

                    break
                }

                /**
                 * The offerer will send a number of ICE Candidate blobs to the answerer so they 
                 * can begin trying to find the best path to one another on the net.
                 */
                case 'iceCandidate': {
                    console.log(`Received ICE candidate`)
                    peers[m.peer_id].addIceCandidate(new RTCIceCandidate(m.ice_candidate))
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
                    console.log('Server said to remove peer', m)
                    document.getElementById(`call-peer-${m.peer_id}`)?.remove()
                    peers[m.peer_id]?.close()
                    delete peers[m.peer_id]
                    break
                }
            }
        })
    }

    window['endCall'] = () => {
        ws.send(JSON.stringify({
            type: 'part',
            channel: DEFAULT_CHANNEL,
        }))
        ws.close(1000, 'User left from call')
    }

    wsClient.addEventListener('message', (/** @type {WebSocketMessageEvent} */ e) => {
        switch (e.message.type) {
            case 'unjoined_call_started': {
                if (document.getElement('call-container').style.display === 'none') {
                    document.getElement('unjoined-call-container').style.display = ''
                }
                break
            }
            case 'unjoined_call_ended': {
                document.getElement('unjoined-call-container').style.display = 'none'
                break
            }
        }
    })
})()