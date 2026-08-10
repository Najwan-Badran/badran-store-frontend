import { inject, Injectable } from '@angular/core';

import { LocalStorageService } from './local-storage.service';

@Injectable({
  providedIn: 'root',
})
export class SessionContextService {
  private readonly localStorageService = inject(LocalStorageService);
  private readonly sessionIdKey = 'badran_store_session_id';

  getSessionId(): string {
    const existingSessionId = this.localStorageService.getItem(this.sessionIdKey);

    if (existingSessionId) {
      return existingSessionId;
    }

    const sessionId = createSessionId();
    this.localStorageService.setItem(this.sessionIdKey, sessionId);
    return sessionId;
  }
}

function createSessionId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return `session-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
