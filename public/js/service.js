const publicVapidKey = 'BIoQKYC3mm4IiU3_gEs4yxd5UKKtgihGlmS2H6W-0VXxXwOFu2bQgmKd0yh5Z-dZKNjD8hWYcH1SOYfeo8jt8g8'

/**
 * @param {string} base64String
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

/**
 * @param {ServiceWorkerRegistration} swRegistration
 */
async function generateSubscription(swRegistration) {
  await window.Notification.requestPermission()

  const pushSubscription = await swRegistration.pushManager.getSubscription()
  if (pushSubscription) return

  const subscription = await swRegistration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
  })

  const res = await fetch('/push/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(subscription)
  })

  if (res.ok) return

  throw Error('Subscription not saved!')
}

if ('serviceWorker' in navigator) {
  console.log('[SW]: Registering ...')
  navigator.serviceWorker.register('/js/worker.js')
    .then(swRegistration => {
      console.log('[SW]: Ready ...')
      generateSubscription(swRegistration)
    })
    .catch(console.error)
} else {
  throw new Error('ServiceWorkers are not supported by your browser!')
}
