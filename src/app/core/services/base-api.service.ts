import { HttpClient, HttpContext, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_CONFIG } from '../config/api.config';
import { HttpMethod } from '../types/http-method.type';

export interface ApiRequestOptions {
  readonly headers?: HttpHeaders | Record<string, string | string[]>;
  readonly params?: HttpParams | Record<string, string | number | boolean | ReadonlyArray<string | number | boolean>>;
  readonly context?: HttpContext;
}

export abstract class BaseApiService {
  private readonly http = inject(HttpClient);
  private readonly apiConfig = inject(API_CONFIG);

  protected request<TResponse, TBody = unknown>(
    method: HttpMethod,
    path: string,
    body?: TBody,
    options: ApiRequestOptions = {},
  ): Observable<TResponse> {
    return this.http.request<TResponse>(method, this.buildUrl(path), {
      body,
      ...options,
    });
  }

  protected get<TResponse>(path: string, options?: ApiRequestOptions): Observable<TResponse> {
    return this.request<TResponse>('GET', path, undefined, options);
  }

  protected post<TResponse, TBody>(path: string, body: TBody, options?: ApiRequestOptions): Observable<TResponse> {
    return this.request<TResponse, TBody>('POST', path, body, options);
  }

  protected put<TResponse, TBody>(path: string, body: TBody, options?: ApiRequestOptions): Observable<TResponse> {
    return this.request<TResponse, TBody>('PUT', path, body, options);
  }

  protected patch<TResponse, TBody>(path: string, body: TBody, options?: ApiRequestOptions): Observable<TResponse> {
    return this.request<TResponse, TBody>('PATCH', path, body, options);
  }

  protected delete<TResponse>(path: string, options?: ApiRequestOptions): Observable<TResponse> {
    return this.request<TResponse>('DELETE', path, undefined, options);
  }

  private buildUrl(path: string): string {
    const normalizedBaseUrl = this.apiConfig.baseUrl.replace(/\/+$/, '');
    const normalizedPath = path.replace(/^\/+/, '');

    return `${normalizedBaseUrl}/${normalizedPath}`;
  }
}
