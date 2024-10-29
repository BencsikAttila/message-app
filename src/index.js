const express = require('express')
const router = require('./router/router')
const port = 6789

const app = express()

app.use(router)

app.listen(port, () => {
    console.log(`Listening on port ${port}`)
})
