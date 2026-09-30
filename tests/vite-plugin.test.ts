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

// ---------------------------------------------------------------------------
// Firebase messaging worker rendering
// ---------------------------------------------------------------------------

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { runInNewContext } from 'vm';
import {
  DEFAULT_FIREBASE_SDK_VERSION,
  renderFirebaseMessagingWorker,
} from '../src/sw/vite-plugin-service-worker.js';

const RAW_WORKER = readFileSync(
  resolve(__dirname, '../src/sw/firebase-messaging-sw.js'),
  'utf-8'
);

const FULL_ENV = {
  VITE_FIREBASE_API_KEY: 'AIza-test',
  VITE_FIREBASE_AUTH_DOMAIN: 'app.firebaseapp.com',
  VITE_FIREBASE_PROJECT_ID: 'app',
  VITE_FIREBASE_STORAGE_BUCKET: 'app.appspot.com',
  VITE_FIREBASE_MESSAGING_SENDER_ID: '123',
  VITE_FIREBASE_APP_ID: '1:123:web:abc',
  VITE_FIREBASE_MEASUREMENT_ID: 'G-TEST',
};

/** Execute a rendered worker against a fake service-worker global scope. */
function runWorker(source: string) {
  const imported: string[] = [];
  const listeners: Record<string, unknown> = {};
  const warnings: unknown[] = [];
  let initializedWith: unknown = null;
  let backgroundHandler: unknown = null;
  const firebase = {
    apps: [] as unknown[],
    initializeApp(config: unknown) {
      initializedWith = config;
      firebase.apps.push(config);
    },
    messaging() {
      return {
        onBackgroundMessage(handler: unknown) {
          backgroundHandler = handler;
        },
      };
    },
  };
  runInNewContext(source, {
    importScripts: (url: string) => imported.push(url),
    firebase,
    self: {
      addEventListener: (type: string, fn: unknown) => (listeners[type] = fn),
      registration: { showNotification: () => undefined },
      location: { origin: 'https://app.test' },
    },
    clients: {},
    console: { warn: (...args: unknown[]) => warnings.push(args), log: () => undefined },
  });
  return { imported, listeners, warnings, initializedWith, backgroundHandler };
}

describe('renderFirebaseMessagingWorker', () => {
  it('replaces every process.env reference and the SDK version', () => {
    const out = renderFirebaseMessagingWorker(RAW_WORKER, FULL_ENV, '12.8.0');
    expect(out).not.toMatch(/process\.env\.VITE_[A-Z]/);
    expect(out).not.toContain('__FIREBASE_SDK_VERSION__');
    expect(out).toContain('"AIza-test"');
    expect(out).toContain('firebasejs/12.8.0/firebase-messaging-compat.js');
  });

  it('produces a worker that initializes FCM with the app config', () => {
    const run = runWorker(renderFirebaseMessagingWorker(RAW_WORKER, FULL_ENV, '12.8.0'));
    expect(run.imported).toEqual([
      'https://www.gstatic.com/firebasejs/12.8.0/firebase-app-compat.js',
      'https://www.gstatic.com/firebasejs/12.8.0/firebase-messaging-compat.js',
    ]);
    expect(run.initializedWith).toMatchObject({ apiKey: 'AIza-test', appId: '1:123:web:abc' });
    expect(typeof run.backgroundHandler).toBe('function');
    expect(run.warnings).toEqual([]);
  });

  it('produces a worker that installs without throwing when config is missing', () => {
    const run = runWorker(renderFirebaseMessagingWorker(RAW_WORKER, {}, DEFAULT_FIREBASE_SDK_VERSION));
    expect(run.initializedWith).toBeNull();
    expect(run.backgroundHandler).toBeNull();
    expect(run.warnings).toHaveLength(1);
    expect(Object.keys(run.listeners)).toEqual(
      expect.arrayContaining(['notificationclick', 'push'])
    );
  });

  it('the unrendered worker would have thrown: it references process', () => {
    expect(RAW_WORKER).toContain('process.env.VITE_FIREBASE_API_KEY');
    expect(() => runWorker(RAW_WORKER.replace(/__FIREBASE_SDK_VERSION__/g, '12.8.0'))).toThrow(
      /process is not defined/
    );
  });
});

describe('serviceWorkerPlugin env wiring', () => {
  it('uses the Vite env captured in configResolved for build and dev', () => {
    const plugin = serviceWorkerPlugin({ includeFirebaseMessaging: true });
    plugin.configResolved({ root: resolve(__dirname, '..'), env: FULL_ENV });
    const emitted = runGenerateBundle(plugin);
    const source = emitted['firebase-messaging-sw.js']!.source;
    expect(source).not.toMatch(/process\.env\.VITE_[A-Z]/);
    expect(source).toContain('"123"');
    expect(source).toMatch(/firebasejs\/\d+\.\d+\.\d+\//);
  });
});
