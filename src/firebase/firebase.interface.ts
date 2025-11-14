/**
 * Platform-agnostic Firebase interface
 * Abstracts Firebase services to work across web and React Native
 */

// Analytics Types
export interface AnalyticsEvent {
  name: string;
  parameters?: Record<string, unknown>;
}

export interface AnalyticsService {
  logEvent(eventName: string, parameters?: Record<string, unknown>): void;
  setUserProperties(properties: Record<string, string>): void;
  setUserId(userId: string): void;
  isSupported(): boolean;
}

// Remote Config Types
export interface RemoteConfigValue {
  asBoolean(): boolean;
  asString(): string;
  asNumber(): number;
  getSource(): 'static' | 'default' | 'remote';
}

export interface RemoteConfigService {
  fetchAndActivate(): Promise<boolean>;
  getValue(key: string): RemoteConfigValue;
  getAll(): Record<string, RemoteConfigValue>;
  isSupported(): boolean;
}

// FCM Types
export interface FCMNotificationPayload {
  title?: string;
  body?: string;
  icon?: string;
  badge?: string;
  image?: string;
  tag?: string;
  requireInteraction?: boolean;
}

export interface FCMDataPayload {
  [key: string]: string;
}

export interface FCMMessage {
  notification?: FCMNotificationPayload;
  data?: FCMDataPayload;
  messageId?: string;
  from?: string;
  collapseKey?: string;
}

export interface FCMPermissionState {
  status: 'granted' | 'denied' | 'default';
  token: string | null;
}

export interface FCMState {
  isSupported: boolean;
  permission: FCMPermissionState;
}

export interface FCMService {
  requestPermission(): Promise<boolean>;
  getToken(): Promise<string | null>;
  deleteToken(): Promise<boolean>;
  onMessage(callback: (message: FCMMessage) => void): () => void;
  isSupported(): boolean;
  getPermissionStatus(): FCMPermissionState;
}

// Main Firebase Interface
export interface FirebaseService {
  analytics: AnalyticsService;
  remoteConfig: RemoteConfigService;
  messaging: FCMService;
  isConfigured(): boolean;
  isDevelopment(): boolean;
}

// Firebase Configuration
export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
  vapidKey?: string; // For web push notifications
}

export interface FirebaseInitOptions {
  enableAnalytics?: boolean;
  enableRemoteConfig?: boolean;
  enableMessaging?: boolean;
  enableDevelopmentMode?: boolean;
}
