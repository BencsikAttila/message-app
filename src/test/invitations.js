const Client = require('../../public/js/client')
const assert = require('assert')

/** @type {Client} */
let client1 = null
/** @type {Client} */
let client2 = null

before(() => {
  client1 = new Client('http://localhost:6789')
  client2 = new Client('http://localhost:6789')
})

const _ = describe('Messages', function () {
  it('Create & Delete', async function () {
    const channel1 = await client1.createChannel('Test channel 1')

    await assert.rejects(client2.getChannel(channel1.id))

    const invitation = await channel1.createInvitation()

    await assert.rejects(client2.getChannel(channel1.id))

    assert.equal(invitation.usages, 0)
    await client2.useInvitation(invitation.id)

    await assert.doesNotReject(client2.getChannel(channel1.id))

  })
})
_.beforeAll(async () => {
  await client1.register(`Test user 1 : Invitations`, 'passwd')
  await client2.register(`Test user 2 : Invitations`, 'passwd')
})
_.afterAll(async () => {
  await client1.logout()
  await client2.logout()
})
