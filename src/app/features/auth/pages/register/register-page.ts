import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { ApiErrorService } from '../../../../core/services/api-error.service';
import { AuthApiService } from '../../../../core/services/auth-api.service';
import {
  PHONE_VALIDATION_MESSAGE,
  matchingControlsValidator,
  normalizePhoneNumber,
  passwordStrength,
  phoneValidator,
  strongPasswordValidator,
} from '../../../../core/validators/form.validators';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { getAuthErrorMessage } from '../../auth-error-message';

@Component({
  selector: 'app-register-page',
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
  templateUrl: './register-page.html',
  styleUrl: './register-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterPage {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly authApiService = inject(AuthApiService);
  private readonly apiErrorService = inject(ApiErrorService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly registerForm = this.formBuilder.group({
    name: ['', [Validators.required, Validators.maxLength(255)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
    phone: ['', [Validators.maxLength(255), phoneValidator()]],
    password: ['', [Validators.required, Validators.maxLength(255), strongPasswordValidator()]],
    confirmPassword: ['', [Validators.required]],
    preferredLanguage: ['en', [Validators.maxLength(20)]],
  }, { validators: [matchingControlsValidator('password', 'confirmPassword')] });
  protected readonly hidePassword = signal(true);
  protected readonly isSubmitting = signal(false);
  protected readonly registerError = signal<string | null>(null);
  protected readonly passwordScore = signal<'empty' | 'weak' | 'medium' | 'strong'>('empty');

  protected submit(): void {
    this.clearErrors();

    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const formValue = this.registerForm.getRawValue();

    this.authApiService
      .register({
        name: formValue.name.trim(),
        email: formValue.email.trim(),
        // The backend treats phone as optional. Omit it as null instead of sending
        // an empty string, which would fail its @Pattern constraint.
        phone: normalizePhoneNumber(formValue.phone) ?? null,
        password: formValue.password,
        preferredLanguage: formValue.preferredLanguage.trim() || 'en',
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isSubmitting.set(false)),
      )
      .subscribe({
        next: () => {
          void this.router.navigate(['/login'], {
            queryParams: {
              registered: 'true',
              email: this.registerForm.controls.email.value,
            },
          });
        },
        error: (error: unknown) => {
          const errorDetails = this.apiErrorService.getErrorDetails(error);
          this.applyFieldErrors(errorDetails.fieldErrors);
          this.registerError.set(getAuthErrorMessage(error));
        },
      });
  }

  protected togglePasswordVisibility(): void {
    this.hidePassword.update((value) => !value);
  }

  protected updatePasswordStrength(): void {
    this.passwordScore.set(passwordStrength(this.registerForm.controls.password.value));
  }

  protected getNameError(): string {
    const control = this.registerForm.controls.name;

    if (control.hasError('required')) {
      return 'Name is required.';
    }

    if (control.hasError('maxlength')) {
      return 'Name must not exceed 255 characters.';
    }

    return this.getBackendError('name');
  }

  protected getEmailError(): string {
    const control = this.registerForm.controls.email;

    if (control.hasError('required')) {
      return 'Email is required.';
    }

    if (control.hasError('email')) {
      return 'Enter a valid email address.';
    }

    if (control.hasError('maxlength')) {
      return 'Email must not exceed 255 characters.';
    }

    return this.getBackendError('email');
  }

  protected getPhoneError(): string {
    const control = this.registerForm.controls.phone;

    if (control.hasError('maxlength')) return 'Phone must not exceed 255 characters.';
    if (control.hasError('phone')) return PHONE_VALIDATION_MESSAGE;

    return this.getBackendError('phone');
  }

  protected getPasswordError(): string {
    const control = this.registerForm.controls.password;

    if (control.hasError('required')) {
      return 'Password is required.';
    }

    if (control.hasError('maxlength')) return 'Password must not exceed 255 characters.';
    if (control.hasError('minlength')) return 'Password must be at least 8 characters.';
    if (control.hasError('uppercase')) return 'Password must include an uppercase letter.';
    if (control.hasError('lowercase')) return 'Password must include a lowercase letter.';
    if (control.hasError('number')) return 'Password must include a number.';
    if (control.hasError('special')) return 'Password must include a special character.';

    return this.getBackendError('password');
  }

  protected getConfirmPasswordError(): string {
    const control = this.registerForm.controls.confirmPassword;

    if (control.hasError('required')) {
      return 'Confirm your password.';
    }

    if (this.registerForm.hasError('mismatch')) {
      return 'Passwords do not match.';
    }

    return '';
  }

  protected getPreferredLanguageError(): string {
    const control = this.registerForm.controls.preferredLanguage;

    if (control.hasError('maxlength')) {
      return 'Preferred language must not exceed 20 characters.';
    }

    return this.getBackendError('preferredLanguage');
  }

  private getBackendError(controlName: keyof typeof this.registerForm.controls): string {
    const error = this.registerForm.controls[controlName].getError('backend');
    return typeof error === 'string' ? error : '';
  }

  private applyFieldErrors(fieldErrors: Readonly<Record<string, string>>): void {
    Object.entries(fieldErrors).forEach(([field, message]) => {
      if (isRegisterField(field)) {
        this.registerForm.controls[field].setErrors({
          ...this.registerForm.controls[field].errors,
          backend: message,
        });
      }
    });
  }

  private clearErrors(): void {
    this.registerError.set(null);
    REGISTER_FIELDS.forEach((field) => this.clearBackendError(field));
  }

  private clearBackendError(controlName: RegisterField): void {
    const control = this.registerForm.controls[controlName];
    const errors = control.errors;

    if (!errors?.['backend']) {
      return;
    }

    const { backend: _backend, ...remainingErrors } = errors;
    control.setErrors(Object.keys(remainingErrors).length ? remainingErrors : null);
  }
}

const REGISTER_FIELDS = ['name', 'email', 'phone', 'password', 'confirmPassword', 'preferredLanguage'] as const;
type RegisterField = (typeof REGISTER_FIELDS)[number];

function isRegisterField(value: string): value is RegisterField {
  return REGISTER_FIELDS.some((field) => field === value);
}
