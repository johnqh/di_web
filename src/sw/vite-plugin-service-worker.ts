/**
 * Vite plugin that emits sw.js (and optionally firebase-messaging-sw.js) into build output
 * and serves them during dev.
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

export interface ServiceWorkerPluginOptions {
  /** Include firebase-messaging-sw.js in the output (default: false) */
  includeFirebaseMessaging?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function serviceWorkerPlugin(options: ServiceWorkerPluginOptions = {}): any {
  const { includeFirebaseMessaging = false } = options;

  // Resolve paths to the co-located dist/sw/ files
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const swPath = resolve(__dirname, 'sw.js');
  const firebaseSwPath = resolve(__dirname, 'firebase-messaging-sw.js');

  return {
    name: 'sudobility-service-worker',

    configureServer(server: { middlewares: { use: (fn: (req: { url?: string }, res: { setHeader: (k: string, v: string) => void; end: (s: string) => void }, next: () => void) => void) => void } }) {
      server.middlewares.use((req: { url?: string }, res: { setHeader: (k: string, v: string) => void; end: (s: string) => void }, next: () => void) => {
        if (req.url === '/sw.js') {
          res.setHeader('Content-Type', 'application/javascript');
          res.end(readFileSync(swPath, 'utf-8'));
          return;
        }
        if (includeFirebaseMessaging && req.url === '/firebase-messaging-sw.js') {
          res.setHeader('Content-Type', 'application/javascript');
          res.end(readFileSync(firebaseSwPath, 'utf-8'));
          return;
        }
        next();
      });
    },

    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: readFileSync(swPath, 'utf-8'),
      });

      if (includeFirebaseMessaging) {
        this.emitFile({
          type: 'asset',
          fileName: 'firebase-messaging-sw.js',
          source: readFileSync(firebaseSwPath, 'utf-8'),
        });
      }
    },
  };
}
