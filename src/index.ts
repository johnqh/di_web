/**
 * @sudobility/di_web
 * Web implementations of dependency injection services for Sudobility
 *
 * This package provides pure web implementations that depend only on:
 * - @sudobility/di (DI interfaces)
 * - @sudobility/types (type definitions)
 * - firebase (Firebase SDK)
 *
 * All configuration should be passed from the consuming application.
 */

// Export Firebase service and interfaces
export * from './firebase/firebase.interface';
export {
  WebFirebaseService,
  createWebFirebaseService,
} from './firebase/firebase.web';

// Export navigation service and types
export * from './types/ui-navigation';
export {
  WebUINavigationService,
  createWebUINavigationService,
  webNavigationHelpers,
} from './navigation/navigation.web';

// Export network implementations
export { WebNetworkClient, webNetworkClient } from './network/network.web';
export { WebNetworkService } from './web-network.service';
export {
  getNetworkService,
  initializeNetworkService,
  resetNetworkService,
} from './network-singleton';

// Export storage implementations
export {
  WebStorage,
  AdvancedWebStorage,
  webStorage,
  advancedWebStorage,
} from './storage/storage.web';
export {
  WebStorageService,
  WebSerializedStorageService,
} from './storage/web-storage.service';
export {
  getStorageService,
  initializeStorageService,
  resetStorageService,
} from './storage/storage-singleton';
