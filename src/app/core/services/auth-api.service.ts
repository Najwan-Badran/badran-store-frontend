import { HttpContext } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import {
  LoginApiResponse,
  LoginRequest,
  RefreshTokenRequest,
  RegisterApiResponse,
  RegisterRequest,
  ResetPasswordRequest,
} from '../models/auth.models';
import { ApiResponse } from '../models/api-response.model';
import { SKIP_AUTH_TOKEN } from '../interceptors/auth-token.interceptor';
import { BaseApiService } from './base-api.service';

@Injectable({
  providedIn: 'root',
})
export class AuthApiService extends BaseApiService {
  private readonly authPath = 'v1/auth';

  login(request: LoginRequest): Observable<LoginApiResponse> {
    return this.post<LoginApiResponse, LoginRequest>(`${this.authPath}/login`, request, {
      context: new HttpContext().set(SKIP_AUTH_TOKEN, true),
    });
  }

  register(request: RegisterRequest): Observable<RegisterApiResponse> {
    return this.post<RegisterApiResponse, RegisterRequest>(`${this.authPath}/register`, request, {
      context: new HttpContext().set(SKIP_AUTH_TOKEN, true),
    });
  }

  forgotPassword(email: string): Observable<ApiResponse<string>> {
    return this.post<ApiResponse<string>, null>(`${this.authPath}/forgot-password`, null, {
      params: {
        email,
      },
    });
  }

  resetPassword(request: ResetPasswordRequest): Observable<ApiResponse<void>> {
    return this.post<ApiResponse<void>, ResetPasswordRequest>(`${this.authPath}/reset-password`, request);
  }

  verifyEmail(token: string): Observable<ApiResponse<void>> {
    return this.post<ApiResponse<void>, null>(`${this.authPath}/verify-email`, null, {
      context: new HttpContext().set(SKIP_AUTH_TOKEN, true),
      params: { token },
    });
  }

  refresh(request: RefreshTokenRequest): Observable<LoginApiResponse> {
    return this.post<LoginApiResponse, RefreshTokenRequest>(`${this.authPath}/refresh`, request, {
      context: new HttpContext().set(SKIP_AUTH_TOKEN, true),
    });
  }

  logout(request: RefreshTokenRequest): Observable<ApiResponse<void>> {
    return this.post<ApiResponse<void>, RefreshTokenRequest>(`${this.authPath}/logout`, request, {
      context: new HttpContext().set(SKIP_AUTH_TOKEN, true),
    });
  }

  logoutAll(): Observable<ApiResponse<void>> {
    return this.post<ApiResponse<void>, null>(`${this.authPath}/logout-all`, null);
  }
}
