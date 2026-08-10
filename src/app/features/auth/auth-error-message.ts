import { HttpErrorResponse } from '@angular/common/http';

export function getAuthErrorMessage(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) {
    return 'Server error.';
  }

  const serverMessage = getServerMessage(error).toLowerCase();

  if (error.status === 0) {
    return 'Unable to connect to server.';
  }

  if (serverMessage.includes('invalid email or password')) {
    return 'Invalid email or password.';
  }

  if (serverMessage.includes('email is already in use') || serverMessage.includes('email already exists')) {
    return 'Email already exists.';
  }

  if (error.status === 400) {
    return 'Validation failed.';
  }

  if (error.status === 401) {
    return 'Invalid email or password.';
  }

  if (error.status === 409) {
    return 'Email already exists.';
  }

  if (error.status >= 500) {
    return 'Server error.';
  }

  return 'Server error.';
}

function getServerMessage(error: HttpErrorResponse): string {
  const responseBody = error.error;

  if (responseBody && typeof responseBody === 'object' && 'message' in responseBody) {
    const message = responseBody.message;
    return typeof message === 'string' ? message : '';
  }

  return typeof responseBody === 'string' ? responseBody : '';
}
