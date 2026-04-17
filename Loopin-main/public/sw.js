self.addEventListener('push', event => {
    let data = {};
    try {
        // Kiểm tra nếu có dữ liệu gửi từ server
        data = event.data ? event.data.json() : { title: 'Loopin', body: 'Time for your habits!' };
    } catch (e) {
        data = { title: 'Loopin', body: event.data.text() };
    }

    const options = {
       body: data.body,
        vibrate: [100, 50, 100], // Vibration for mobile devices
        requireInteraction: true, // CRITICAL: The notification stays until the user closes or clicks it
        data: data.habitId ? { habitId: data.habitId } : {} // Gửi habitId nếu có để frontend xử lý reset streak
    };

    if (data.icon) options.icon = data.icon;
    if (data.badge) options.badge = data.badge;

    // Hiển thị thông báo
    const notificationPromise = self.registration.showNotification(data.title, options);

    // Gửi message về frontend để reset streak nếu có habitId
    let messagePromise = Promise.resolve();
    if (data.habitId) {
        messagePromise = self.clients.matchAll({ includeUncontrolled: true, type: 'window' })
            .then(clients => {
                clients.forEach(client => {
                    client.postMessage({ type: 'RESET_STREAK', habitId: data.habitId });
                });
            });
    }

    event.waitUntil(Promise.all([notificationPromise, messagePromise]));
});

self.addEventListener('notificationclick', event => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow('/home.html')
    );
});

