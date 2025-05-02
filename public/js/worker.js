self.addEventListener('push', e => {
  if (!(self.Notification && self.Notification.permission === 'granted')) return

  // @ts-ignore
  const data = e.data?.json() ?? {}

  self.registration.showNotification(data.title, {
    ...data,
    title: undefined,
  })
})