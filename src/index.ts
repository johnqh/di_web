/**
 * @sudobility/di_web
 * Web implementations of dependency injection services for Sudobility
 *
 * This package provides web implementations that depend on:
 * - @sudobility/di (DI interfaces and Firebase implementations)
 * - @sudobility/types (type definitions)
 * - @sudobility/components (UI components)
 * - react (React framework)
 *
 * All configuration should be passed from the consuming application.
 */

// Export Info service and React components
export {
  WebInfoService,
  createWebInfoService,
  initializeInfoService,
  getInfoService,
  resetInfoService,
  InfoBanner,
  useInfoBanner,
  type BannerState,
  type BannerStateListener,
} from './info/index.js';

// Export Initialize module
export {
  // Analytics service (re-exported from @sudobility/di/web)
  FirebaseAnalyticsService,
  initializeFirebaseAnalytics,
  getAnalyticsService,
  resetAnalyticsService,
  type AnalyticsEventParams,
  // Web app initialization
  initializeWebApp,
  type WebAppInitOptions,
  type RevenueCatConfig,
} from './initialize/index.js';

// Re-export Firebase from @sudobility/di/web for convenience
// This allows existing code importing from di_web to continue working
export {
  getFirebaseService,
  initializeFirebaseService,
  resetFirebaseService,
  WebFirebaseService,
  createWebFirebaseService,
} from '@sudobility/di/web';

// Re-export Firebase interfaces and types from @sudobility/di/web
export type {
  AnalyticsEvent as FirebaseAnalyticsEvent,
  AnalyticsService,
  RemoteConfigValue,
  RemoteConfigService,
  FCMNotificationPayload,
  FCMDataPayload,
  FCMMessage,
  FCMPermissionState,
  FCMState,
  FCMService,
  FirebaseService,
  FirebaseConfig,
  FirebaseInitOptions,
} from '@sudobility/di/web';
