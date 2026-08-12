import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class SessionStorageService {
  getItem(key: string): string | null {
    try {
      return this.storage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  }

  setItem(key: string, value: string): void {
    try {
      this.storage?.setItem(key, value);
    } catch {
      return;
    }
  }

  removeItem(key: string): void {
    try {
      this.storage?.removeItem(key);
    } catch {
      return;
    }
  }

  clear(): void {
    try {
      this.storage?.clear();
    } catch {
      return;
    }
  }

  private get storage(): Storage | null {
    try {
      return typeof globalThis.sessionStorage === 'undefined' ? null : globalThis.sessionStorage;
    } catch {
      return null;
    }
  }
}
