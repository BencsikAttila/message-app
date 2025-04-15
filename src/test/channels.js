const assert = require('assert')
const App = require('../../public/js/client')

/** @type {App} */
let client = null

/**
 * @param {() => Promise} promise
 */
assert['rejects'] = function(promise) {
  return new Promise((resolve, reject) => {
    promise()
      .then(() => reject(new this.AssertionError({ message: 'Promise didn\'t rejected' })))
      .catch(() => resolve())
  })
}

before(() => {  
  require('../index')
  client = new App('http://localhost:6789')
})

describe('Channels', function () {
  it('Create', async function () {
    const res = await client.createChannel('Test channel 1')
    await client.getChannel(res.id)
  })
})
  .beforeAll(async () => {
    await client.register(`Test user : Channels`, 'passwd')
  })
  .afterAll(async () => {
    await client.logout()
  })

after(() => {
  (/** @type {import('http').Server} */ (global.server)).close()
})
