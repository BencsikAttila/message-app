(() => {
    const newBundleButton = document.getElement('new-bundle-button', 'button')
    const currentBundleChannelsContainer = document.getElement('current-bundle-channels', 'div')
    const newBundleSelect = document.getElement('new-bundle-select', 'select')
    const newBundleAddChannelButton = document.getElement('new-bundle-button-add-channel', 'button')
    const newBundleAddCreateButton = document.getElement('new-bundle-button-create', 'button')
    const newBundleNameInput = document.getElement('new-bundle-name', 'input')

    const newBundleDialog = document.getElement("new-bundle-dialog", 'dialog')

    document.getElement('new-bundle-button', 'button').addEventListener('click', () => {
        newBundleDialog.showModal()
    })

    document.getElement('new-bundle-button-x', 'button').addEventListener('click', () => {
        newBundleDialog.close()
    })

    /** @type {Set<string>} */
    const currentBundle = new Set()

    newBundleAddCreateButton.addEventListener('click', () => {
        const channels = []
        currentBundle.forEach(v => channels.push(v))
        fetch('/api/bundles', {
            method: 'POST',
            body: JSON.stringify({
                name: newBundleNameInput.value,
                channels: channels,
            }),
            headers: {
                "Content-type": "application/json; charset=UTF-8"
            }
        })
            .then(() => {

            })
            .catch(console.error)
    })

    newBundleButton.addEventListener('click', () => {
        for (let i = 0; i < newBundleSelect.options.length; i++) {
            newBundleSelect.options.remove(i)
        }

        fetch('/api/channels')
            .then(v => v.json())
            .then(v => {
                for (const channel of v) {
                    // @ts-ignore
                    newBundleSelect.options.add(document.fromHTML(Handlebars.compile(`
                        <option class="new-bundle-channel-option" value="{{uuid}}">
                            {{name}}
                        </option>
                    `)(channel)))
                }
            })
            .catch(console.error)
    })

    newBundleAddChannelButton.addEventListener('click', () => {
        if (!newBundleSelect.value) return
        currentBundle.add(newBundleSelect.value)
        refreshCurrentChannelList()
    })

    function refreshCurrentChannelList() {
        currentBundleChannelsContainer.innerHTML = ''
        for (const item of currentBundle) {
            const element = currentBundleChannelsContainer.appendChild(document.fromHTML(Handlebars.compile(`
                <div class="new-bundle-channel-item">
                    {{name}}
                    <button>Remove</button>
                </div>
            `)({
                name: item
            })))
            element.querySelector('button').addEventListener('click', () => {
                currentBundle.delete(item)
                refreshCurrentChannelList()
            })
        }
    }

    function refreshList() {
        for (const element of document.getElementsByClassName('bundle-item')) {
            element.remove()
        }

        fetch('/api/bundles')
            .then(v => v.json())
            .then(async v => {
                for (const bundle of v) {
                    const bundleElement = document.getElement('channels-container').appendChild(document.fromHTML(Handlebars.compile(`
                        <div class="bundle-item collapsed">
                            <span>{{name}} <button class="x">X</button></span>
                            <div class="bundle-channels">
        
                            </div>
                        </div>
                    `)(bundle)))

                    const deleteButton = bundleElement.getElementsByTagName('button').item(0)
                    const channelsContainer = bundleElement.getElementsByClassName('bundle-channels').item(0)

                    deleteButton.addEventListener('click', () => {
                        fetch(`/api/bundles/${bundle.uuid}`, {
                            method: 'DELETE'
                        })
                            .then(v => {
                                refreshList()
                            })
                    })

                    bundleElement.querySelector('span').addEventListener('click', () => {
                        bundleElement.classList.toggle('collapsed')
                    })

                    fetch(`/api/bundles/${bundle.uuid}/channels`)
                        .then(v => v.json())
                        .then(async v => {
                            for (const channel of v) {
                                const template = await window.getTemplate('channel')
                                const html = template({
                                    ...channel,
                                    isSelected: channel.uuid === window.ENV.channel?.uuid,
                                })
                                channelsContainer.appendChild(document.fromHTML(html))
                            }
                        })
                }
            })
    }

    refreshList()
})()
