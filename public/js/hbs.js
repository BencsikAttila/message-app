/**
 * This handles the Handlebars templates and provides the function `getTemplate` on
 * the `window` which returns the cached template or downloads and compiles it.
 */

/// <reference types="../../src/node_modules/handlebars" />

// Wrapping in a function otherwise `templates` can be accessed globally
(() => {
    /**
     * @type {Record<string, HandlebarsTemplateDelegate<any>>}
     */
    const templates = {}

    const allPartialDownloadPromise = new Promise((resolve, reject) => {
        fetch('/hbs/partials')
            .then(v => v.json())
            .then(async v => {
                for (const templateName in v) {
                    const template = Handlebars.compile(v[templateName])
                    Handlebars.registerPartial(templateName, template)
                    templates[templateName] = template
                }
                resolve()
            })
            .catch(reject)
    })

    window.getTemplate = (/** @type {string} */ templateName) => {
        if (templateName in templates) {
            return Promise.resolve(templates[templateName])
        }

        return (async () => {
            await allPartialDownloadPromise
            if (templateName in templates) {
                return templates[templateName]
            }
            throw new Error(`Template "${templateName}" not found`)
        })()
    }
})()
