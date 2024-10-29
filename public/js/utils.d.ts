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
}
