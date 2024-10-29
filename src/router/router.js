const express = require('express')
const path = require('path')

const router = express.Router(({ mergeParams: true }))

router.use(express.static(path.join(__dirname, '..', '..', 'public')))

module.exports = router
