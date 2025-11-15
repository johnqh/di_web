/**
 * Web-specific storage service implementation
 */

import { PlatformStorage, StorageService } from '@sudobility/di';
import { StorageType } from '@sudobility/types';

export class WebStorageService implements PlatformStorage, StorageService {
  constructor(private storageType: StorageType = StorageType.LOCAL_STORAGE) {}

  private getStorage(): Storage {
    switch (this.storageType) {
      case StorageType.LOCAL_STORAGE:
        return localStorage;
      case StorageType.SESSION_STORAGE:
        return sessionStorage;
      case StorageType.MEMORY:
        return new MemoryStorage();
      default:
        return localStorage;
    }
  }

  getItem(key: string): string | null {
    try {
      return this.getStorage().getItem(key);
    } catch (error) {
      console.error('Error getting storage item:', error);
      return null;
    }
  }

  setItem(key: string, value: string): void {
    try {
      this.getStorage().setItem(key, value);
    } catch (error) {
      console.error('Error setting storage item:', error);
    }
  }

  removeItem(key: string): void {
    try {
      this.getStorage().removeItem(key);
    } catch (error) {
      console.error('Error removing storage item:', error);
    }
  }

  clear(): void {
    try {
      this.getStorage().clear();
    } catch (_error) {
      console.error('Error clearing storage:', _error);
    }
  }

  getAllKeys(): string[] {
    try {
      const storage = this.getStorage();
      const keys: string[] = [];
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key) keys.push(key);
      }
      return keys;
    } catch {
      return [];
    }
  }

  isAvailable(): boolean {
    try {
      const storage = this.getStorage();
      const testKey = '__storage_test__';
      storage.setItem(testKey, 'test');
      storage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  getType(): StorageType {
    return this.storageType;
  }
}

/**
 * Memory storage implementation for fallback
 */
class MemoryStorage implements Storage {
  private data = new Map<string, string>();

  get length(): number {
    return this.data.size;
  }

  getItem(key: string): string | null {
    return this.data.get(key) || null;
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }

  clear(): void {
    this.data.clear();
  }

  key(index: number): string | null {
    const keys = Array.from(this.data.keys());
    return keys[index] || null;
  }
}

/**
 * Serialized web storage service
 */
export class WebSerializedStorageService {
  constructor(private storage: WebStorageService) {}

  getObject<T>(key: string): T | null {
    const value = this.storage.getItem(key);
    if (!value) return null;

    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  setObject<T>(key: string, value: T): void {
    try {
      const serialized = JSON.stringify(value);
      this.storage.setItem(key, serialized);
    } catch (_error) {
      console.error('Error setting object in storage:', _error);
    }
  }

  removeObject(key: string): void {
    this.storage.removeItem(key);
  }

  hasObject(key: string): boolean {
    return this.storage.getItem(key) !== null;
  }
}
