// Periodic Background Sync — Android Chrome wakes this up periodically
// (typically every ~15 min) even when the app is closed.  We broadcast a
// message to any open clients so they can trigger a query invalidation.
self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'grove-refresh') {
        event.waitUntil(
            self.clients.matchAll({ includeUncontrolled: true, type: 'window' }).then((clients) => {
                clients.forEach((client) => client.postMessage({ type: 'REFRESH' }))
            })
        )
    }
})

self.addEventListener('push', (event) => {
    let data = { title: 'Grove', body: 'You have a reminder.', url: '/' }
    try { Object.assign(data, JSON.parse(event.data.text())) } catch {}
    event.waitUntil(
        self.registration.showNotification(data.title, {
            body: data.body,
            icon: '/icons/icon-192.png',
            badge: '/icons/icon-192.png',
            data: { url: data.url },
        })
    )
})

self.addEventListener('notificationclick', (event) => {
    event.notification.close()
    const url = event.notification.data?.url || '/'
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
            for (const client of list) {
                if ('focus' in client) {
                    client.postMessage({ type: 'NAVIGATE', url })
                    return client.focus()
                }
            }
            if (clients.openWindow) return clients.openWindow(url)
        })
    )
})
