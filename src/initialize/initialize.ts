/**
 * @fileoverview Centralized web app initialization
 * @description Provides a single initialization function for web apps
 * that sets up all DI services in the correct order.
 */

import {
  initializeStorageService,
  initializeNetworkService,
  initializeFirebaseService,
  FirebaseAnalyticsService,
  initializeFirebaseAnalytics,
  getAnalyticsService,
  resetAnalyticsService,
  type FirebaseConfig,
  type AnalyticsEventParams,
} from '@sudobility/di/web';
import { initializeInfoService } from '../info/index.js';

// Re-export analytics types and functions from di for convenience
export {
  FirebaseAnalyticsService,
  initializeFirebaseAnalytics,
  getAnalyticsService,
  resetAnalyticsService,
  type AnalyticsEventParams,
};

// ============================================================================
// Web App Initialization
// ============================================================================

/**
 * RevenueCat configuration
 */
export interface RevenueCatConfig {
  /** RevenueCat API key (production) */
  apiKey: string;

  /** RevenueCat API key (sandbox) - optional, uses production key if not provided */
  apiKeySandbox?: string;

  /** Whether we're in production mode (affects which key to use) */
  isProduction?: boolean;

  /** Free tier package configuration */
  freeTierPackage?: { packageId: string; name: string };
}

/**
 * Configuration options for web app initialization
 */
export interface WebAppInitOptions {
  /** Firebase configuration */
  firebaseConfig: FirebaseConfig;

  /** RevenueCat configuration - if provided, enables RevenueCat */
  revenueCatConfig?: RevenueCatConfig;

  /** Optional: Initialize i18n (app-specific, pass your initializeI18n function) */
  initializeI18n?: () => void;

  /** Optional: Register service worker. Pass `true` to use the shared implementation, or a function for custom behavior. */
  registerServiceWorker?: boolean | (() => void);

  /** Optional: Initialize web vitals (app-specific, pass your function) */
  initWebVitals?: () => void;
}

/**
 * Initialize a web application with all required DI services.
 *
 * This function sets up services in the correct order:
 * 1. Storage service
 * 2. Firebase DI service (analytics, remote config, etc.)
 * 3. Firebase Analytics singleton
 * 4. Network service
 * 5. Info service
 * 6. Subscription/RevenueCat (if config provided)
 * 7. i18n (if provided)
 * 8. Performance monitoring (if provided)
 *
 * Note: Firebase Auth is NOT initialized here. Apps using Firebase Auth should
 * call initializeFirebaseAuth() from @sudobility/auth_lib separately, or use
 * SudobilityAppWithFirebaseAuth from @sudobility/building_blocks which handles this.
 *
 * @param options - Configuration options
 * @returns The initialized analytics service
 */
export async function initializeWebApp(
  options: WebAppInitOptions
): Promise<FirebaseAnalyticsService> {
  const {
    firebaseConfig,
    revenueCatConfig,
    initializeI18n,
    registerServiceWorker,
    initWebVitals,
  } = options;

  // 1. Initialize storage service
  initializeStorageService();

  // 2. Initialize Firebase DI service (analytics, remote config, etc.)
  initializeFirebaseService(firebaseConfig);

  // 3. Initialize Firebase Analytics singleton
  const analytics = initializeFirebaseAnalytics();

  // 4. Initialize network service (for online/offline status detection)
  // Note: For authenticated API calls, apps should use FirebaseAuthNetworkService directly
  // from @sudobility/auth_lib, which provides automatic token refresh on 401 responses.
  initializeNetworkService();

  // 5. Initialize info service
  initializeInfoService();

  // 6. Initialize RevenueCat subscription (if config provided)
  if (revenueCatConfig) {
    try {
      const subscriptionLib = await import('@sudobility/subscription_lib');
      const isProduction = revenueCatConfig.isProduction ?? true;
      const apiKey = isProduction
        ? revenueCatConfig.apiKey
        : revenueCatConfig.apiKeySandbox || revenueCatConfig.apiKey;

      subscriptionLib.configureRevenueCatAdapter(apiKey);
      subscriptionLib.initializeSubscription({
        adapter: subscriptionLib.createRevenueCatAdapter(),
        freeTier: revenueCatConfig.freeTierPackage ?? {
          packageId: 'free',
          name: 'Free',
        },
      });
    } catch (error) {
      console.error(
        'Failed to initialize RevenueCat. Make sure @sudobility/subscription_lib is installed.',
        error
      );
    }
  }

  // 7. Initialize i18n (app-specific)
  if (initializeI18n) {
    initializeI18n();
  }

  // 8. Initialize performance monitoring (app-specific)
  if (registerServiceWorker === true) {
    const { registerServiceWorker: register } =
      await import('../sw/register.js');
    register();
  } else if (typeof registerServiceWorker === 'function') {
    registerServiceWorker();
  }
  if (initWebVitals) {
    initWebVitals();
  }

  return analytics;
}
