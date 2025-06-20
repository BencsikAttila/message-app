const assert = require('assert')
const Client = require('../../public/js/client')

/** @type {Client} */
let client = null

before(() => {
  client = new Client('http://localhost:8080')
})

describe('Auth', function () {
  it('Register & login', async function () {
    await client.register('Test user 1', 'passwd1')
    await client.login('Test user 1', 'passwd1')
    await client.logout()
  })

  it('Login to nonexistent account', async function () {
    await assert.rejects(client.login('Test user 2', 'passwd2'))
  })

  it('Login with invalid password', async function () {
    await client.register('Test user 3', 'passwd3')
    await assert.rejects(client.login('Test user 3', 'passwd3__'))
  })
})
