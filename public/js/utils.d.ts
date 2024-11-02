interface Document {
    /**
     * Gets an element based on id, or throws an error if it doesn't exist.
     * Specifying `tagName` ensures that the element's'tag is `tagName`
     * or throws an error if not.
     * @param id The element's id to search for
     * @param tagName The desired tag name
     */
    getElement
        <TagName extends keyof HTMLElementTagNameMap>
        (id: string, tagName?: TagName):
        HTMLElementTagNameMap[TagName]

    /**
     * Creates an HTML element from the specified HTML source string.
     * **Note that you can only create one element at the moment!**
     * @param html The HTML string
     */
    fromHTML(html: string): HTMLElement
}
