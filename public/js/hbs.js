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

    // Returns the template from `templates` otherwise download and compile it
    window['getTemplate'] = (/** @type {string} */ templateName) => {
        if (templateName in templates) { // The template already loaded or is currently loading ...
            return templates[templateName]
        }

        // We have to save the "downloading" template or else it will send the request multiple times
        templates[templateName] = new Promise((resolve, reject) => {
            fetch(`/hbs/${templateName}.hbs`)
                .then(res => {
                    if (res.status >= 300) {
                        reject(new Error(res.statusText))
                    } else {
                        return res.text()
                    }
                })
                .then(res => {
                    const template = Handlebars.compile(res)
                    templates[templateName] = Promise.resolve(template) // This will save it as a downloaded and compiled template
                    resolve(template)
                })
                .catch(reject)
        })

        // This contains the "downloading" template
        return templates[templateName]
    }
})()
