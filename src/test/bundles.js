const Client = require('../../public/js/client')
const assert = require('assert')

/** @type {Client} */
let client = null

before(() => {
  client = new Client('http://localhost:6789')
})

const _ = describe('Bundles', function () {
  it('Create & Delete', async function () {
    const channel1 = await client.createChannel('Channel 1')
    const channel2 = await client.createChannel('Channel 2')
    const channel3 = await client.createChannel('Channel 3')
    const bundle = await client.createBundle('Test bundle 1', [
      channel1.id,
      channel2.id,
      channel3.id,
    ])

    assert.equal('Test bundle 1', bundle.name)

    await channel1.leave()
    await channel2.leave()
    await channel3.leave()

    await bundle.leave()
    await assert.rejects(client.getBundle(bundle.id))
  })
})
_.beforeAll(async () => {
  await client.register(`Test user : Bundles`, 'passwd')
})
_.afterAll(async () => {
  await client.logout()
})
