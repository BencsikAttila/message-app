const express = require('express')

/**
 * @param {express.Router} router
 * @param {import('../app')} app
 */
module.exports = (router, app) => {
    require('./api/bundles')(router, app)
    require('./api/channels')(router, app)
    require('./api/invitations')(router, app)
    require('./api/messages')(router, app)
    require('./api/user')(router, app)
}
