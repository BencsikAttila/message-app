
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
