// See the utils.d.ts for documentation

/**
 * @template {keyof HTMLElementTagNameMap} TagName
 * @param {string} id
 * @param {TagName} [tagName]
 * @returns {HTMLElementTagNameMap[TagName]}
 */
Document.prototype.getElement = function (id, tagName) {
    const element = this.getElementById(id)
    if (!element) {
        throw new Error(`Element #${id} not found`)
    }

    if (tagName && element.tagName.toLowerCase() !== tagName.toLowerCase()) {
        throw new Error(`Element #${id} is not ${tagName}`)
    }

    // @ts-ignore
    return element
}

/**
 * @param {string} html
 */
document.fromHTML = function (html) {
    html = html.trim()
    if (!html) {
        throw new Error('Tried to add an empty element')
    }

    const container = document.createElement('div')
    container.innerHTML = html
    if (container.childElementCount !== 1) {
        throw new Error('You can append only one element as an HTML at the moment')
    }

    return /** @type {HTMLElement} */ (container.firstChild)
}
