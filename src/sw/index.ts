/**
 * @fileoverview Service worker module barrel exports.
 *
 * Re-exports service worker registration/unregistration helpers from
 * {@link ./register} and the Vite plugin + options type from
 * {@link ./vite-plugin-service-worker}.
 */

export {
  registerServiceWorker,
  unregisterServiceWorker,
  type ServiceWorkerState,
  type RegisterServiceWorkerOptions,
} from './register.js';
export {
  serviceWorkerPlugin,
  type ServiceWorkerPluginOptions,
} from './vite-plugin-service-worker.js';
