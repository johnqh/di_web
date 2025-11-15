/**
 * Simple storage service singleton
 * No DI container needed - just a direct singleton instance
 */

import type { StorageService } from '@sudobility/di';
import { WebStorageService } from './web-storage.service';
import { StorageType } from '@sudobility/types';

/**
 * Singleton storage service instance
 */
let storageServiceInstance: StorageService | null = null;

/**
 * Initialize the storage service singleton
 * Should be called once at app startup
 */
export function initializeStorageService(): void {
  if (storageServiceInstance) {
    return;
  }

  storageServiceInstance = new WebStorageService(StorageType.LOCAL_STORAGE);
}

/**
 * Get the storage service singleton
 * @throws Error if not initialized
 */
export function getStorageService(): StorageService {
  if (!storageServiceInstance) {
    throw new Error(
      'Storage service not initialized. Call initializeStorageService() at app startup.'
    );
  }
  return storageServiceInstance;
}

/**
 * Reset storage service (for testing only)
 */
export function resetStorageService(): void {
  storageServiceInstance = null;
}
