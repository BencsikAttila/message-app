const express = require('express')

const router = express.Router(({ mergeParams: true }))

require('./api/bundles')(router)
require('./api/channels')(router)
require('./api/invitations')(router)
require('./api/messages')(router)
require('./api/user')(router)

module.exports = router
