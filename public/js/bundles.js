(() => {
    const newBundleButton = document.getElement('new-bundle-button', 'button')
    const currentBundleChannelsContainer = document.getElement('current-bundle-channels', 'div')
    const newBundleSelect = document.getElement('new-bundle-select', 'select')
    const newBundleAddChannelButton = document.getElement('new-bundle-button-add-channel', 'button')
    const newBundleAddCreateButton = document.getElement('new-bundle-button-create', 'button')
    const newBundleNameInput = document.getElement('new-bundle-name', 'input')
    const bundlesContainer = document.getElement('bundles-container', 'div')
    const bundlesHeader = document.getElement('bundles-header', 'h1')
    const newBundleDialog = document.getElement("new-bundle-dialog", 'dialog')
    /** @type {Set<string>} */ const expandedBundles = new Set()

    try {
        for (const element of JSON.parse(localStorage.getItem('expanded-bundles') ?? '[]')) {
            expandedBundles.add(element)
        }
    } catch (error) { }

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
        fetch('/api/bundles')
            .then(v => v.json())
            .then(async v => {
                bundlesContainer.innerHTML = ''
                bundlesHeader.style.display = v.length ? null : 'none'
                for (const bundle of v) {
                    const bundleElement = bundlesContainer.appendChild(document.fromHTML(Handlebars.compile(`
                        <div class="bundle-item${expandedBundles.has(bundle.uuid) ? '' : ' collapsed'}">
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
                        if (bundleElement.classList.contains('collapsed')) {
                            bundleElement.classList.remove('collapsed')
                            expandedBundles.add(bundle.uuid)
                        } else {
                            bundleElement.classList.add('collapsed')
                            expandedBundles.delete(bundle.uuid)
                        }
                        const _expandedBundles = []
                        for (const element of expandedBundles) {
                            _expandedBundles.push(element)
                        }
                        localStorage.setItem('expanded-bundles', JSON.stringify(_expandedBundles))
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
