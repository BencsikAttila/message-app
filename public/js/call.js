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
    /** @type {Record<string, RTCPeerConnection>} */
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
            peers[peer_id].close()
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
            /** @type {any} */
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
                    console.log('Signaling server said to add peer', m)
                    const peer_id = m.peer_id
                    if (peer_id in peers) {
                        /* This could happen if the user joins multiple channels where the other peer is also in. */
                        console.log('Already connected to peer', peer_id)
                        return
                    }

                    const user = m.user

                    const peer_connection = new RTCPeerConnection({
                        iceServers: ICE_SERVERS
                    })
                    peers[peer_id] = peer_connection

                    peer_connection.addEventListener('icecandidate', e => {
                        if (!e.candidate) return

                        wsClient.send({
                            type: 'relayICECandidate',
                            peer_id: peer_id,
                            ice_candidate: {
                                sdpMLineIndex: e.candidate.sdpMLineIndex,
                                candidate: e.candidate.candidate
                            }
                        })
                    })

                    peer_connection.addEventListener('track', e => {
                        console.log('ontrack', e.track)
                        if (document.getElementById(`call-peer-${peer_id}`)) {
                            console.warn(`Multiple tracks received`)
                            return
                        }

                        createMediaElement(peer_id, e.streams[0], user)
                    })

                    /* Add our local stream */
                    localMediaStream
                        .getTracks()
                        .forEach((track) => peer_connection.addTrack(track, localMediaStream))

                    /* Only one side of the peer connection should create the
                        * offer, the signaling server picks one to be the offerer. 
                        * The other user will get a 'sessionDescription' event and will
                        * create an offer, then send back an answer 'sessionDescription' to us
                        */
                    if (m.should_create_offer) {
                        console.log('Creating RTC offer to ', peer_id)
                        peer_connection.createOffer()
                            .then(local_description => {
                                console.log('Local offer description is: ', local_description)
                                peer_connection.setLocalDescription(local_description)
                                    .then(() => {
                                        wsClient.send({
                                            type: 'relaySessionDescription',
                                            peer_id: peer_id,
                                            session_description: local_description
                                        })
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
                    isInCall = true
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
                                                wsClient.send({
                                                    type: 'relaySessionDescription',
                                                    peer_id: peer_id,
                                                    session_description: local_description
                                                })
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
                    isInCall = true
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