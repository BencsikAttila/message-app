const Client = require('../../public/js/client')
const assert = require('assert')

/** @type {Client} */
let client = null

before(() => {
  client = new Client('http://localhost:8080')
})

const _ = describe('Channels', function () {
  it('Create & Delete', async function () {
    const channel = await client.createChannel('Test channel 1')

    assert.equal('Test channel 1', channel.name)

    await assert.doesNotReject(client.getChannel(channel.id))

    await channel.leave()

    await assert.rejects(client.getChannel(channel.id))
  })
})
_.beforeAll(async () => {
  await client.register(`Test user : Channels`, 'passwd')
})
_.afterAll(async () => {
  await client.logout()
})
