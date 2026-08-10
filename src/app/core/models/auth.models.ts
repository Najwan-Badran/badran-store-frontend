import { ApiResponse } from './api-response.model';
import { UserDto } from './user.models';

export interface LoginRequest {
  readonly email: string;
  readonly password: string;
}

export interface RegisterRequest {
  readonly name: string;
  readonly email: string;
  readonly phone: string | null;
  readonly password: string;
  readonly preferredLanguage: string;
}

export interface ResetPasswordRequest {
  readonly token: string;
  readonly newPassword: string;
}

export interface RefreshTokenRequest {
  readonly refreshToken: string;
}

export interface LoginResponse {
  readonly token: string;
  readonly refreshToken?: string | null;
  readonly email: string;
  readonly name: string;
  readonly role: string;
}

export interface AuthUser {
  readonly userId: number;
  readonly email: string;
  readonly name?: string;
  readonly role: string;
}

export type LoginApiResponse = ApiResponse<LoginResponse>;
export type RegisterApiResponse = ApiResponse<UserDto>;
