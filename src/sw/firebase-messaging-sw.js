// =============================================================================
// Firebase Cloud Messaging Service Worker
// =============================================================================
//
// PURPOSE
// -------
// This worker runs in the background (even when the app tab is closed) and
// handles push notifications sent via Firebase Cloud Messaging (FCM).  It is
// emitted into the build output by the Vite plugin (`serviceWorkerPlugin`) and
// **must be served from the root of the domain** (`/firebase-messaging-sw.js`)
// for FCM to recognise it.
//
// HOW TO CONFIGURE
// ----------------
// The `firebaseConfig` object below reads its values from `process.env.*`
// variables.  In a Vite project these are typically defined as VITE_* env
// vars in a `.env` file (or in your CI environment):
//
//   VITE_FIREBASE_API_KEY=AIza...
//   VITE_FIREBASE_AUTH_DOMAIN=my-app.firebaseapp.com
//   VITE_FIREBASE_PROJECT_ID=my-app
//   VITE_FIREBASE_STORAGE_BUCKET=my-app.appspot.com
//   VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
//   VITE_FIREBASE_APP_ID=1:123456789:web:abc123
//   VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXX
//
// Because service workers cannot access `import.meta.env`, the values are
// injected at build time via the `serviceWorkerPlugin` Vite plugin (or any
// other build-time replacement tool such as `@rollup/plugin-replace`).
//
// If you are NOT using the Vite plugin you can manually replace the
// `process.env.VITE_*` references below with hard-coded strings matching
// your Firebase project.  Make sure the values here match the ones used by
// your main application code.
//
// IMPORTANT NOTES
// ---------------
// - The Firebase compat SDK (`firebase-app-compat` and
//   `firebase-messaging-compat`) is loaded via `importScripts` because
//   service workers do not support ES module imports in all browsers.
// - The compat SDK version (10.7.1 below) should be kept in sync with the
//   Firebase SDK version used by the main application.
// - The worker handles three event types:
//     1. `onBackgroundMessage` -- FCM-delivered push messages while the app
//        is in the background.
//     2. `notificationclick` -- user taps/clicks a displayed notification.
//     3. `push` -- raw push events (usually handled by FCM automatically).
// - Notification actions ("View Email" / "Dismiss") and default routing
//   (`/mail`) are customisable below.
// =============================================================================

// ---------------------------------------------------------------------------
// 1. Import Firebase compat libraries
//    These scripts expose a global `firebase` object in the SW scope.
// ---------------------------------------------------------------------------
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// ---------------------------------------------------------------------------
// 2. Firebase configuration
//    Values are injected at build time from process.env.  See the "HOW TO
//    CONFIGURE" section above for instructions.
// ---------------------------------------------------------------------------
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// ---------------------------------------------------------------------------
// 3. Initialise Firebase (only once -- guard against duplicate initialisation)
// ---------------------------------------------------------------------------
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// ---------------------------------------------------------------------------
// 4. Get the Firebase Cloud Messaging instance
// ---------------------------------------------------------------------------
const messaging = firebase.messaging();

// ---------------------------------------------------------------------------
// 5. Handle background messages
//    This callback fires when the app is in the background or the tab is
//    closed and an FCM message arrives.  Foreground messages are handled by
//    the main app via `onMessage()` from `firebase/messaging`.
// ---------------------------------------------------------------------------
messaging.onBackgroundMessage(payload => {
  // Extract notification title and body from the FCM payload, falling back
  // to sensible defaults if the fields are missing.
  const notificationTitle = payload.notification?.title || 'New Email';
  const notificationOptions = {
    body: payload.notification?.body || 'You have received a new email',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    // `tag` groups notifications -- only one notification with the same tag
    // is shown at a time (newer ones replace older ones).
    tag: 'email-notification',
    // Arbitrary data attached to the notification for use in click handlers.
    data: {
      url: payload.data?.url || '/mail',
      emailId: payload.data?.emailId,
      timestamp: Date.now(),
    },
    // Action buttons displayed alongside the notification (support varies
    // by platform; ignored on platforms that don't support actions).
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
    // Keep the notification visible until the user explicitly interacts
    // with it (not all platforms honour this).
    requireInteraction: true,
    // Play the default notification sound.
    silent: false,
  };

  // Display the notification via the Service Worker registration.
  self.registration.showNotification(notificationTitle, notificationOptions);
});

// ---------------------------------------------------------------------------
// 6. Handle notification click events
//    Determines which action the user selected and routes accordingly.
// ---------------------------------------------------------------------------
self.addEventListener('notificationclick', event => {
  // Close the notification regardless of the action taken.
  event.notification.close();

  if (event.action === 'view') {
    // "View Email" action -- navigate to the URL stored in notification data.
    const urlToOpen = event.notification.data?.url || '/mail';

    event.waitUntil(
      clients
        .matchAll({
          type: 'window',
          includeUncontrolled: true,
        })
        .then(clientList => {
          // If the app is already open in a tab, focus and navigate it.
          for (const client of clientList) {
            if (client.url.includes(self.location.origin)) {
              client.focus();
              client.navigate(urlToOpen);
              return;
            }
          }

          // Otherwise open a new browser window/tab.
          if (clients.openWindow) {
            return clients.openWindow(urlToOpen);
          }
        })
    );
  } else if (event.action === 'dismiss') {
    // "Dismiss" action -- nothing to do; the notification is already closed.
  }
});

// ---------------------------------------------------------------------------
// 7. Handle notification close events (swipe-away / manual dismiss)
//    Currently a no-op.  Add analytics or cleanup logic here if needed.
// ---------------------------------------------------------------------------
self.addEventListener('notificationclose', event => {
  // Notification was closed by the user without tapping an action.
});

// ---------------------------------------------------------------------------
// 8. Handle raw push events (custom push server, not FCM)
//    FCM messages are handled automatically by `onBackgroundMessage` above.
//    This handler is a catch-all for non-FCM push payloads.
// ---------------------------------------------------------------------------
self.addEventListener('push', event => {
  if (event.data) {
    const data = event.data.json();

    // Process custom (non-FCM) push payloads here if needed.
    // For standard FCM usage this handler is unused.
  }
});
