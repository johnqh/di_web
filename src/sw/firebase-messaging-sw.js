// Firebase Cloud Messaging Service Worker
// This file must be served from the root domain for FCM to work properly

// Import Firebase scripts for the service worker
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Initialize Firebase in the service worker
// Note: This configuration should match your main app's Firebase config
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Check if Firebase is already initialized
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Initialize Firebase Cloud Messaging
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage(payload => {
  const notificationTitle = payload.notification?.title || 'New Email';
  const notificationOptions = {
    body: payload.notification?.body || 'You have received a new email',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'email-notification',
    data: {
      url: payload.data?.url || '/mail',
      emailId: payload.data?.emailId,
      timestamp: Date.now(),
    },
    actions: [
      {
        action: 'view',
        title: 'View Email',
        icon: '/favicon.ico',
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
      },
    ],
    requireInteraction: true,
    silent: false,
  };

  // Show notification
  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'view') {
    // Open or focus the email app
    const urlToOpen = event.notification.data?.url || '/mail';

    event.waitUntil(
      clients
        .matchAll({
          type: 'window',
          includeUncontrolled: true,
        })
        .then(clientList => {
          // Check if app is already open
          for (const client of clientList) {
            if (client.url.includes(self.location.origin)) {
              client.focus();
              client.navigate(urlToOpen);
              return;
            }
          }

          // Open new window if app isn't open
          if (clients.openWindow) {
            return clients.openWindow(urlToOpen);
          }
        })
    );
  } else if (event.action === 'dismiss') {
    // Just close the notification (already closed above)
  }
});

// Handle notification close events
self.addEventListener('notificationclose', event => {
  // Notification closed
});

// Optional: Handle push events directly (if using custom push server)
self.addEventListener('push', event => {
  if (event.data) {
    const data = event.data.json();

    // Handle custom push notifications if needed
    // This is typically handled by FCM automatically
  }
});
