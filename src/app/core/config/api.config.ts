import { EnvironmentProviders, InjectionToken, makeEnvironmentProviders } from '@angular/core';

export interface ApiConfig {
  readonly baseUrl: string;
}

declare global {
  interface Window {
    __BADRAN_STORE_CONFIG__?: Partial<ApiConfig>;
  }
}

export const API_CONFIG = new InjectionToken<ApiConfig>('API_CONFIG');

export function resolveApiConfig(fallback: ApiConfig): ApiConfig {
  const runtimeConfig =
    typeof globalThis.window === 'undefined' ? undefined : globalThis.window.__BADRAN_STORE_CONFIG__;

  return {
    baseUrl: runtimeConfig?.baseUrl || fallback.baseUrl,
  };
}

export function provideApiConfig(config: ApiConfig): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: API_CONFIG,
      useValue: config,
    },
  ]);
}
