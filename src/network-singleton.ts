/**
 * Simple network service singleton
 * No DI container needed - just a direct singleton instance
 */

import type { PlatformNetwork } from '@sudobility/di';
import { WebNetworkService } from './web-network.service';

/**
 * Singleton network service instance
 */
let networkServiceInstance: PlatformNetwork | null = null;

/**
 * Initialize the network service singleton
 * Should be called once at app startup
 */
export function initializeNetworkService(): void {
  if (networkServiceInstance) {
    return;
  }

  networkServiceInstance = new WebNetworkService();
}

/**
 * Get the network service singleton
 * @throws Error if not initialized
 */
export function getNetworkService(): PlatformNetwork {
  if (!networkServiceInstance) {
    throw new Error(
      'Network service not initialized. Call initializeNetworkService() at app startup.'
    );
  }
  return networkServiceInstance;
}

/**
 * Reset network service (for testing only)
 */
export function resetNetworkService(): void {
  if (networkServiceInstance && 'destroy' in networkServiceInstance) {
    (networkServiceInstance as WebNetworkService).destroy();
  }
  networkServiceInstance = null;
}
