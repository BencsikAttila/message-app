const Client = require('../../public/js/client')

/** @type {Client} */
let client = null

before(() => {  
  client = new Client('http://localhost:6789')
})

const _ = describe('Channels', function () {
  it('Create', async function () {
    const res = await client.createChannel('Test channel 1')
    await client.getChannel(res.id)
  })
})
_.beforeAll(async () => {
    await client.register(`Test user : Channels`, 'passwd')
  })
_.afterAll(async () => {
    await client.logout()
  })
