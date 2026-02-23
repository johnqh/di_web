/**
 * @fileoverview Service worker registration and unregistration utilities.
 *
 * Provides helpers to register the shared Sudobility service worker (`/sw.js`)
 * in production environments and to unregister it when needed. Registration
 * includes automatic 24-hour update checks, retry logic for transient failures,
 * and state-change callbacks so consumers can react to registration lifecycle
 * events (e.g. showing an "update available" prompt).
 *
 * @example
 * ```ts
 * import { registerServiceWorker } from '@sudobility/di_web';
 *
 * // Basic registration (runs only in production)
 * registerServiceWorker();
 *
 * // With state-change callback
 * registerServiceWorker({
 *   onStateChange: (state) => {
 *     if (state === 'update-available') {
 *       showUpdateBanner();
 *     }
 *   },
 * });
 *
 * // Unregister
 * import { unregisterServiceWorker } from '@sudobility/di_web';
 * unregisterServiceWorker();
 * ```
 */

// Consumed by Vite apps that provide import.meta.env at build time
declare global {
  interface ImportMeta {
    readonly env: Record<string, string | boolean | undefined>;
  }
}

/**
 * Possible states emitted during the service worker registration lifecycle.
 *
 * - `'registering'` -- registration has started
 * - `'registered'` -- registration succeeded
 * - `'update-available'` -- a new worker is installed and waiting to activate
 * - `'error'` -- registration failed (may retry)
 * - `'unsupported'` -- browser does not support Service Workers
 * - `'insecure-context'` -- page is not served over HTTPS (or localhost)
 */
export type ServiceWorkerState =
  | 'registering'
  | 'registered'
  | 'update-available'
  | 'error'
  | 'unsupported'
  | 'insecure-context';

/**
 * Options for {@link registerServiceWorker}.
 */
export interface RegisterServiceWorkerOptions {
  /**
   * Callback invoked whenever the registration state changes.
   *
   * @param state - The new state of the registration lifecycle.
   */
  onStateChange?: (state: ServiceWorkerState) => void;

  /**
   * Maximum number of retry attempts when registration fails.
   * Each retry waits exponentially longer (1 s, 2 s, 4 s, ...).
   *
   * @default 3
   */
  maxRetries?: number;

  /**
   * Force enable/disable the production check. When not provided the
   * function reads `import.meta.env.PROD` (set by Vite at build time).
   * Useful for testing or for environments where `import.meta.env` is
   * not available.
   */
  forceEnable?: boolean;
}

/** Default number of retry attempts for failed registrations. */
const DEFAULT_MAX_RETRIES = 3;

/** Base delay (ms) between retries -- doubled on each subsequent attempt. */
const RETRY_BASE_DELAY_MS = 1000;

/** Interval (ms) between automatic update checks (24 hours). */
const UPDATE_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

/**
 * Returns `true` when the current environment is production.
 *
 * Reads `import.meta.env.PROD` which Vite sets at build time.
 */
function isProductionEnv(): boolean {
  try {
    return !!(import.meta as ImportMeta).env['PROD'];
  } catch {
    return false;
  }
}

/**
 * Register the shared Sudobility service worker (`/sw.js`).
 *
 * The function is a no-op in non-production environments (determined by
 * `import.meta.env.PROD`) unless {@link RegisterServiceWorkerOptions.forceEnable | forceEnable}
 * is set to `true`. It guards against missing `navigator.serviceWorker`
 * and insecure (non-HTTPS / non-localhost) contexts, emitting the appropriate
 * state via {@link RegisterServiceWorkerOptions.onStateChange | onStateChange}.
 *
 * On success it sets up a 24-hour interval that checks for updated workers.
 * When an update is found the `'update-available'` state is emitted.
 *
 * On failure it retries up to {@link RegisterServiceWorkerOptions.maxRetries | maxRetries}
 * times with exponential back-off before giving up.
 *
 * @param options - Optional configuration for state callbacks and retry behavior.
 *
 * @example
 * ```ts
 * registerServiceWorker();
 * ```
 *
 * @example
 * ```ts
 * registerServiceWorker({
 *   onStateChange: (state) => console.log('SW state:', state),
 *   maxRetries: 5,
 * });
 * ```
 */
export function registerServiceWorker(
  options: RegisterServiceWorkerOptions = {}
): void {
  const {
    onStateChange,
    maxRetries = DEFAULT_MAX_RETRIES,
    forceEnable,
  } = options;

  // Only register in production builds (unless forced)
  const isEnabled = forceEnable ?? isProductionEnv();
  if (!isEnabled) {
    return;
  }

  // Guard: Service Workers not supported
  if (!('serviceWorker' in navigator)) {
    onStateChange?.('unsupported');
    console.warn(
      'Service worker registration skipped: navigator.serviceWorker is not available.'
    );
    return;
  }

  // Guard: insecure context (SW requires HTTPS or localhost)
  if (
    typeof window !== 'undefined' &&
    window.location.protocol !== 'https:' &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1'
  ) {
    onStateChange?.('insecure-context');
    console.warn(
      'Service worker registration skipped: page is not served over HTTPS.'
    );
    return;
  }

  window.addEventListener('load', () => {
    onStateChange?.('registering');
    attemptRegistration(0, maxRetries, onStateChange);
  });
}

/**
 * Attempt to register the service worker, retrying on failure with
 * exponential back-off.
 *
 * @param attempt - Current attempt number (0-based).
 * @param maxRetries - Maximum number of retries allowed.
 * @param onStateChange - Optional state-change callback.
 */
async function attemptRegistration(
  attempt: number,
  maxRetries: number,
  onStateChange?: (state: ServiceWorkerState) => void
): Promise<void> {
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    onStateChange?.('registered');

    // Check for updates every 24 hours
    setInterval(() => {
      registration.update();
    }, UPDATE_CHECK_INTERVAL_MS);

    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (
            newWorker.state === 'installed' &&
            navigator.serviceWorker.controller
          ) {
            onStateChange?.('update-available');
            console.info('New content available, refresh to update');
          }
        });
      }
    });
  } catch (error) {
    onStateChange?.('error');

    if (attempt < maxRetries) {
      const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
      console.warn(
        `Service worker registration failed (attempt ${String(attempt + 1)}/${String(maxRetries + 1)}). ` +
          `Retrying in ${String(delay)}ms...`,
        error
      );
      setTimeout(() => {
        attemptRegistration(attempt + 1, maxRetries, onStateChange);
      }, delay);
    } else {
      console.error(
        `Service worker registration failed after ${String(maxRetries + 1)} attempts:`,
        error
      );
    }
  }
}

/**
 * Unregister the active service worker.
 *
 * Waits for the service worker to become ready, then calls
 * {@link ServiceWorkerRegistration.unregister | registration.unregister()}.
 * This is a no-op if `navigator.serviceWorker` is not available.
 *
 * @returns A promise that resolves to `true` if unregistration succeeded,
 *          or `false` if service workers are unsupported.
 *
 * @example
 * ```ts
 * const success = await unregisterServiceWorker();
 * if (success) {
 *   console.log('Service worker removed');
 * }
 * ```
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    return false;
  }
  const registration = await navigator.serviceWorker.ready;
  return registration.unregister();
}
