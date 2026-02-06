/**
 * Shared service worker registration utilities
 */

// Consumed by Vite apps that provide import.meta.env at build time
declare global {
  interface ImportMeta {
    readonly env: Record<string, string | boolean | undefined>;
  }
}

export function registerServiceWorker(): void {
  if ('serviceWorker' in navigator && (import.meta as ImportMeta).env['PROD']) {
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        // Check for updates every 24 hours
        setInterval(
          () => {
            registration.update();
          },
          24 * 60 * 60 * 1000
        );

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (
                newWorker.state === 'installed' &&
                navigator.serviceWorker.controller
              ) {
                console.info('New content available, refresh to update');
              }
            });
          }
        });
      } catch (error) {
        console.error('Service worker registration failed:', error);
      }
    });
  }
}

export function unregisterServiceWorker(): void {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.unregister();
    });
  }
}
