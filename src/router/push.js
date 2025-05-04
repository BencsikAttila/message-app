const webpush = require('web-push')
const express = require('express')

/**
 * @type {Array<{
 *   subscription: PushSubscriptionJSON
 *   userId: string
 * }>}
 */
const subscriptions = []

webpush.setVapidDetails('mailto:test@gmail.com', 'BIoQKYC3mm4IiU3_gEs4yxd5UKKtgihGlmS2H6W-0VXxXwOFu2bQgmKd0yh5Z-dZKNjD8hWYcH1SOYfeo8jt8g8', 'IVFXv6JphcKbqFwclHapNeh96-iSFuovOMH6dTVHEIo')

/**
 * @param {express.Router} router
 * @param {import('../utils')} app
 */
const v = (router, app) => {
    router.post('/push/register', app.auth.middleware, async (req, res) => {
        subscriptions.push({
            subscription: req.body,
            userId: req.credentials.id,
        })
        res
            .status(200)
            .end()
    })
}

/**
 * @param {{
 *   title: string
 *   body: string
 *   icon: string
 *   url?: string
 * }} notification 
 * @param {(userId: string) => boolean} filter
 */
v['send'] = async (notification, filter) => {
    const data = JSON.stringify({
        title: notification.title,
        body: notification.body,
        url: notification.url,
        icon: notification.icon,
    })
    const sentSubscriptions = subscriptions
        .filter(v => filter(v.userId))
        .map(subscription =>
            webpush
                // @ts-ignore
                .sendNotification(subscription.subscription, data)
                .then()
                .catch(error => {
                    if (error.statusCode === 410) {
                        const i = subscriptions.indexOf(subscription)
                        if (i >= 0) subscriptions.splice(i, 1)
                    }
                }))

    await Promise.all(sentSubscriptions)

}

module.exports = v
