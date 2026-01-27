/**
 * Web implementation of Firebase services
 * Uses Firebase Web SDK v9+
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAnalytics,
  Analytics,
  logEvent,
  setUserProperties,
  setUserId,
} from 'firebase/analytics';
import {
  getRemoteConfig,
  RemoteConfig,
  fetchAndActivate,
  getValue,
  getAll,
  Value,
} from 'firebase/remote-config';
import {
  getMessaging,
  Messaging,
  getToken,
  onMessage,
  deleteToken,
  isSupported as isMessagingSupported,
} from 'firebase/messaging';

import {
  FirebaseService,
  AnalyticsService,
  RemoteConfigService,
  FCMService,
  FirebaseConfig,
  FirebaseInitOptions,
  RemoteConfigValue,
  FCMMessage,
  FCMPermissionState,
} from './firebase.interface';

// Default configuration
const DEFAULT_OPTIONS: FirebaseInitOptions = {
  enableAnalytics: true,
  enableRemoteConfig: true,
  enableMessaging: true,
  enableDevelopmentMode: false,
};

/**
 * Hash a user ID for privacy-preserving analytics.
 * Uses a simple but consistent hash algorithm suitable for analytics.
 * Returns a 16-character hex string.
 *
 * Note: This uses the same algorithm as the React Native implementation
 * to ensure consistent user IDs across platforms.
 */
function hashUserIdForAnalytics(userId: string): string {
  // Simple hash function - consistent across platforms (web and RN)
  let hash1 = 0;
  let hash2 = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash1 = (hash1 << 5) - hash1 + char;
    hash1 = hash1 & hash1;
    hash2 = (hash2 << 7) - hash2 + char;
    hash2 = hash2 & hash2;
  }
  const hex1 = Math.abs(hash1).toString(16).padStart(8, '0');
  const hex2 = Math.abs(hash2).toString(16).padStart(8, '0');
  return (hex1 + hex2).slice(0, 16);
}

class WebAnalyticsService implements AnalyticsService {
  constructor(private analytics: Analytics | null) {}

  logEvent(eventName: string, parameters?: Record<string, unknown>): void {
    if (this.analytics && this.isSupported()) {
      try {
        logEvent(this.analytics, eventName, parameters);
      } catch (error) {
        console.error('Error logging analytics event:', error);
      }
    }
  }

  setUserProperties(properties: Record<string, string>): void {
    if (this.analytics && this.isSupported()) {
      try {
        setUserProperties(this.analytics, properties);
      } catch (error) {
        console.error('Error setting user properties:', error);
      }
    }
  }

  setUserId(userId: string): void {
    if (this.analytics && this.isSupported()) {
      try {
        // Hash the user ID for privacy before sending to analytics
        const hashedId = hashUserIdForAnalytics(userId);
        setUserId(this.analytics, hashedId);
        // Also set as a user property for easier querying
        setUserProperties(this.analytics, { user_hash: hashedId });
      } catch (error) {
        console.error('Error setting user ID:', error);
      }
    }
  }

  isSupported(): boolean {
    return typeof window !== 'undefined' && this.analytics !== null;
  }
}

class WebRemoteConfigValue implements RemoteConfigValue {
  constructor(private value: Value) {}

  asBoolean(): boolean {
    return this.value.asBoolean();
  }

  asString(): string {
    return this.value.asString();
  }

  asNumber(): number {
    return this.value.asNumber();
  }

  getSource(): 'static' | 'default' | 'remote' {
    return this.value.getSource() as 'static' | 'default' | 'remote';
  }
}

class WebRemoteConfigService implements RemoteConfigService {
  constructor(private remoteConfig: RemoteConfig | null) {}

  async fetchAndActivate(): Promise<boolean> {
    if (this.remoteConfig && this.isSupported()) {
      try {
        return await fetchAndActivate(this.remoteConfig);
      } catch (error) {
        console.error('Error fetching and activating remote config:', error);
        return false;
      }
    }
    return false;
  }

  getValue(key: string): RemoteConfigValue {
    if (this.remoteConfig && this.isSupported()) {
      try {
        const value = getValue(this.remoteConfig, key);
        return new WebRemoteConfigValue(value);
      } catch (error) {
        console.error('Error getting remote config value:', error);
      }
    }

    // Return default value if not available
    return new WebRemoteConfigValue({
      asBoolean: () => false,
      asString: () => '',
      asNumber: () => 0,
      getSource: () => 'default',
    } as Value);
  }

  getAll(): Record<string, RemoteConfigValue> {
    if (this.remoteConfig && this.isSupported()) {
      try {
        const allValues = getAll(this.remoteConfig);
        const result: Record<string, RemoteConfigValue> = {};

        for (const [key, value] of Object.entries(allValues)) {
          result[key] = new WebRemoteConfigValue(value);
        }

        return result;
      } catch (error) {
        console.error('Error getting all remote config values:', error);
      }
    }
    return {};
  }

  isSupported(): boolean {
    return this.remoteConfig !== null;
  }
}

class WebFCMService implements FCMService {
  private unsubscribe?: () => void;

  constructor(
    private messaging: Messaging | null,
    private vapidKey: string
  ) {}

  async requestPermission(): Promise<boolean> {
    if (
      !this.isSupported() ||
      typeof window === 'undefined' ||
      !('Notification' in window)
    ) {
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  async getToken(): Promise<string | null> {
    if (!this.messaging || !this.isSupported()) {
      return null;
    }

    try {
      if (Notification.permission === 'granted') {
        const token = await getToken(this.messaging, {
          vapidKey: this.vapidKey,
        });
        return token || null;
      }
    } catch (error) {
      console.error('Error getting FCM token:', error);
    }
    return null;
  }

  async deleteToken(): Promise<boolean> {
    if (!this.messaging || !this.isSupported()) {
      return false;
    }

    try {
      return await deleteToken(this.messaging);
    } catch (error) {
      console.error('Error deleting FCM token:', error);
      return false;
    }
  }

  onMessage(callback: (message: FCMMessage) => void): () => void {
    if (!this.messaging || !this.isSupported()) {
      return () => {};
    }

    try {
      this.unsubscribe = onMessage(this.messaging, (payload) => {
        const message: FCMMessage = {
          ...(payload.notification && { notification: payload.notification }),
          ...(payload.data && { data: payload.data }),
          ...(payload.messageId && { messageId: payload.messageId }),
          ...(payload.from && { from: payload.from }),
          ...(payload.collapseKey && { collapseKey: payload.collapseKey }),
        };
        callback(message);
      });

      const cleanup = (): void => {
        if (this.unsubscribe) {
          this.unsubscribe();
          delete this.unsubscribe;
        }
      };
      return cleanup;
    } catch (error) {
      console.error('Error setting up FCM message listener:', error);
      return () => {};
    }
  }

  isSupported(): boolean {
    return typeof window !== 'undefined' && this.messaging !== null;
  }

  getPermissionStatus(): FCMPermissionState {
    if (
      !this.isSupported() ||
      typeof window === 'undefined' ||
      !('Notification' in window)
    ) {
      return { status: 'denied', token: null };
    }

    return {
      status: Notification.permission,
      token: null, // Token is fetched separately
    };
  }
}

export class WebFirebaseService implements FirebaseService {
  public analytics: AnalyticsService;
  public remoteConfig: RemoteConfigService;
  public messaging: FCMService;

  private app: FirebaseApp | null = null;
  private config: FirebaseConfig;
  private options: FirebaseInitOptions;
  private configured: boolean = false;

  constructor(config: FirebaseConfig, options: FirebaseInitOptions = {}) {
    this.config = config;
    this.options = { ...DEFAULT_OPTIONS, ...options };

    // Initialize Firebase
    this.initializeFirebase();

    // Initialize services
    this.analytics = new WebAnalyticsService(this.initializeAnalytics());
    this.remoteConfig = new WebRemoteConfigService(
      this.initializeRemoteConfig()
    );
    this.messaging = new WebFCMService(null, config.vapidKey || '');
    this.initializeMessaging()
      .then((messaging) => {
        if (messaging) {
          this.messaging = new WebFCMService(messaging, config.vapidKey || '');
        }
      })
      .catch(console.error);
  }

  private initializeFirebase(): void {
    try {
      // Validate configuration
      const requiredFields = [
        'apiKey',
        'authDomain',
        'projectId',
        'storageBucket',
        'messagingSenderId',
        'appId',
      ];
      const missingFields = requiredFields.filter(
        (field) => !this.config[field as keyof FirebaseConfig]
      );

      if (missingFields.length > 0) {
        this.configured = false;
        return;
      }

      // Initialize app (avoid duplicate initialization)
      this.app =
        getApps().length === 0
          ? initializeApp(this.config as unknown as Record<string, unknown>)
          : getApp();
      this.configured = true;
    } catch (error) {
      console.error('Error initializing Firebase:', error);
      this.configured = false;
    }
  }

  private initializeAnalytics(): Analytics | null {
    if (
      !this.app ||
      !this.options.enableAnalytics ||
      typeof window === 'undefined'
    ) {
      return null;
    }

    try {
      return getAnalytics(this.app);
    } catch (error) {
      console.error('Error initializing Analytics:', error);
      return null;
    }
  }

  private initializeRemoteConfig(): RemoteConfig | null {
    if (!this.app || !this.options.enableRemoteConfig) {
      return null;
    }

    try {
      return getRemoteConfig(this.app);
    } catch (error) {
      console.error('Error initializing Remote Config:', error);
      return null;
    }
  }

  private async initializeMessaging(): Promise<Messaging | null> {
    if (
      !this.app ||
      !this.options.enableMessaging ||
      typeof window === 'undefined'
    ) {
      return null;
    }

    try {
      // Check if messaging is supported first
      return new Promise<Messaging | null>((resolve) => {
        isMessagingSupported()
          .then((supported) => {
            if (supported) {
              try {
                const messaging = getMessaging(this.app!);
                resolve(messaging);
              } catch (error) {
                console.error('Error getting messaging instance:', error);
                resolve(null);
              }
            } else {
              resolve(null);
            }
          })
          .catch(() => {
            resolve(null);
          });
      }); // Type assertion removed
    } catch (error) {
      console.error('Error initializing messaging:', error);
      return null;
    }
  }

  isConfigured(): boolean {
    return this.configured;
  }

  isDevelopment(): boolean {
    return this.options.enableDevelopmentMode || !this.configured;
  }
}

/**
 * Create a web Firebase service instance
 */
export function createWebFirebaseService(
  config: FirebaseConfig,
  options?: FirebaseInitOptions
): FirebaseService {
  return new WebFirebaseService(config, options);
}

// Singleton management
let firebaseService: WebFirebaseService | null = null;

export function getFirebaseService(): WebFirebaseService {
  if (!firebaseService) {
    throw new Error(
      'Firebase service not initialized. Call initializeFirebaseService() first.'
    );
  }
  return firebaseService;
}

export function initializeFirebaseService(
  config: FirebaseConfig,
  options?: FirebaseInitOptions
): WebFirebaseService {
  firebaseService = new WebFirebaseService(config, options);
  return firebaseService;
}

export function resetFirebaseService(): void {
  firebaseService = null;
}
