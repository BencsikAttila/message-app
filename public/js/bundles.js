(() => {
    const newBundleButton = document.getElement('new-bundle-button', 'button')
    const currentBundleChannelsContainer = document.getElement('current-bundle-channels', 'div')
    const newBundleSelect = document.getElement('new-bundle-select', 'select')
    const addToBundleSelect = document.getElement('add-to-bundle-select', 'select')
    const newBundleAddChannelButton = document.getElement('new-bundle-button-add-channel', 'button')
    const addToBundleAddChannelButton = document.getElement('add-to-bundle-button-add-channel', 'button')
    const newBundleAddCreateButton = document.getElement('new-bundle-button-create', 'button')
    const newBundleNameInput = document.getElement('new-bundle-name', 'input')
    const bundlesContainer = document.getElement('bundles-container', 'div')
    const bundlesHeader = document.getElement('bundles-header', 'h1')
    const newBundleDialog = document.getElement("new-bundle-dialog", 'dialog')
    const addToBundleDialog = document.getElement("add-to-bundle-dialog", 'dialog')
    /** @type {Set<string>} */ const expandedBundles = new Set()

    try {
        for (const element of JSON.parse(localStorage.getItem('expanded-bundles') ?? '[]')) {
            expandedBundles.add(element)
        }
    } catch (error) {
        console.error(error)
    }

    document.getElement('new-bundle-button', 'button').addEventListener('click', () => {
        newBundleDialog.showModal()
    })

    document.getElement('new-bundle-button-x', 'button').addEventListener('click', () => {
        newBundleDialog.close()
    })

    document.getElement('add-to-bundle-button-x', 'button').addEventListener('click', () => {
        addToBundleDialog.close()
    })

    /** @type {Set<string>} */
    const currentBundle = new Set()
    /** @type {Record<string, import('../../src/db/model').default['channels']>} */
    const channels = {}
    let selectedBundle = null

    newBundleAddCreateButton.addEventListener('click', () => {
        newBundleDialog.close()
        const channels = []
        currentBundle.forEach(v => channels.push(v))
        API.post('/api/bundles', {
            name: newBundleNameInput.value,
            channels: channels,
        })
            .then(() => {
                refreshList()
            })
            .catch(console.error)
    })

    /**
     * @param {HTMLSelectElement} select
     */
    function refreshChannelOptions(select) {
        for (let i = 0; i < select.options.length; i++) {
            select.options.remove(i)
        }

        API.get('/api/channels')
            .then(v => {
                while (select.options.length > 0) select.options.remove(0)
                for (const channel of v) {
                    channels[channel.id] = channel
                    // @ts-ignore
                    select.options.add(document.fromHTML(Handlebars.compile(`
                        <option class="new-bundle-channel-option" value="{{id}}">
                            {{name}}
                        </option>
                    `)(channel)))
                }
            })
            .catch(console.error)
    }

    newBundleButton.addEventListener('click', () => {
        refreshChannelOptions(newBundleSelect)
    })

    newBundleAddChannelButton.addEventListener('click', () => {
        if (!newBundleSelect.value) return
        currentBundle.add(newBundleSelect.value)
        refreshCurrentChannelList()
    })

    window['showAddChannelToBundleModal'] = (bundleId) => {
        selectedBundle = bundleId
        addToBundleDialog.showModal()
        refreshChannelOptions(addToBundleSelect)
        API.get(`/api/bundles/${bundleId}/channels`)
            .then(channelsInBundle => {
                currentBundle.clear()
                for (const channel of channelsInBundle) {
                    currentBundle.add(channel.id)
                }
            })
            .catch(console.error)
    }

    addToBundleAddChannelButton.addEventListener('click', () => {
        API.post(`/api/bundles/${selectedBundle}/channels`, {
            id: addToBundleSelect.value
        })
            .then(() => {
                selectedBundle = null
                addToBundleDialog.close()
                refreshList()
            })
            .catch(console.error)
    })

    function refreshCurrentChannelList() {
        currentBundleChannelsContainer.innerHTML = ''
        for (const item of currentBundle) {
            const element = currentBundleChannelsContainer.appendChild(document.fromHTML(Handlebars.compile(`
                <div class="new-bundle-channel-item">
                    {{name}}
                    <button class="remove-button"><i class="fa fa-remove"></i></button>
                </div>
            `)(channels[item])))
            element.querySelector('button').addEventListener('click', () => {
                currentBundle.delete(item)
                refreshCurrentChannelList()
            })
        }
    }

    window['channelOnDragEnd'] = (e, id, bundleId) => {
        if (e.dataTransfer.dropEffect !== "move" && bundleId) {
            console.log(`Removing channel ${id} from bundle ${bundleId} ...`)
            API.fetch(`/api/bundles/${bundleId}/channels`, {
                method: 'DELETE',
                body: JSON.stringify({ id: id }),
                headers: {
                    "Content-type": "application/json; charset=UTF-8"
                },
            })
                .then(() => {
                    window['refreshBundlesList']()
                    window['refreshChannelsList']()
                })
                .catch(console.error)
        }
    }

    function refreshList() {
        API.get('/api/bundles')
            .then(async v => {
                bundlesContainer.innerHTML = ''
                bundlesHeader.style.display = v.length ? null : 'none'
                for (const bundle of v) {
                    const bundleElement = bundlesContainer.appendChild(document.fromHTML(Handlebars.compile(`
                        <div class="bundle-item${expandedBundles.has(bundle.id) ? '' : ' collapsed'}" dropzone="true">
                            <span>{{name}} <button class="x">X</button></span>
                            <div class="bundle-dropdown">
                                <div class="bundle-channels"></div>
                                <button onclick="window.showInvitationsModal('{{id}}')">Invitations</button>
                                <button onclick="window.showAddChannelToBundleModal('{{id}}')">Add Channel</button>
                            </div>
                        </div>
                    `)(bundle)))

                    bundleElement.addEventListener('dragover', e => {
                        e.preventDefault()
                        e.dataTransfer.dropEffect = "move"
                        bundleElement.classList.add('dropping')
                    })

                    bundleElement.addEventListener('dragleave', e => {
                        bundleElement.classList.remove('dropping')
                    })

                    bundleElement.addEventListener('drop', e => {
                        e.preventDefault()
                        const channel = e.dataTransfer.getData("text/plain")
                        //undles/ab3d5003-bc34-4c58-b156-f3b1b1e58927/channels 40
                        if (!/[a-zA-Z0-9]{8}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{12}/.test(channel)) {
                            console.warn(`Invalid UUID`, channel)
                            return
                        }
                        console.log(`Adding channel ${channel} to bundle ${bundle.id} ...`)
                        API.post(`/api/bundles/${bundle.id}/channels`, { id: channel })
                            .then(() => {
                                window['refreshBundlesList']()
                                window['refreshChannelsList']()
                            })
                            .catch(console.error)
                    })

                    const deleteButton = bundleElement.getElementsByTagName('button').item(0)
                    const channelsContainer = bundleElement.getElementsByClassName('bundle-channels').item(0)

                    deleteButton.addEventListener('click', () => {
                        API.post(`/api/bundles/${bundle.id}/leave`)
                            .then(() => {
                                window.location.reload()
                            })
                    })

                    bundleElement.querySelector('span').addEventListener('click', () => {
                        if (bundleElement.classList.contains('collapsed')) {
                            bundleElement.classList.remove('collapsed')
                            expandedBundles.add(bundle.id)
                        } else {
                            bundleElement.classList.add('collapsed')
                            expandedBundles.delete(bundle.id)
                        }
                        const _expandedBundles = []
                        for (const element of expandedBundles) {
                            _expandedBundles.push(element)
                        }
                        localStorage.setItem('expanded-bundles', JSON.stringify(_expandedBundles))
                    })

                    API.get(`/api/bundles/${bundle.id}/channels`)
                        .then(async v => {
                            for (const channel of v) {
                                const template = await window.getTemplate('channel')
                                const html = template({
                                    ...channel,
                                    isSelected: channel.id === window.ENV.channel?.id,
                                    bundle: bundle.id,
                                })
                                channelsContainer.appendChild(document.fromHTML(html))
                            }
                        })
                }
            })
    }
    window['refreshBundlesList'] = refreshList

    refreshList()
})()
