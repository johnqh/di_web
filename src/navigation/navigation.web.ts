/**
 * Web implementation of navigation service using React Router
 * Provides React Router compatibility with navigation abstraction
 */

import {
  UINavigationService,
  UINavigationOptions,
  UINavigationState,
  UINavigationConfig,
} from '../types/ui-navigation';

const DEFAULT_CONFIG: UINavigationConfig = {
  enableBackGesture: false, // Not applicable to web
  enableSwipeGesture: false, // Not applicable to web
  animationType: 'none', // Not applicable to web
  enableAnalytics: true,
  fallbackPath: '/',
};

export class WebUINavigationService implements UINavigationService {
  private config: UINavigationConfig;
  private listeners: ((state: UINavigationState) => void)[] = [];
  private currentState: UINavigationState;

  constructor(config: Partial<UINavigationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.currentState = this.buildCurrentState();

    // Listen to browser navigation events
    if (typeof window !== 'undefined') {
      window.addEventListener('popstate', this.handlePopState.bind(this));
    }
  }

  navigate(path: string, options: UINavigationOptions = {}): void {
    if (!this.isSupported()) {
      return;
    }

    try {
      if (typeof window !== 'undefined' && window.history) {
        const method = options.replace ? 'replaceState' : 'pushState';
        window.history[method](options.state || null, '', path);

        this.updateCurrentState();
        this.notifyListeners();

        if (this.config.enableAnalytics) {
          this.trackNavigation('navigate', path);
        }
      }
    } catch (_error) {
      console.error('Error navigating:', _error);
    }
  }

  goBack(fallbackPath?: string): void {
    if (!this.isSupported()) {
      return;
    }

    try {
      if (this.canGoBack() && typeof window !== 'undefined' && window.history) {
        window.history.back();

        if (this.config.enableAnalytics) {
          this.trackNavigation('back');
        }
      } else if (fallbackPath) {
        this.navigate(fallbackPath);
      } else if (this.config.fallbackPath) {
        this.navigate(this.config.fallbackPath);
      }
    } catch (_error) {
      console.error('Error going back:', _error);
    }
  }

  goForward(): void {
    if (!this.isSupported()) {
      return;
    }

    try {
      if (
        this.canGoForward() &&
        typeof window !== 'undefined' &&
        window.history
      ) {
        window.history.forward();

        if (this.config.enableAnalytics) {
          this.trackNavigation('forward');
        }
      }
    } catch (_error) {
      console.error('Error going forward:', _error);
    }
  }

  replace(path: string, options: UINavigationOptions = {}): void {
    this.navigate(path, { ...options, replace: true });
  }

  getCurrentState(): UINavigationState {
    return { ...this.currentState };
  }

  getCurrentPath(): string {
    if (typeof window !== 'undefined' && window.location) {
      return window.location.pathname;
    }
    return '/';
  }

  getSearchParams(): Record<string, string> {
    if (typeof window !== 'undefined' && window.location) {
      const params = new URLSearchParams(window.location.search);
      const result: Record<string, string> = {};
      params.forEach((value, key) => {
        result[key] = value;
      });
      return result;
    }
    return {};
  }

  getParams(): Record<string, string> {
    // In web environment, path parameters would be handled by React Router
    // This is a simplified implementation
    return {};
  }

  canGoBack(): boolean {
    if (typeof window !== 'undefined' && window.history) {
      return window.history.length > 1;
    }
    return false;
  }

  canGoForward(): boolean {
    // Browser doesn't provide a direct way to check if we can go forward
    // This is a limitation of the History API
    return false;
  }

  addListener(listener: (state: UINavigationState) => void): () => void {
    this.listeners.push(listener);

    // Return cleanup function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      typeof window.history !== 'undefined' &&
      typeof window.location !== 'undefined'
    );
  }

  private buildCurrentState(): UINavigationState {
    return {
      currentPath: this.getCurrentPath(),
      params: this.getParams(),
      searchParams: this.getSearchParams(),
    };
  }

  private updateCurrentState(): void {
    const previousPath = this.currentState.currentPath;
    this.currentState = {
      ...this.buildCurrentState(),
      previousPath,
    };
  }

  private handlePopState(): void {
    this.updateCurrentState();
    this.notifyListeners();

    if (this.config.enableAnalytics) {
      this.trackNavigation('popstate', this.currentState.currentPath);
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => {
      try {
        listener(this.currentState);
      } catch (_error) {
        console.error('Error notifying navigation listener:', _error);
      }
    });
  }

  private trackNavigation(_type: string, _path?: string): void {
    // In a real app, you would integrate with your analytics service here
    // Navigation tracking removed - integrate with analytics service
  }
}

/**
 * Create a web navigation service instance
 */
export function createWebUINavigationService(
  config?: Partial<UINavigationConfig>
): UINavigationService {
  return new WebUINavigationService(config);
}

/**
 * Web-specific navigation helpers that work with React Router
 */
export const webNavigationHelpers = {
  /**
   * Get React Router navigate function
   * This is for compatibility with existing React Router code
   */
  getReactRouterNavigate: () => {
    // This would be used in components that still need direct React Router access
    // Returns the useNavigate hook for backward compatibility
    return null;
  },

  /**
   * Convert React Router location to navigation state
   */
  convertLocationToState: (location: {
    pathname?: string;
    params?: Record<string, string>;
    search?: string;
  }): UINavigationState => {
    return {
      currentPath: location.pathname || '/',
      params: location.params || {},
      searchParams: location.search
        ? Object.fromEntries(new URLSearchParams(location.search))
        : {},
    };
  },
};
