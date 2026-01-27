/**
 * @sudobility/di_web
 * Web implementations of dependency injection services for Sudobility
 *
 * This package provides web implementations that depend on:
 * - @sudobility/di (DI interfaces)
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
  // Analytics service
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

// Export Firebase service (moved from @sudobility/di)
export {
  getFirebaseService,
  initializeFirebaseService,
  resetFirebaseService,
  WebFirebaseService,
  createWebFirebaseService,
} from './firebase/firebase.web.js';

// Export Firebase interfaces and types
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
} from './firebase/firebase.interface.js';
