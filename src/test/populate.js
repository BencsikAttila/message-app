const App = require('../../public/js/client')
const app = new App('http://localhost:6789')

;(async () => {
    await app.login('test1', 'test1')

    console.log(await app.createChannel('Test channel 1'))
})()

