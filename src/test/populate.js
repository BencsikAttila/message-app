const App = require('../../public/js/client')

;(async () => {
    const app1 = new App('http://localhost:6789')
    await app1.register('User 1', 'passwd')

    const app2 = new App('http://localhost:6789')
    await app2.register('User 2', 'passwd')

    const app3 = new App('http://localhost:6789')
    await app3.register('User 3', 'passwd')

    const app1_channel1 = await app1.createChannel('Talk')
    const app1_channel2 = await app1.createChannel('Ideas')

    const app3_channel3 = await app3.createChannel('Alone')

    const channel1Invitation = await app1_channel1.createInvitation()
    const channel2Invitation = await app1_channel2.createInvitation()

    await app2.useInvitation(channel1Invitation.id)
    await app3.useInvitation(channel1Invitation.id)

    await app2.useInvitation(channel2Invitation.id)
    
    const app2_channel1 = await app2.getChannel(app1_channel1.id)
    const app2_channel2 = await app2.getChannel(app1_channel2.id)
    const app3_channel1 = await app3.getChannel(app1_channel1.id)

    await app1_channel1.send(`Hello guys`)
    await app2_channel1.send(`how are u`)
    await app1_channel1.send(`finee`)
    await app3_channel1.send(`i failed the exam bruhh`)
    await app1_channel1.send(`aww`)
    await app2_channel1.send(`i have to go now bye`)

    await app2_channel2.send(`have an idea we should rewrite it in go`)
    await app1_channel2.send(`ayyy whyy`)
    await app2_channel2.send(`idk`)
    await app1_channel2.send(`...`)

    await app3_channel3.send(`walk alone`)

    const app4 = new App('http://localhost:6789')
    await app4.register('asd1', 'asd1')

    const app5 = new App('http://localhost:6789')
    await app5.register('asd2', 'asd2')

})()
