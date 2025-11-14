/**
 * Web-specific network service implementation
 */

import { PlatformNetwork } from '@sudobility/di';
import { ConnectionState, ConnectionType } from '@sudobility/types';

/**
 * Network Information API types
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Network_Information_API
 */
interface NetworkInformation {
  effectiveType?: '2g' | '3g' | '4g' | 'slow-2g';
  type?:
    | 'bluetooth'
    | 'cellular'
    | 'ethernet'
    | 'none'
    | 'wifi'
    | 'wimax'
    | 'other'
    | 'unknown';
  addEventListener: (type: string, listener: () => void) => void;
  removeEventListener: (type: string, listener: () => void) => void;
}

interface NavigatorWithConnection {
  connection?: NetworkInformation;
}

export class WebNetworkService implements PlatformNetwork {
  private status: ConnectionState = ConnectionState.UNKNOWN;
  private connectionType: ConnectionType = ConnectionType.UNKNOWN;
  private listeners: ((status: ConnectionState) => void)[] = [];

  constructor() {
    this.initializeNetworkMonitoring();
    this.updateNetworkStatus();
  }

  getNetworkStatus(): ConnectionState {
    return this.status;
  }

  getConnectionType(): ConnectionType {
    return this.connectionType;
  }

  isOnline(): boolean {
    const online = this.status === ConnectionState.CONNECTED;
    return online;
  }

  onNetworkStatusChange(
    callback: (status: ConnectionState) => void
  ): () => void {
    this.listeners.push(callback);

    // Return cleanup function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Required by PlatformNetwork interface
  async request(url: string, options: RequestInit = {}): Promise<Response> {
    return fetch(url, options);
  }

  // Required by PlatformNetwork interface
  watchNetworkStatus(callback: (isOnline: boolean) => void): () => void {
    const networkCallback = (status: ConnectionState) => {
      const online = status === ConnectionState.CONNECTED;
      callback(online);
    };

    return this.onNetworkStatusChange(networkCallback);
  }

  async testConnectivity(url?: string): Promise<boolean> {
    const testUrl = url || 'https://httpbin.org/status/200';

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      await fetch(testUrl, {
        method: 'HEAD',
        mode: 'no-cors',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return true;
    } catch (error) {
      console.error('Error checking connectivity:', error);
      return false;
    }
  }

  private initializeNetworkMonitoring(): void {
    if (typeof window === 'undefined') return;

    // Monitor online/offline events
    window.addEventListener('online', this.handleOnlineChange);
    window.addEventListener('offline', this.handleOfflineChange);

    // Monitor connection changes if supported
    if ('connection' in navigator) {
      const connection = (navigator as NavigatorWithConnection).connection;
      if (connection) {
        connection.addEventListener('change', this.handleConnectionChange);
      }
    }
  }

  private handleOnlineChange = (): void => {
    this.updateNetworkStatus();
  };

  private handleOfflineChange = (): void => {
    this.status = ConnectionState.DISCONNECTED;
    this.connectionType = ConnectionType.NONE;
    this.notifyListeners();
  };

  private handleConnectionChange = (): void => {
    this.updateNetworkStatus();
  };

  private updateNetworkStatus(): void {
    if (typeof window === 'undefined') {
      this.status = ConnectionState.UNKNOWN;
      this.connectionType = ConnectionType.UNKNOWN;
      return;
    }

    // Basic online/offline detection
    if (!navigator.onLine) {
      this.status = ConnectionState.DISCONNECTED;
      this.connectionType = ConnectionType.NONE;
      this.notifyListeners();
      return;
    }

    // Determine connection type if supported
    this.connectionType = this.detectConnectionType();

    // Set status based on connection
    if (this.connectionType === ConnectionType.NONE) {
      this.status = ConnectionState.DISCONNECTED;
    } else {
      this.status = ConnectionState.CONNECTED;
    }

    this.notifyListeners();
  }

  private detectConnectionType(): ConnectionType {
    if (typeof window === 'undefined' || !navigator.onLine) {
      return ConnectionType.NONE;
    }

    // Try to detect connection type using Network Information API
    if ('connection' in navigator) {
      const connection = (navigator as NavigatorWithConnection).connection;
      if (connection && connection.effectiveType) {
        switch (connection.effectiveType) {
          case 'slow-2g':
          case '2g':
            return ConnectionType.CELLULAR_2G;
          case '3g':
            return ConnectionType.CELLULAR_3G;
          case '4g':
            return ConnectionType.CELLULAR_4G;
          default:
            // Check if it's likely cellular or wifi
            if (connection.type === 'cellular') {
              return ConnectionType.CELLULAR_4G; // Default to 4G for unknown cellular
            }
            return ConnectionType.WIFI;
        }
      }
    }

    // Fallback: assume wifi/ethernet for online connections
    return ConnectionType.WIFI;
  }

  private notifyListeners(): void {
    this.listeners.forEach((callback) => {
      try {
        callback(this.status);
      } catch (error) {
        console.error('Error notifying network status listener:', error);
      }
    });
  }

  // Cleanup method
  destroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnlineChange);
      window.removeEventListener('offline', this.handleOfflineChange);

      if ('connection' in navigator) {
        const connection = (navigator as NavigatorWithConnection).connection;
        if (connection) {
          connection.removeEventListener('change', this.handleConnectionChange);
        }
      }
    }

    this.listeners = [];
  }
}
