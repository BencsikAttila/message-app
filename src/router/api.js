const express = require('express')

/**
 * @param {express.Router} router
 */
module.exports = (router) => {
    require('./api/bundles')(router)
    require('./api/channels')(router)
    require('./api/invitations')(router)
    require('./api/messages')(router)
    require('./api/user')(router)
}
