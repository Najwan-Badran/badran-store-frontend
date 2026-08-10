import { HttpContextToken, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap } from 'rxjs';

import { API_CONFIG } from '../config/api.config';
import { AuthService } from '../services/auth.service';
import { SessionContextService } from '../services/session-context.service';
import { TokenService } from '../services/token.service';

export const SKIP_AUTH_TOKEN = new HttpContextToken<boolean>(() => false);

export const authTokenInterceptor: HttpInterceptorFn = (request, next) => {
  const authService = inject(AuthService);
  const sessionContextService = inject(SessionContextService);
  const tokenService = inject(TokenService);
  const apiConfig = inject(API_CONFIG);
  const token = tokenService.getAccessToken();
  const isBackendApiRequest = isApiRequest(request.url, apiConfig.baseUrl);

  if (request.context.get(SKIP_AUTH_TOKEN) || !isBackendApiRequest) {
    return next(request);
  }

  if (token && tokenService.isAccessTokenExpired(token)) {
    if (!tokenService.getRefreshToken()) {
      authService.clearSession();
      return next(withAuthContext(request, tokenService, sessionContextService));
    }

    return authService.refreshSession().pipe(
      switchMap(() => next(withAuthContext(request, tokenService, sessionContextService))),
      catchError(() => {
        authService.clearSession();
        return next(withAuthContext(request, tokenService, sessionContextService));
      }),
    );
  }

  return next(withAuthContext(request, tokenService, sessionContextService));
};

function withAuthContext(
  request: Parameters<HttpInterceptorFn>[0],
  tokenService: TokenService,
  sessionContextService: SessionContextService,
) {
  const headers: Record<string, string> = {};
  const token = tokenService.getAccessToken();
  const validToken = token && !tokenService.isAccessTokenExpired(token) ? token : null;
  const payload = validToken ? tokenService.getPayload(validToken) : null;

  if (validToken && !request.headers.has('Authorization')) {
    headers['Authorization'] = `Bearer ${validToken}`;
  }

  if (payload && !request.headers.has('X-User-Id')) {
    headers['X-User-Id'] = String(payload.userId);
  }

  if (!payload && isSessionScopedRequest(request.url) && !request.headers.has('X-Session-Id')) {
    headers['X-Session-Id'] = sessionContextService.getSessionId();
  }

  return Object.keys(headers).length ? request.clone({ setHeaders: headers }) : request;
}

function isApiRequest(url: string, apiBaseUrl: string): boolean {
  return isSamePathOrChild(url, apiBaseUrl) || isSamePathOrChild(url, '/api');
}

function isSessionScopedRequest(url: string): boolean {
  return url.includes('/cart') || url.includes('/orders');
}

function isSamePathOrChild(url: string, baseUrl: string): boolean {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, '');

  return url === normalizedBaseUrl || url.startsWith(`${normalizedBaseUrl}/`);
}
