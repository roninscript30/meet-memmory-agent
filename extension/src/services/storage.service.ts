import type { StorageState } from '../core/types';

/**
 * Storage service — wraps chrome.storage.local for extension state persistence.
 */
class StorageService {
  private defaults: StorageState = {
    captureEnabled: false,
    currentMeetingId: null,
    pendingEvents: [],
    pendingChats: [],
  };

  async get<K extends keyof StorageState>(key: K): Promise<StorageState[K]> {
    return new Promise((resolve) => {
      chrome.storage.local.get(key, (result) => {
        resolve(result[key] ?? this.defaults[key]);
      });
    });
  }

  async set<K extends keyof StorageState>(
    key: K,
    value: StorageState[K]
  ): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: value }, resolve);
    });
  }

  async getAll(): Promise<StorageState> {
    return new Promise((resolve) => {
      chrome.storage.local.get(null, (result) => {
        resolve({ ...this.defaults, ...result } as StorageState);
      });
    });
  }

  async clear(): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.set(this.defaults, resolve);
    });
  }

  async isCaptureEnabled(): Promise<boolean> {
    return this.get('captureEnabled');
  }

  async setCaptureEnabled(enabled: boolean): Promise<void> {
    return this.set('captureEnabled', enabled);
  }

  async setCurrentMeetingId(meetingId: string | null): Promise<void> {
    return this.set('currentMeetingId', meetingId);
  }

  async getCurrentMeetingId(): Promise<string | null> {
    return this.get('currentMeetingId');
  }
}

export const storageService = new StorageService();
