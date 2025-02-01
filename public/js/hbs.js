/**
 * This handles the Handlebars templates and provides the function `getTemplate` on
 * the `window` which returns the cached template or downloads and compiles it.
 */

/// <reference types="../../src/node_modules/handlebars" />

// Wrapping in a function otherwise `templates` can be accessed globally
(() => {
    /**
     * @type {Record<string, Promise<HandlebarsTemplateDelegate<any>>>}
     */
    const templates = {}

    window['getTemplate'] = (/** @type {string} */ templateName) => {
        // Returns the template from `templates` otherwise download and compile it
        return templates[templateName] ?? new Promise((resolve, reject) => {
            fetch(`/hbs/${templateName}.hbs`)
                .then(res => res.text())
                .then(res => {
                    const template = Handlebars.compile(res)
                    templates[templateName] = Promise.resolve(template) // This will save it to `templates`
                    resolve(template)
                })
                .catch(reject)
        })
    }
})()
