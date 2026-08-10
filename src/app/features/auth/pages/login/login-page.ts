import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize, map, tap } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { ApiErrorService } from '../../../../core/services/api-error.service';
import { AuthApiService } from '../../../../core/services/auth-api.service';
import { AuthService } from '../../../../core/services/auth.service';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { getAuthErrorMessage } from '../../auth-error-message';

@Component({
  selector: 'app-login-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    TranslatePipe,
  ],
  templateUrl: './login-page.html',
  styleUrl: './login-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly authApiService = inject(AuthApiService);
  private readonly authService = inject(AuthService);
  private readonly apiErrorService = inject(ApiErrorService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loginForm = this.formBuilder.group({
    email: [this.route.snapshot.queryParamMap.get('email') ?? '', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });
  protected readonly hidePassword = signal(true);
  protected readonly isSubmitting = signal(false);
  protected readonly authError = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(
    this.route.snapshot.queryParamMap.get('registered') === 'true'
      ? 'Account created successfully. Sign in to continue.'
      : null,
  );

  protected submit(): void {
    this.clearErrors();

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);

    this.authApiService
      .login(this.loginForm.getRawValue())
      .pipe(
        map((response) => response.data),
        tap((response) => this.authService.startSession(response)),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isSubmitting.set(false)),
      )
      .subscribe({
        next: () => {
          void this.router.navigateByUrl(this.getReturnUrl());
        },
        error: (error: unknown) => {
          const errorDetails = this.apiErrorService.getErrorDetails(error);
          this.applyFieldErrors(errorDetails.fieldErrors);
          this.authError.set(getAuthErrorMessage(error));
        },
      });
  }

  protected togglePasswordVisibility(): void {
    this.hidePassword.update((value) => !value);
  }

  protected getEmailError(): string {
    const control = this.loginForm.controls.email;

    if (control.hasError('required')) {
      return 'Email is required.';
    }

    if (control.hasError('email')) {
      return 'Enter a valid email address.';
    }

    return this.getBackendError('email');
  }

  protected getPasswordError(): string {
    const control = this.loginForm.controls.password;

    if (control.hasError('required')) {
      return 'Password is required.';
    }

    return this.getBackendError('password');
  }

  private getBackendError(controlName: 'email' | 'password'): string {
    const error = this.loginForm.controls[controlName].getError('backend');
    return typeof error === 'string' ? error : '';
  }

  private applyFieldErrors(fieldErrors: Readonly<Record<string, string>>): void {
    Object.entries(fieldErrors).forEach(([field, message]) => {
      if (field === 'email' || field === 'password') {
        this.loginForm.controls[field].setErrors({
          ...this.loginForm.controls[field].errors,
          backend: message,
        });
      }
    });
  }

  private clearErrors(): void {
    this.authError.set(null);
    this.successMessage.set(null);
    this.clearBackendError('email');
    this.clearBackendError('password');
  }

  private clearBackendError(controlName: 'email' | 'password'): void {
    const control = this.loginForm.controls[controlName];
    const errors = control.errors;

    if (!errors?.['backend']) {
      return;
    }

    const { backend: _backend, ...remainingErrors } = errors;
    control.setErrors(Object.keys(remainingErrors).length ? remainingErrors : null);
  }

  private getReturnUrl(): string {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');

    if (!returnUrl || !returnUrl.startsWith('/') || returnUrl.startsWith('//')) {
      return '/home';
    }

    return returnUrl;
  }
}
