/**
 * Web implementation of InfoInterface using Banner component
 *
 * This service manages its own banner state internally and provides
 * a hook for React components to subscribe to state changes.
 *
 * @ai-context Web InfoInterface implementation using Banner component
 * @ai-pattern Singleton service with React subscription
 * @ai-usage Use singleton and render InfoBanner component in app root
 *
 * @example
 * ```tsx
 * // In your app root component:
 * import { InfoBanner } from '@sudobility/di_web';
 * import { initializeInfoService, WebInfoService } from '@sudobility/di_web';
 *
 * // Initialize once at app startup
 * initializeInfoService(new WebInfoService());
 *
 * function App() {
 *   return (
 *     <>
 *       <InfoBanner />
 *       <YourApp />
 *     </>
 *   );
 * }
 *
 * // Anywhere in your app, use the DI singleton:
 * import { getInfoService } from '@sudobility/di';
 * getInfoService().show('Success', 'Data saved', InfoType.SUCCESS);
 * ```
 */

import {
  type InfoInterface,
  initializeInfoService as initializeDiInfoService,
} from '@sudobility/di';
import { InfoType, Optional } from '@sudobility/types';

/**
 * Banner state managed by the service
 */
export interface BannerState {
  isVisible: boolean;
  title: string;
  description: string;
  variant: InfoType;
  duration?: number;
}

/**
 * Listener function type for state changes
 */
export type BannerStateListener = (state: BannerState) => void;

/**
 * Web implementation of InfoInterface using Banner component
 *
 * Manages banner state internally and notifies subscribers of changes.
 *
 * @ai-pattern Observable service pattern for React integration
 */
export class WebInfoService implements InfoInterface {
  private state: BannerState = {
    isVisible: false,
    title: '',
    description: '',
    variant: InfoType.INFO,
  };

  private listeners: Set<BannerStateListener> = new Set();
  private dismissTimeoutId: ReturnType<typeof setTimeout> | null = null;

  /**
   * Subscribe to banner state changes
   * @returns Unsubscribe function
   */
  subscribe(listener: BannerStateListener): () => void {
    this.listeners.add(listener);
    // Immediately call with current state
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Get current banner state
   */
  getState(): BannerState {
    return this.state;
  }

  /**
   * Dismiss the current banner
   */
  dismiss(): void {
    this.clearDismissTimeout();
    this.setState({
      ...this.state,
      isVisible: false,
    });
  }

  /**
   * Show an information banner to the user
   */
  show(
    title: string,
    text: string,
    type: InfoType,
    interval?: Optional<number>
  ): void {
    this.clearDismissTimeout();

    const newState: BannerState = {
      isVisible: true,
      title,
      description: text,
      variant: type,
    };

    if (interval != null) {
      newState.duration = interval;
    }

    this.setState(newState);

    // Auto-dismiss after duration (default 5000ms)
    const dismissAfter = interval ?? 5000;
    if (dismissAfter > 0) {
      this.dismissTimeoutId = setTimeout(() => {
        this.dismiss();
      }, dismissAfter);
    }
  }

  private setState(newState: BannerState): void {
    this.state = newState;
    this.notifyListeners();
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener(this.state));
  }

  private clearDismissTimeout(): void {
    if (this.dismissTimeoutId) {
      clearTimeout(this.dismissTimeoutId);
      this.dismissTimeoutId = null;
    }
  }
}

/**
 * Create a WebInfoService instance
 */
export function createWebInfoService(): WebInfoService {
  return new WebInfoService();
}

// Singleton instance
let infoServiceInstance: WebInfoService | null = null;

/**
 * Initialize the info service singleton
 * Also registers with @sudobility/di so getInfoService() works from both packages
 * @param service - WebInfoService instance (optional, creates one if not provided)
 */
export function initializeInfoService(service?: WebInfoService): void {
  if (infoServiceInstance) {
    return;
  }
  infoServiceInstance = service ?? new WebInfoService();
  // Also register with @sudobility/di so getInfoService() from that package works
  initializeDiInfoService(infoServiceInstance);
}

/**
 * Get the info service singleton
 * @throws Error if not initialized
 */
export function getInfoService(): WebInfoService {
  if (!infoServiceInstance) {
    throw new Error(
      'Info service not initialized. Call initializeInfoService() at app startup.'
    );
  }
  return infoServiceInstance;
}

/**
 * Reset info service (for testing only)
 */
export function resetInfoService(): void {
  infoServiceInstance = null;
}
