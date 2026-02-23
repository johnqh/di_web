import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  registerServiceWorker,
  unregisterServiceWorker,
  type ServiceWorkerState,
} from '../src/sw/register.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal ServiceWorkerRegistration stub. */
function createMockRegistration(overrides: Record<string, unknown> = {}) {
  return {
    update: vi.fn().mockResolvedValue(undefined),
    unregister: vi.fn().mockResolvedValue(true),
    installing: null as unknown,
    addEventListener: vi.fn(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('registerServiceWorker', () => {
  let originalNavigator: PropertyDescriptor | undefined;
  let originalLocation: PropertyDescriptor | undefined;
  let loadListeners: Array<(...args: unknown[]) => void>;

  beforeEach(() => {
    vi.useFakeTimers();

    // Capture `load` listeners added to window
    loadListeners = [];
    vi.spyOn(window, 'addEventListener').mockImplementation(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (event: string, handler: any) => {
        if (event === 'load') {
          loadListeners.push(handler as (...args: unknown[]) => void);
        }
      }
    );

    // Default: HTTPS + service-worker-capable browser
    originalLocation = Object.getOwnPropertyDescriptor(window, 'location');
    Object.defineProperty(window, 'location', {
      value: { protocol: 'https:', hostname: 'example.com' },
      writable: true,
      configurable: true,
    });

    originalNavigator = Object.getOwnPropertyDescriptor(window, 'navigator');
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();

    if (originalLocation) {
      Object.defineProperty(window, 'location', originalLocation);
    }
    if (originalNavigator) {
      Object.defineProperty(window, 'navigator', originalNavigator);
    }
  });

  /** Provide a `navigator.serviceWorker` with a custom `register` mock. */
  function setServiceWorker(registerFn: (...args: unknown[]) => unknown) {
    Object.defineProperty(window, 'navigator', {
      value: {
        serviceWorker: {
          register: registerFn,
          controller: {},
          ready: Promise.resolve(createMockRegistration()),
        },
      },
      writable: true,
      configurable: true,
    });
  }

  /** Fire the first captured load listener. */
  async function fireLoad() {
    expect(loadListeners.length).toBeGreaterThan(0);
    const handler = loadListeners[0]!;
    await handler();
  }

  // -- Production guard ---------------------------------------------------

  it('does nothing when not in production and forceEnable is not set', () => {
    // import.meta.env.PROD is false in vitest, so no forceEnable means no-op
    const onStateChange = vi.fn();
    registerServiceWorker({ onStateChange });

    expect(onStateChange).not.toHaveBeenCalled();
    expect(loadListeners).toHaveLength(0);
  });

  it('runs when forceEnable is true', () => {
    setServiceWorker(vi.fn().mockResolvedValue(createMockRegistration()));

    registerServiceWorker({ forceEnable: true });

    expect(loadListeners).toHaveLength(1);
  });

  // -- Edge-case guards ---------------------------------------------------

  it('emits "unsupported" when navigator.serviceWorker is absent', () => {
    Object.defineProperty(window, 'navigator', {
      value: {},
      writable: true,
      configurable: true,
    });

    const onStateChange = vi.fn();
    registerServiceWorker({ onStateChange, forceEnable: true });

    expect(onStateChange).toHaveBeenCalledWith('unsupported');
  });

  it('emits "insecure-context" on HTTP (non-localhost)', () => {
    Object.defineProperty(window, 'location', {
      value: { protocol: 'http:', hostname: 'example.com' },
      writable: true,
      configurable: true,
    });
    setServiceWorker(vi.fn());

    const onStateChange = vi.fn();
    registerServiceWorker({ onStateChange, forceEnable: true });

    expect(onStateChange).toHaveBeenCalledWith('insecure-context');
  });

  it('allows http on localhost', () => {
    Object.defineProperty(window, 'location', {
      value: { protocol: 'http:', hostname: 'localhost' },
      writable: true,
      configurable: true,
    });
    setServiceWorker(vi.fn().mockResolvedValue(createMockRegistration()));

    registerServiceWorker({ forceEnable: true });

    expect(loadListeners).toHaveLength(1);
  });

  it('allows http on 127.0.0.1', () => {
    Object.defineProperty(window, 'location', {
      value: { protocol: 'http:', hostname: '127.0.0.1' },
      writable: true,
      configurable: true,
    });
    setServiceWorker(vi.fn().mockResolvedValue(createMockRegistration()));

    const onStateChange = vi.fn();
    registerServiceWorker({ onStateChange, forceEnable: true });

    expect(onStateChange).not.toHaveBeenCalledWith('insecure-context');
    expect(loadListeners).toHaveLength(1);
  });

  // -- Success path -------------------------------------------------------

  it('emits "registering" then "registered" on success', async () => {
    const reg = createMockRegistration();
    setServiceWorker(vi.fn().mockResolvedValue(reg));

    const states: ServiceWorkerState[] = [];
    registerServiceWorker({
      onStateChange: (s) => states.push(s),
      forceEnable: true,
    });

    await fireLoad();

    expect(states).toEqual(['registering', 'registered']);
  });

  // -- Retry logic --------------------------------------------------------

  it('retries on failure with exponential back-off', async () => {
    const reg = createMockRegistration();
    const registerMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('fail1'))
      .mockRejectedValueOnce(new Error('fail2'))
      .mockResolvedValueOnce(reg);
    setServiceWorker(registerMock);

    const states: ServiceWorkerState[] = [];
    registerServiceWorker({
      maxRetries: 2,
      onStateChange: (s) => states.push(s),
      forceEnable: true,
    });

    await fireLoad();

    expect(states).toContain('registering');
    expect(states).toContain('error');

    // Advance past first retry delay (1000 ms)
    await vi.advanceTimersByTimeAsync(1000);

    // Advance past second retry delay (2000 ms)
    await vi.advanceTimersByTimeAsync(2000);

    expect(states).toContain('registered');
    expect(registerMock).toHaveBeenCalledTimes(3);
  });

  it('gives up after maxRetries exhausted', async () => {
    const registerMock = vi.fn().mockRejectedValue(new Error('always fails'));
    setServiceWorker(registerMock);

    const states: ServiceWorkerState[] = [];
    registerServiceWorker({
      maxRetries: 1,
      onStateChange: (s) => states.push(s),
      forceEnable: true,
    });

    await fireLoad();

    // Advance past retry delay (1000 ms)
    await vi.advanceTimersByTimeAsync(1000);

    // Should have tried twice (initial + 1 retry)
    expect(registerMock).toHaveBeenCalledTimes(2);
    // Two 'error' events (one per failure)
    expect(states.filter((s) => s === 'error')).toHaveLength(2);
    expect(states).not.toContain('registered');
  });

  it('defaults maxRetries to 3', async () => {
    const registerMock = vi.fn().mockRejectedValue(new Error('always fails'));
    setServiceWorker(registerMock);

    registerServiceWorker({ forceEnable: true });

    await fireLoad();

    // Advance through all retry delays: 1s + 2s + 4s
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(2000);
    await vi.advanceTimersByTimeAsync(4000);

    // 1 initial + 3 retries = 4 calls
    expect(registerMock).toHaveBeenCalledTimes(4);
  });
});

describe('unregisterServiceWorker', () => {
  let originalNavigator: PropertyDescriptor | undefined;

  beforeEach(() => {
    originalNavigator = Object.getOwnPropertyDescriptor(window, 'navigator');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalNavigator) {
      Object.defineProperty(window, 'navigator', originalNavigator);
    }
  });

  it('returns false when serviceWorker is not available', async () => {
    Object.defineProperty(window, 'navigator', {
      value: {},
      writable: true,
      configurable: true,
    });

    const result = await unregisterServiceWorker();
    expect(result).toBe(false);
  });

  it('calls registration.unregister() and returns true', async () => {
    const mockReg = {
      unregister: vi.fn().mockResolvedValue(true),
    };
    Object.defineProperty(window, 'navigator', {
      value: {
        serviceWorker: {
          ready: Promise.resolve(mockReg),
        },
      },
      writable: true,
      configurable: true,
    });

    const result = await unregisterServiceWorker();
    expect(mockReg.unregister).toHaveBeenCalledOnce();
    expect(result).toBe(true);
  });
});
