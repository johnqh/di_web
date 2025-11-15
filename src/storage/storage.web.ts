/**
 * Web implementation of platform storage using localStorage
 */

import { PlatformStorage, AdvancedPlatformStorage } from '@sudobility/di';

/**
 * Basic web storage implementation using localStorage
 * This implementation is synchronous to maintain compatibility with existing code
 */
export class WebStorage implements PlatformStorage {
  setItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.error(`Failed to store ${key}:`, error);
    }
  }

  getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error(`Failed to retrieve ${key}:`, error);
      return null;
    }
  }

  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Failed to remove ${key}:`, error);
    }
  }

  clear(): void {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Failed to clear storage:', error);
    }
  }

  getAllKeys(): string[] {
    try {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) keys.push(key);
      }
      return keys;
    } catch (error) {
      console.error('Failed to get all keys:', error);
      return [];
    }
  }
}

/**
 * Advanced web storage with TTL and prefix support
 */
export class AdvancedWebStorage implements AdvancedPlatformStorage {
  private storage: WebStorage;

  constructor() {
    this.storage = new WebStorage();
  }

  setItem(key: string, value: string, ttl?: number): void {
    const item = {
      value,
      timestamp: Date.now(),
      ttl,
    };
    this.storage.setItem(key, JSON.stringify(item));
  }

  getItem(key: string): string | null {
    try {
      const itemStr = this.storage.getItem(key);
      if (!itemStr) return null;

      const item = JSON.parse(itemStr);

      // Check if expired
      if (item.ttl && Date.now() - item.timestamp > item.ttl) {
        this.removeItem(key);
        return null;
      }

      return item.value;
    } catch (error) {
      console.error(`Failed to parse stored item ${key}:`, error);
      return null;
    }
  }

  removeItem(key: string): void {
    this.storage.removeItem(key);
  }

  clear(): void {
    this.storage.clear();
  }

  getAllKeys(): string[] {
    return this.storage.getAllKeys();
  }

  hasItem(key: string): boolean {
    return this.storage.getItem(key) !== null;
  }

  clearPattern(pattern?: string): void {
    if (!pattern) {
      this.clear();
      return;
    }

    const keys = this.getAllKeys();
    keys.forEach((key) => {
      if (key.includes(pattern)) {
        this.removeItem(key);
      }
    });
  }
}

// Export default instances
export const webStorage = new WebStorage();
export const advancedWebStorage = new AdvancedWebStorage();
