/**
 * @fileoverview Vite plugin that emits the shared Sudobility service worker
 * files into the build output and serves them during development.
 *
 * During **production builds** (`generateBundle`), the plugin emits `sw.js`
 * (and optionally `firebase-messaging-sw.js`) as assets so they end up at
 * the root of the build output directory.
 *
 * During **development** (`configureServer`), it adds Connect middleware that
 * intercepts requests for `/sw.js` (and `/firebase-messaging-sw.js`) and
 * responds with the file contents, so service workers can be tested locally.
 *
 * This file intentionally avoids importing types from 'vite'. When di_web is
 * installed from npm, its `node_modules/vite` types would conflict with the
 * consuming app's copy. Instead we use inline type annotations that are
 * structurally compatible.
 *
 * @example
 * ```ts
 * // vite.config.ts
 * import { serviceWorkerPlugin } from '@sudobility/di_web/vite';
 *
 * export default {
 *   plugins: [
 *     serviceWorkerPlugin(), // sw.js only
 *   ],
 * };
 * ```
 *
 * @example
 * ```ts
 * // vite.config.ts  --  include Firebase Cloud Messaging worker
 * import { serviceWorkerPlugin } from '@sudobility/di_web/vite';
 *
 * export default {
 *   plugins: [
 *     serviceWorkerPlugin({ includeFirebaseMessaging: true }),
 *   ],
 * };
 * ```
 */

import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';

/** Used when the app's `firebase` version cannot be resolved. */
export const DEFAULT_FIREBASE_SDK_VERSION = '12.8.0';

/**
 * Fill the messaging worker's build-time placeholders. Service workers have
 * no `process` and no `import.meta.env`, so every `process.env.VITE_*`
 * reference becomes a string literal from the app's Vite env, and
 * `__FIREBASE_SDK_VERSION__` becomes the app's installed Firebase version.
 * Unknown variables become empty strings, which the worker treats as
 * "not configured" instead of throwing.
 */
export function renderFirebaseMessagingWorker(
  source: string,
  env: Record<string, string | undefined>,
  firebaseVersion: string
): string {
  return source
    .replace(/process\.env\.(VITE_[A-Z0-9_]+)/g, (_match, name: string) =>
      JSON.stringify(env[name] ?? '')
    )
    .replace(/__FIREBASE_SDK_VERSION__/g, firebaseVersion);
}

/** Version of the `firebase` package installed in the consuming app. */
function resolveFirebaseVersion(root: string): string {
  try {
    const require = createRequire(join(root, 'package.json'));
    const pkg = require('firebase/package.json') as { version?: string };
    return pkg.version ?? DEFAULT_FIREBASE_SDK_VERSION;
  } catch {
    return DEFAULT_FIREBASE_SDK_VERSION;
  }
}

/**
 * Configuration options for the service worker Vite plugin.
 */
export interface ServiceWorkerPluginOptions {
  /**
   * When `true`, the plugin will also emit `firebase-messaging-sw.js` into
   * the build output and serve it during development. Enable this if your
   * app uses Firebase Cloud Messaging push notifications.
   *
   * @default false
   */
  includeFirebaseMessaging?: boolean;
}

/**
 * Create a Vite plugin that emits `sw.js` (and optionally
 * `firebase-messaging-sw.js`) into the build output and serves them
 * during development.
 *
 * The worker files are resolved relative to the compiled `dist/sw/` directory
 * so they are always co-located with this plugin file regardless of where the
 * consuming project lives.
 *
 * @param options - Plugin configuration. See {@link ServiceWorkerPluginOptions}.
 * @returns A Vite-compatible plugin object with `name`, `configureServer`,
 *          and `generateBundle` hooks.
 *
 * @example
 * ```ts
 * import { serviceWorkerPlugin } from '@sudobility/di_web/vite';
 *
 * export default {
 *   plugins: [serviceWorkerPlugin({ includeFirebaseMessaging: true })],
 * };
 * ```
 */
export function serviceWorkerPlugin(options: ServiceWorkerPluginOptions = {}) {
  const { includeFirebaseMessaging = false } = options;

  // Resolve paths to the co-located dist/sw/ files
  const swDir = dirname(fileURLToPath(import.meta.url));
  const swPath = resolve(swDir, 'sw.js');
  const firebaseSwPath = resolve(swDir, 'firebase-messaging-sw.js');

  // Filled by configResolved; defaults keep the plugin usable on its own.
  let env: Record<string, string | undefined> = {};
  let firebaseVersion = DEFAULT_FIREBASE_SDK_VERSION;
  const firebaseWorkerSource = () =>
    renderFirebaseMessagingWorker(
      readFileSync(firebaseSwPath, 'utf-8'),
      env,
      firebaseVersion
    );

  return {
    name: 'sudobility-service-worker' as const,

    /**
     * Captures the app's Vite env (VITE_* from .env files and the process
     * environment) and its Firebase version for the messaging worker.
     */
    configResolved(config: {
      root: string;
      env?: Record<string, string | undefined>;
    }) {
      env = { ...(config.env ?? {}) };
      firebaseVersion = resolveFirebaseVersion(config.root);
    },

    /**
     * Adds Connect middleware that serves service worker files during
     * development so they can be tested with the Vite dev server.
     *
     * @param server - The Vite dev server instance.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    configureServer(server: any) {
      server.middlewares.use(
        (
          req: { url?: string },
          res: {
            setHeader: (k: string, v: string) => void;
            end: (s: string) => void;
          },
          next: () => void
        ) => {
          if (req.url === '/sw.js') {
            res.setHeader('Content-Type', 'application/javascript');
            res.end(readFileSync(swPath, 'utf-8'));
            return;
          }
          if (
            includeFirebaseMessaging &&
            req.url === '/firebase-messaging-sw.js'
          ) {
            res.setHeader('Content-Type', 'application/javascript');
            res.end(firebaseWorkerSource());
            return;
          }
          next();
        }
      );
    },

    /**
     * Emits service worker files as assets during the Vite build so they
     * appear at the root of the output directory (e.g. `dist/sw.js`).
     */
    generateBundle() {
      (
        this as unknown as {
          emitFile: (f: {
            type: 'asset';
            fileName: string;
            source: string;
          }) => void;
        }
      ).emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: readFileSync(swPath, 'utf-8'),
      });

      if (includeFirebaseMessaging) {
        (
          this as unknown as {
            emitFile: (f: {
              type: 'asset';
              fileName: string;
              source: string;
            }) => void;
          }
        ).emitFile({
          type: 'asset',
          fileName: 'firebase-messaging-sw.js',
          source: firebaseWorkerSource(),
        });
      }
    },
  };
}
