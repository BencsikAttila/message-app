const App = require('../../public/js/client')
const app = new App('http://localhost:6789')

;(async () => {
    await app.register('test1', 'test1')
    await app.login('test1', 'test1')
})()

