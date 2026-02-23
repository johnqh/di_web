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
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

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

  return {
    name: 'sudobility-service-worker' as const,

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
            res.end(readFileSync(firebaseSwPath, 'utf-8'));
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
          source: readFileSync(firebaseSwPath, 'utf-8'),
        });
      }
    },
  };
}
