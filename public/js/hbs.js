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

    /**
     * @param {string} templateName
     * @returns {Promise<HandlebarsTemplateDelegate<any>>}
     */
    function downloadTemplate(templateName) {
        return new Promise(async (resolve, reject) => {
            fetch(`/partials/${templateName}.handlebars`)
                .then(res => {
                    if (res.status >= 300) {
                        reject(new Error(res.statusText))
                    } else {
                        return res.text()
                    }
                })
                .then(res => {
                    const template = Handlebars.compile(res)
                    Handlebars.registerPartial(templateName, template)
                    resolve(template)
                })
                .catch(reject)
        })
    }

    const allPartialDownloadPromise = new Promise((resolve, reject) => {
        fetch('/hbs/partials')
            .then(v => v.json())
            .then(async v => {
                const _templates = {}
                for (const templateName of v) {
                    const template = await downloadTemplate(templateName)
                    _templates[templateName] = template
                }
                for (const templateName in _templates) {
                    templates[templateName] = Promise.resolve(_templates[templateName])
                }
                resolve()
            })
            .catch(reject)
    })

    window.getTemplate = (/** @type {string} */ templateName) => {
        if (templateName in templates) {
            return templates[templateName]
        }

        return (async () => {
            await allPartialDownloadPromise
            if (templateName in templates) {
                return await templates[templateName]
            }
            throw new Error(`Template "${templateName}" not found`)
        })()
    }
})()
