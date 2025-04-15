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

describe('Auth', function () {
  it('Register & login', async function () {
    await client.register('Test user 1', 'passwd1')
    await client.login('Test user 1', 'passwd1')
    await client.logout()
  })

  it('Login to nonexistent account', async function () {
    await assert.rejects(() => client.login('Test user 2', 'passwd2'))
  })

  it('Login with invalid password', async function () {
    await client.register('Test user 3', 'passwd3')
    await assert.rejects(() => client.login('Test user 3', 'passwd3__'))
  })
})

after(() => {
  (/** @type {import('http').Server} */ (global.server)).close()
})
