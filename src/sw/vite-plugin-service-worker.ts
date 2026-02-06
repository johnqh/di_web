/**
 * Vite plugin that emits sw.js (and optionally firebase-messaging-sw.js) into build output
 * and serves them during dev.
 *
 * We define a minimal structural return type instead of importing `Plugin` from vite,
 * because when di_web has its own node_modules/vite, the Plugin type from that copy
 * is nominally incompatible with the consuming app's copy (different private fields).
 * Vite accepts our object structurally at runtime regardless.
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

export interface ServiceWorkerPluginOptions {
  /** Include firebase-messaging-sw.js in the output (default: false) */
  includeFirebaseMessaging?: boolean;
}

interface MiddlewareRequest {
  url?: string;
}

interface MiddlewareResponse {
  setHeader: (k: string, v: string) => void;
  end: (s: string) => void;
}

interface ViteDevServer {
  middlewares: {
    use: (
      fn: (
        req: MiddlewareRequest,
        res: MiddlewareResponse,
        next: () => void
      ) => void
    ) => void;
  };
}

interface EmitContext {
  emitFile: (file: { type: string; fileName: string; source: string }) => void;
}

interface VitePlugin {
  name: string;
  configureServer: (server: ViteDevServer) => void;
  generateBundle: (this: EmitContext) => void;
}

export function serviceWorkerPlugin(
  options: ServiceWorkerPluginOptions = {}
): VitePlugin {
  const { includeFirebaseMessaging = false } = options;

  // Resolve paths to the co-located dist/sw/ files
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const swPath = resolve(__dirname, 'sw.js');
  const firebaseSwPath = resolve(__dirname, 'firebase-messaging-sw.js');

  return {
    name: 'sudobility-service-worker',

    configureServer(server: ViteDevServer) {
      server.middlewares.use(
        (req: MiddlewareRequest, res: MiddlewareResponse, next: () => void) => {
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

    generateBundle(this: EmitContext) {
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
