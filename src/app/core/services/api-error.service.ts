import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { ApiErrorResponse } from '../models/api-error-response.model';

export interface ApiErrorDetails {
  readonly message: string;
  readonly fieldErrors: Readonly<Record<string, string>>;
}

@Injectable({
  providedIn: 'root',
})
export class ApiErrorService {
  getErrorDetails(error: unknown): ApiErrorDetails {
    if (!(error instanceof HttpErrorResponse)) {
      return {
        message: error instanceof Error && error.message ? error.message : 'The request could not be completed. Please try again.',
        fieldErrors: {},
      };
    }

    if (error.status === 0) {
      return {
        message: 'Unable to connect to the server. Please check your connection and try again.',
        fieldErrors: {},
      };
    }

    const response = this.getApiErrorResponse(error);

    return {
      message: response?.message ?? this.getFallbackMessage(error.status),
      fieldErrors: response?.errors ?? {},
    };
  }

  private getApiErrorResponse(error: HttpErrorResponse): ApiErrorResponse | null {
    if (isApiErrorResponse(error.error)) {
      return error.error;
    }

    return null;
  }

  private getFallbackMessage(status: number): string {
    if (status === 400) {
      return 'Please review your information and try again.';
    }

    if (status === 401) {
      return 'Please sign in to continue.';
    }

    if (status === 403) {
      return 'You do not have permission to complete this request.';
    }

    if (status === 409) {
      return 'This request conflicts with existing account information.';
    }

    if (status >= 500) {
      return 'The server could not complete the request. Please try again later.';
    }

    return 'The request could not be completed. Please review your information and try again.';
  }
}

function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<ApiErrorResponse>;

  return candidate.success === false && typeof candidate.message === 'string';
}
