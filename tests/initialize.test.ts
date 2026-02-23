import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks -- must be declared before importing the module under test
// ---------------------------------------------------------------------------

const mockAnalyticsService = {
  logEvent: vi.fn(),
  setUserId: vi.fn(),
  setUserProperties: vi.fn(),
};

// Mock @sudobility/di/web (subpath export)
vi.mock('@sudobility/di/web', () => ({
  initializeStorageService: vi.fn(),
  initializeFirebaseService: vi.fn(),
  initializeFirebaseAnalytics: vi.fn(() => mockAnalyticsService),
  initializeNetworkService: vi.fn(),
  getAnalyticsService: vi.fn(() => mockAnalyticsService),
  resetAnalyticsService: vi.fn(),
  FirebaseAnalyticsService: vi.fn(),
}));

// Mock @sudobility/di/info (used by info.web.ts)
vi.mock('@sudobility/di/info', () => ({
  initializeInfoService: vi.fn(),
}));

// Mock @sudobility/di -- must include all exports that any subpath re-exports,
// because vitest may resolve subpath imports through the parent package.
vi.mock('@sudobility/di', () => ({
  initializeInfoService: vi.fn(),
  initializeStorageService: vi.fn(),
  initializeFirebaseService: vi.fn(),
  initializeFirebaseAnalytics: vi.fn(() => mockAnalyticsService),
  initializeNetworkService: vi.fn(),
  getAnalyticsService: vi.fn(() => mockAnalyticsService),
  resetAnalyticsService: vi.fn(),
  FirebaseAnalyticsService: vi.fn(),
}));

// Mock the local info service
vi.mock('../src/info/index.js', () => ({
  initializeInfoService: vi.fn(),
}));

// Mock the service worker register module
vi.mock('../src/sw/register.js', () => ({
  registerServiceWorker: vi.fn(),
}));

// Mock subscription_lib (dynamically imported)
const mockConfigureAdapter = vi.fn();
const mockInitSubscription = vi.fn();
const mockCreateAdapter = vi.fn(() => ({ type: 'revenuecat' }));

vi.mock('@sudobility/subscription_lib', () => ({
  configureRevenueCatAdapter: mockConfigureAdapter,
  initializeSubscription: mockInitSubscription,
  createRevenueCatAdapter: mockCreateAdapter,
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { initializeWebApp } from '../src/initialize/initialize.js';
import {
  initializeStorageService,
  initializeFirebaseService,
  initializeFirebaseAnalytics,
  initializeNetworkService,
} from '@sudobility/di/web';
import { initializeInfoService } from '../src/info/index.js';
import { registerServiceWorker as registerSW } from '../src/sw/register.js';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('initializeWebApp', () => {
  const firebaseConfig = {
    apiKey: 'test-key',
    authDomain: 'test.firebaseapp.com',
    projectId: 'test-project',
    storageBucket: 'test.appspot.com',
    messagingSenderId: '123',
    appId: '1:123:web:abc',
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initialises all core services in order', async () => {
    const callOrder: string[] = [];
    vi.mocked(initializeStorageService).mockImplementation(() => {
      callOrder.push('storage');
    });
    vi.mocked(initializeFirebaseService).mockImplementation(() => {
      callOrder.push('firebase');
    });
    vi.mocked(initializeFirebaseAnalytics).mockImplementation(() => {
      callOrder.push('analytics');
      return mockAnalyticsService as never;
    });
    vi.mocked(initializeNetworkService).mockImplementation(() => {
      callOrder.push('network');
    });
    vi.mocked(initializeInfoService).mockImplementation(() => {
      callOrder.push('info');
    });

    await initializeWebApp({ firebaseConfig });

    expect(callOrder).toEqual([
      'storage',
      'firebase',
      'analytics',
      'network',
      'info',
    ]);
  });

  it('returns the analytics service', async () => {
    const result = await initializeWebApp({ firebaseConfig });
    expect(result).toBeDefined();
    expect(initializeFirebaseAnalytics).toHaveBeenCalledOnce();
  });

  it('passes firebaseConfig to initializeFirebaseService', async () => {
    await initializeWebApp({ firebaseConfig });
    expect(initializeFirebaseService).toHaveBeenCalledWith(firebaseConfig);
  });

  // -----------------------------------------------------------------------
  // RevenueCat
  // -----------------------------------------------------------------------

  it('initialises RevenueCat when revenueCatConfig is provided', async () => {
    await initializeWebApp({
      firebaseConfig,
      revenueCatConfig: { apiKey: 'rc-prod-key' },
    });

    expect(mockConfigureAdapter).toHaveBeenCalledWith('rc-prod-key');
    expect(mockCreateAdapter).toHaveBeenCalledOnce();
    expect(mockInitSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        freeTier: { packageId: 'free', name: 'Free' },
      })
    );
  });

  it('uses sandbox key when isProduction is false', async () => {
    await initializeWebApp({
      firebaseConfig,
      revenueCatConfig: {
        apiKey: 'rc-prod-key',
        apiKeySandbox: 'rc-sandbox-key',
        isProduction: false,
      },
    });

    expect(mockConfigureAdapter).toHaveBeenCalledWith('rc-sandbox-key');
  });

  it('falls back to production key if sandbox key is missing and isProduction is false', async () => {
    await initializeWebApp({
      firebaseConfig,
      revenueCatConfig: {
        apiKey: 'rc-prod-key',
        isProduction: false,
      },
    });

    expect(mockConfigureAdapter).toHaveBeenCalledWith('rc-prod-key');
  });

  it('uses custom freeTierPackage when provided', async () => {
    await initializeWebApp({
      firebaseConfig,
      revenueCatConfig: {
        apiKey: 'rc-prod-key',
        freeTierPackage: { packageId: 'basic', name: 'Basic' },
      },
    });

    expect(mockInitSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        freeTier: { packageId: 'basic', name: 'Basic' },
      })
    );
  });

  it('retries RevenueCat initialization on failure', async () => {
    mockConfigureAdapter
      .mockImplementationOnce(() => {
        throw new Error('fail1');
      })
      .mockImplementationOnce(() => {
        throw new Error('fail2');
      })
      .mockImplementationOnce(() => {
        // success on third attempt
      });

    const onError = vi.fn();

    const promise = initializeWebApp({
      firebaseConfig,
      revenueCatConfig: {
        apiKey: 'rc-prod-key',
        maxRetries: 2,
        onError,
      },
    });

    // Advance past first retry delay (1000 ms)
    await vi.advanceTimersByTimeAsync(1000);
    // Advance past second retry delay (2000 ms)
    await vi.advanceTimersByTimeAsync(2000);

    await promise;

    expect(mockConfigureAdapter).toHaveBeenCalledTimes(3);
    expect(onError).not.toHaveBeenCalled();
  });

  it('calls onError after all RevenueCat retries exhausted', async () => {
    mockConfigureAdapter.mockImplementation(() => {
      throw new Error('always fails');
    });

    const onError = vi.fn();

    const promise = initializeWebApp({
      firebaseConfig,
      revenueCatConfig: {
        apiKey: 'rc-prod-key',
        maxRetries: 1,
        onError,
      },
    });

    // Advance past retry delay (1000 ms)
    await vi.advanceTimersByTimeAsync(1000);

    await promise;

    expect(mockConfigureAdapter).toHaveBeenCalledTimes(2);
    expect(onError).toHaveBeenCalledOnce();
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });

  it('does not block startup when lazy is true', async () => {
    mockConfigureAdapter.mockImplementation(() => {
      // synchronous success
    });

    await initializeWebApp({
      firebaseConfig,
      revenueCatConfig: {
        apiKey: 'rc-prod-key',
        lazy: true,
      },
    });

    // The function should have returned; RC init runs in background
    // Allow microtasks to settle
    await vi.advanceTimersByTimeAsync(0);

    expect(mockConfigureAdapter).toHaveBeenCalledWith('rc-prod-key');
  });

  it('skips RevenueCat when config is not provided', async () => {
    await initializeWebApp({ firebaseConfig });

    expect(mockConfigureAdapter).not.toHaveBeenCalled();
    expect(mockInitSubscription).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // i18n
  // -----------------------------------------------------------------------

  it('calls initializeI18n when provided', async () => {
    const initI18n = vi.fn();
    await initializeWebApp({ firebaseConfig, initializeI18n: initI18n });
    expect(initI18n).toHaveBeenCalledOnce();
  });

  it('does not call initializeI18n when not provided', async () => {
    // Just making sure it does not throw
    await initializeWebApp({ firebaseConfig });
  });

  // -----------------------------------------------------------------------
  // Service Worker
  // -----------------------------------------------------------------------

  it('registers the shared service worker when registerServiceWorker is true', async () => {
    await initializeWebApp({
      firebaseConfig,
      registerServiceWorker: true,
    });

    expect(registerSW).toHaveBeenCalledOnce();
  });

  it('calls custom registerServiceWorker function when provided', async () => {
    const customRegister = vi.fn();
    await initializeWebApp({
      firebaseConfig,
      registerServiceWorker: customRegister,
    });

    expect(customRegister).toHaveBeenCalledOnce();
    expect(registerSW).not.toHaveBeenCalled();
  });

  it('does not register service worker when option is not provided', async () => {
    await initializeWebApp({ firebaseConfig });
    expect(registerSW).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // Web Vitals
  // -----------------------------------------------------------------------

  it('calls initWebVitals when provided', async () => {
    const webVitals = vi.fn();
    await initializeWebApp({ firebaseConfig, initWebVitals: webVitals });
    expect(webVitals).toHaveBeenCalledOnce();
  });

  it('does not call initWebVitals when not provided', async () => {
    // Should not throw
    await initializeWebApp({ firebaseConfig });
  });
});
