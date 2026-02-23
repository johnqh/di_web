import { describe, it, expect, vi, beforeEach } from 'vitest';
import { serviceWorkerPlugin } from '../src/sw/vite-plugin-service-worker.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Invoke the plugin's `generateBundle` hook, collecting all emitted files
 * into a record keyed by fileName.
 */
function runGenerateBundle(
  plugin: ReturnType<typeof serviceWorkerPlugin>
): Record<string, { type: string; fileName: string; source: string }> {
  const emitted: Record<
    string,
    { type: string; fileName: string; source: string }
  > = {};

  const ctx = {
    emitFile(file: { type: string; fileName: string; source: string }) {
      emitted[file.fileName] = file;
    },
  };

  // `generateBundle` uses `this.emitFile`, so call it with the mock context
  plugin.generateBundle.call(ctx as never);
  return emitted;
}

/**
 * Invoke the plugin's `configureServer` hook and return a helper to
 * fire fake HTTP requests against the middleware.
 */
function setupDevServer(plugin: ReturnType<typeof serviceWorkerPlugin>) {
  type Middleware = (
    req: { url?: string },
    res: {
      setHeader: (k: string, v: string) => void;
      end: (s: string) => void;
    },
    next: () => void
  ) => void;

  let middleware: Middleware | undefined;

  const mockServer = {
    middlewares: {
      use(fn: Middleware) {
        middleware = fn;
      },
    },
  };

  plugin.configureServer(mockServer);

  return {
    /**
     * Simulate an incoming request to the dev middleware.
     *
     * @returns `{ body, contentType }` if the middleware responded, or
     *          `null` if it called `next()`.
     */
    request(url: string) {
      let body: string | undefined;
      let contentType: string | undefined;
      let calledNext = false;

      const res = {
        setHeader(_k: string, v: string) {
          contentType = v;
        },
        end(s: string) {
          body = s;
        },
      };

      middleware!({ url }, res, () => {
        calledNext = true;
      });

      if (calledNext) {
        return null;
      }
      return { body, contentType };
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('serviceWorkerPlugin', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('has the correct plugin name', () => {
    const plugin = serviceWorkerPlugin();
    expect(plugin.name).toBe('sudobility-service-worker');
  });

  // -----------------------------------------------------------------------
  // generateBundle (production build)
  // -----------------------------------------------------------------------

  describe('generateBundle', () => {
    it('emits sw.js by default', () => {
      const plugin = serviceWorkerPlugin();
      const emitted = runGenerateBundle(plugin);

      expect(emitted['sw.js']).toBeDefined();
      expect(emitted['sw.js']!.type).toBe('asset');
      expect(emitted['sw.js']!.source).toContain('sudobility');
    });

    it('does NOT emit firebase-messaging-sw.js by default', () => {
      const plugin = serviceWorkerPlugin();
      const emitted = runGenerateBundle(plugin);

      expect(emitted['firebase-messaging-sw.js']).toBeUndefined();
    });

    it('emits firebase-messaging-sw.js when includeFirebaseMessaging is true', () => {
      const plugin = serviceWorkerPlugin({ includeFirebaseMessaging: true });
      const emitted = runGenerateBundle(plugin);

      expect(emitted['firebase-messaging-sw.js']).toBeDefined();
      expect(emitted['firebase-messaging-sw.js']!.type).toBe('asset');
      expect(emitted['firebase-messaging-sw.js']!.source).toContain(
        'firebase'
      );
    });

    it('always emits sw.js even when includeFirebaseMessaging is true', () => {
      const plugin = serviceWorkerPlugin({ includeFirebaseMessaging: true });
      const emitted = runGenerateBundle(plugin);

      expect(emitted['sw.js']).toBeDefined();
      expect(emitted['firebase-messaging-sw.js']).toBeDefined();
    });
  });

  // -----------------------------------------------------------------------
  // configureServer (development)
  // -----------------------------------------------------------------------

  describe('configureServer', () => {
    it('serves sw.js in dev mode', () => {
      const plugin = serviceWorkerPlugin();
      const dev = setupDevServer(plugin);

      const result = dev.request('/sw.js');
      expect(result).not.toBeNull();
      expect(result!.contentType).toBe('application/javascript');
      expect(result!.body).toContain('sudobility');
    });

    it('calls next() for unknown paths', () => {
      const plugin = serviceWorkerPlugin();
      const dev = setupDevServer(plugin);

      const result = dev.request('/unknown.js');
      expect(result).toBeNull(); // next() was called
    });

    it('does NOT serve firebase-messaging-sw.js by default', () => {
      const plugin = serviceWorkerPlugin();
      const dev = setupDevServer(plugin);

      const result = dev.request('/firebase-messaging-sw.js');
      expect(result).toBeNull(); // next() was called
    });

    it('serves firebase-messaging-sw.js when includeFirebaseMessaging is true', () => {
      const plugin = serviceWorkerPlugin({ includeFirebaseMessaging: true });
      const dev = setupDevServer(plugin);

      const result = dev.request('/firebase-messaging-sw.js');
      expect(result).not.toBeNull();
      expect(result!.contentType).toBe('application/javascript');
      expect(result!.body).toContain('firebase');
    });
  });
});
