const App = require('../../public/js/client')
const app = new App('http://localhost:6789')

;(async () => {
    await app.login('asd1', 'asd1')
    await app.createChannel('Test channel 1')
})()
