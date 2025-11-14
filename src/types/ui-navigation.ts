/**
 * UI-level navigation state interface for the main project
 * This is separate from the library's NavigationState which is for email app navigation
 */

export interface UINavigationState {
  currentPath: string;
  previousPath?: string;
  params: Record<string, string>;
  searchParams: Record<string, string>;
}

export interface UINavigationOptions {
  replace?: boolean;
  state?: Record<string, unknown>;
  preventScrollReset?: boolean;
}

export interface UINavigationService {
  navigate(path: string, options?: UINavigationOptions): void;
  goBack(fallbackPath?: string): void;
  goForward(): void;
  replace(path: string, options?: UINavigationOptions): void;
  getCurrentState(): UINavigationState;
  getCurrentPath(): string;
  getSearchParams(): Record<string, string>;
  getParams(): Record<string, string>;
  canGoBack(): boolean;
  canGoForward(): boolean;
  addListener(listener: (state: UINavigationState) => void): () => void;
  isSupported(): boolean;
}

export interface UINavigationHook {
  navigate: (path: string, options?: UINavigationOptions) => void;
  goBack: (fallbackPath?: string) => void;
  replace: (path: string, options?: UINavigationOptions) => void;
  currentPath: string;
  searchParams: Record<string, string>;
  params: Record<string, string>;
  canGoBack: boolean;
  isSupported: boolean;
}

export interface UILocationHook {
  pathname: string;
  search: string;
  searchParams: Record<string, string>;
  hash: string;
  state: Record<string, unknown>;
  key: string;
}

export interface UINavigationConfig {
  enableBackGesture?: boolean; // React Native specific
  enableSwipeGesture?: boolean; // React Native specific
  animationType?: 'slide' | 'fade' | 'none'; // React Native specific
  enableAnalytics?: boolean; // Track navigation events
  fallbackPath?: string; // Default fallback path
}
