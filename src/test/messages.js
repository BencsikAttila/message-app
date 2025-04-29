const Client = require('../../public/js/client')
const assert = require('assert')

/** @type {Client} */
let client = null

before(() => {
  client = new Client('http://localhost:6789')
})

const _ = describe('Messages', function () {
  it('Create & Delete', async function () {
    const channel = await client.createChannel('Test channel 1')
    const message = await channel.send('test message')

    assert.equal('test message', message.content)

    await message.delete()
  })
})
_.beforeAll(async () => {
  await client.register(`Test user : Messages`, 'passwd')
})
_.afterAll(async () => {
  await client.logout()
})
