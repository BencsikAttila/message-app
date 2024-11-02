// Disable 'no-undef' because eslint aint recognize this type reference stuff
/* eslint-disable no-undef */

/// <reference types="../../src/node_modules/handlebars" />

// Ignore because the 'templates' is a read-only property
// @ts-ignore
window['templates'] = {}

// TODO: Maybe fetch the list of templates from the server
// so we dont have to add them there.

window['templates']['message'] = new Promise((resolve, reject) => {
    fetch('/hbs/message.hbs')
        .then(res => res.text())
        .then(res => {
            // Parse the HBS file into a template
            const template = Handlebars.compile(res)
            // Set the pending promise into a resolved one,
            // so if someone needs this template it returns it immediately
            window['templates']['message'] = Promise.resolve(template)
            // Resolve the current promise, so if someone
            // requested this template but not loaded yet,
            // it now can continue
            resolve(template)
        })
        .catch(reject)
})
