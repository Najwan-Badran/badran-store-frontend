import { DestroyRef, Injectable, inject, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class NetworkStatusService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly onlineSignal = signal(isOnline());

  readonly online = this.onlineSignal.asReadonly();

  constructor() {
    const setOnline = () => this.onlineSignal.set(true);
    const setOffline = () => this.onlineSignal.set(false);

    globalThis.addEventListener?.('online', setOnline);
    globalThis.addEventListener?.('offline', setOffline);

    this.destroyRef.onDestroy(() => {
      globalThis.removeEventListener?.('online', setOnline);
      globalThis.removeEventListener?.('offline', setOffline);
    });
  }
}

function isOnline(): boolean {
  return typeof globalThis.navigator?.onLine === 'boolean' ? globalThis.navigator.onLine : true;
}
