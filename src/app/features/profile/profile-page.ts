import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { finalize, switchMap } from 'rxjs';

import { AddressDto, AddressRequest, UserDto } from '../../core/models/user.models';
import { ApiErrorService } from '../../core/services/api-error.service';
import { AuthApiService } from '../../core/services/auth-api.service';
import { ProfileApiService } from '../../core/services/profile-api.service';
import {
  PHONE_VALIDATION_MESSAGE,
  addressTextValidators,
  matchingControlsValidator,
  normalizePhoneNumber,
  passwordStrength,
  phoneValidator,
  strongPasswordValidator,
} from '../../core/validators/form.validators';
import { ConfirmationDialog } from '../../shared/components/confirmation-dialog/confirmation-dialog';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-profile-page',
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: './profile-page.html',
  styleUrl: './profile-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfilePage {
  private readonly apiErrorService = inject(ApiErrorService);
  private readonly authApiService = inject(AuthApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = inject(MatDialog);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly profileApiService = inject(ProfileApiService);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly profileForm = this.formBuilder.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(255)]],
    phone: ['', [Validators.maxLength(255), phoneValidator()]],
    preferredLanguage: ['en', [Validators.required, Validators.maxLength(20)]],
  });
  protected readonly addressForm = this.formBuilder.group({
    label: ['', [Validators.maxLength(255)]],
    city: ['', addressTextValidators()],
    zone: ['', addressTextValidators()],
    addressLine: ['', addressTextValidators()],
    isDefault: [false],
  });
  protected readonly passwordForm = this.formBuilder.group(
    {
      newPassword: ['', [Validators.required, Validators.maxLength(255), strongPasswordValidator()]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: [matchingControlsValidator('newPassword', 'confirmPassword')] },
  );

  protected readonly profile = signal<UserDto | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly isSavingProfile = signal(false);
  protected readonly isSavingAddress = signal(false);
  protected readonly isChangingPassword = signal(false);
  protected readonly isUploadingAvatar = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly avatarPreviewUrl = signal<string | null>(null);
  protected readonly avatarMessage = signal<string | null>(null);
  protected readonly editingAddressId = signal<number | null>(null);
  protected readonly profileSuccessMessage = signal<string | null>(null);
  protected readonly addressSuccessMessage = signal<string | null>(null);
  protected readonly passwordSuccessMessage = signal<string | null>(null);
  protected readonly initials = computed(() => getInitials(this.profile()?.name ?? this.profile()?.email ?? 'Account'));
  protected readonly passwordValue = toSignal(this.passwordForm.controls.newPassword.valueChanges, {
    initialValue: this.passwordForm.controls.newPassword.value,
  });
  protected readonly passwordScore = computed(() => passwordStrength(this.passwordValue()));
  protected readonly passwordValidationMessage = computed(() => {
    const control = this.passwordForm.controls.newPassword;

    if (!control.value) {
      return 'Use at least 8 characters with uppercase, lowercase, number, and special character.';
    }

    if (control.hasError('minlength')) {
      return 'Password must be at least 8 characters.';
    }

    if (control.hasError('uppercase')) {
      return 'Password must include an uppercase letter.';
    }

    if (control.hasError('lowercase')) {
      return 'Password must include a lowercase letter.';
    }

    if (control.hasError('number')) {
      return 'Password must include a number.';
    }

    if (control.hasError('special')) {
      return 'Password must include a special character.';
    }

    if (this.passwordForm.hasError('mismatch')) {
      return 'Passwords do not match.';
    }

    return 'Password meets the current validation rules.';
  });

  private selectedAvatarFile: File | null = null;
  private avatarObjectUrl: string | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => this.revokeAvatarObjectUrl());
    this.loadProfile();
  }

  protected loadProfile(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.profileApiService
      .getProfile()
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          this.profile.set(response.data);
          this.profileForm.reset({
            name: response.data.name,
            phone: response.data.phone ?? '',
            preferredLanguage: response.data.preferredLanguage,
          });
        },
        error: (error: unknown) => this.errorMessage.set(this.apiErrorService.getErrorDetails(error).message),
      });
  }

  protected saveProfile(): void {
    this.profileSuccessMessage.set(null);
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    const formValue = this.profileForm.getRawValue();
    this.isSavingProfile.set(true);
    this.profileApiService
      .updateProfile({
        name: formValue.name.trim(),
        phone: normalizePhoneNumber(formValue.phone),
        preferredLanguage: formValue.preferredLanguage.trim() || undefined,
      })
      .pipe(
        finalize(() => this.isSavingProfile.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          this.profile.set(response.data);
          this.profileSuccessMessage.set('Profile updated.');
          this.snackBar.open('Profile updated.', 'Close');
        },
        error: (error: unknown) => {
          const details = this.apiErrorService.getErrorDetails(error);
          this.applyProfileFieldErrors(details.fieldErrors);
          this.snackBar.open(details.message, 'Close');
        },
      });
  }

  protected saveAddress(): void {
    this.addressSuccessMessage.set(null);
    if (this.addressForm.invalid) {
      this.addressForm.markAllAsTouched();
      return;
    }

    this.isSavingAddress.set(true);
    const formValue = this.addressForm.getRawValue();
    const request: AddressRequest = {
      label: formValue.label.trim() || undefined,
      city: formValue.city.trim(),
      zone: formValue.zone.trim(),
      addressLine: formValue.addressLine.trim(),
      isDefault: formValue.isDefault,
    };
    const addressId = this.editingAddressId();
    const action = addressId
      ? this.profileApiService.updateAddress(addressId, request)
      : this.profileApiService.createAddress(request);

    action
      .pipe(
        finalize(() => this.isSavingAddress.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.addressForm.reset(createAddressForm());
          this.editingAddressId.set(null);
          this.addressSuccessMessage.set('Address saved.');
          this.snackBar.open('Address saved.', 'Close');
          this.loadProfile();
        },
        error: (error: unknown) => {
          const details = this.apiErrorService.getErrorDetails(error);
          this.applyAddressFieldErrors(details.fieldErrors);
          this.snackBar.open(details.message, 'Close');
        },
      });
  }

  protected editAddress(address: AddressDto): void {
    this.editingAddressId.set(address.addressId);
    this.addressForm.reset({
      label: address.label ?? '',
      city: address.city,
      zone: address.zone,
      addressLine: address.addressLine,
      isDefault: address.isDefault,
    });
  }

  protected cancelAddressEdit(): void {
    this.editingAddressId.set(null);
    this.addressForm.reset(createAddressForm());
  }

  protected setDefaultAddress(address: AddressDto): void {
    this.profileApiService
      .setDefaultAddress(address.addressId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.snackBar.open('Default address updated.', 'Close');
          this.loadProfile();
        },
        error: (error: unknown) => this.snackBar.open(this.apiErrorService.getErrorDetails(error).message, 'Close'),
      });
  }

  protected deleteAddress(address: AddressDto): void {
    this.dialog
      .open(ConfirmationDialog, {
        autoFocus: 'dialog',
        restoreFocus: true,
        data: {
          title: 'Delete address?',
          message: 'This saved delivery address will be removed from your profile.',
          confirmLabel: 'Delete',
        },
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((confirmed) => {
        if (!confirmed) {
          return;
        }
        this.profileApiService
          .deleteAddress(address.addressId)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.snackBar.open('Address deleted.', 'Close');
              this.loadProfile();
            },
            error: (error: unknown) => this.snackBar.open(this.apiErrorService.getErrorDetails(error).message, 'Close'),
          });
      });
  }

  protected changePassword(): void {
    const profile = this.profile();
    this.passwordSuccessMessage.set(null);

    if (!profile || this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      this.snackBar.open(this.passwordValidationMessage(), 'Close');
      return;
    }

    const newPassword = this.passwordForm.controls.newPassword.value;
    this.isChangingPassword.set(true);
    this.authApiService
      .forgotPassword(profile.email)
      .pipe(
        switchMap((response) => this.authApiService.resetPassword({ token: response.data, newPassword })),
        finalize(() => this.isChangingPassword.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.passwordForm.reset({ newPassword: '', confirmPassword: '' });
          this.passwordSuccessMessage.set('Password changed.');
          this.snackBar.open('Password changed.', 'Close');
        },
        error: (error: unknown) => this.snackBar.open(this.apiErrorService.getErrorDetails(error).message, 'Close'),
      });
  }

  protected onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.avatarMessage.set(null);

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.avatarMessage.set('Choose a PNG, JPG, or WebP image.');
      input.value = '';
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      this.avatarMessage.set('Avatar image must be 2 MB or smaller.');
      input.value = '';
      return;
    }

    this.selectedAvatarFile = file;
    this.revokeAvatarObjectUrl();
    this.avatarObjectUrl = URL.createObjectURL(file);
    this.avatarPreviewUrl.set(this.avatarObjectUrl);
  }

  protected uploadAvatar(): void {
    if (!this.selectedAvatarFile) {
      this.avatarMessage.set('Select an avatar image before uploading.');
      return;
    }

    this.isUploadingAvatar.set(true);
    this.profileApiService
      .uploadAvatar({ file: this.selectedAvatarFile })
      .pipe(
        finalize(() => this.isUploadingAvatar.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          this.profile.set(response.data);
          this.clearAvatarPreview();
          this.avatarMessage.set('Avatar uploaded.');
        },
        error: (error: unknown) => {
          this.avatarMessage.set(this.apiErrorService.getErrorDetails(error).message);
        },
      });
  }

  protected removeAvatar(): void {
    if (this.avatarPreviewUrl()) {
      this.clearAvatarPreview();
      this.avatarMessage.set('Avatar preview removed.');
      return;
    }

    this.isUploadingAvatar.set(true);
    this.profileApiService
      .removeAvatar()
      .pipe(
        finalize(() => this.isUploadingAvatar.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          this.profile.set(response.data);
          this.avatarMessage.set('Avatar removed.');
        },
        error: (error: unknown) => {
          this.avatarMessage.set(this.apiErrorService.getErrorDetails(error).message);
        },
      });
  }

  protected getProfileError(controlName: keyof typeof this.profileForm.controls): string {
    const control = this.profileForm.controls[controlName];

    if (!control.touched) {
      return '';
    }

    if (control.hasError('required')) return 'This field is required.';
    if (control.hasError('minlength')) return 'Use at least 2 characters.';
    if (control.hasError('maxlength')) return 'Must not exceed the backend length limit.';
    if (control.hasError('phone')) return PHONE_VALIDATION_MESSAGE;
    if (control.hasError('backend')) return String(control.getError('backend'));

    return '';
  }

  protected getAddressError(controlName: keyof typeof this.addressForm.controls): string {
    const control = this.addressForm.controls[controlName];

    if (!control.touched) {
      return '';
    }

    if (control.hasError('required')) return 'This field is required.';
    if (control.hasError('minlength')) return 'Use at least 2 characters.';
    if (control.hasError('maxlength')) return 'Must not exceed 255 characters.';
    if (control.hasError('backend')) return String(control.getError('backend'));

    return '';
  }

  protected getPasswordError(controlName: keyof typeof this.passwordForm.controls): string {
    const control = this.passwordForm.controls[controlName];

    if (!control.touched) {
      return '';
    }

    if (control.hasError('required')) {
      return controlName === 'confirmPassword' ? 'Confirm your password.' : 'This field is required.';
    }

    if (controlName === 'newPassword') {
      if (control.hasError('maxlength')) return 'Must not exceed 255 characters.';
      if (control.hasError('minlength')) return 'Use at least 8 characters.';
      if (control.hasError('uppercase')) return 'Add an uppercase letter.';
      if (control.hasError('lowercase')) return 'Add a lowercase letter.';
      if (control.hasError('number')) return 'Add a number.';
      if (control.hasError('special')) return 'Add a special character.';
    }

    if (controlName === 'confirmPassword' && this.passwordForm.hasError('mismatch')) {
      return 'Passwords do not match.';
    }

    return '';
  }

  private applyProfileFieldErrors(fieldErrors: Readonly<Record<string, string>>): void {
    for (const [field, message] of Object.entries(fieldErrors)) {
      if (field === 'name' || field === 'phone' || field === 'preferredLanguage') {
        this.profileForm.controls[field].setErrors({
          ...this.profileForm.controls[field].errors,
          backend: message,
        });
        this.profileForm.controls[field].markAsTouched();
      }
    }
  }

  private applyAddressFieldErrors(fieldErrors: Readonly<Record<string, string>>): void {
    for (const [field, message] of Object.entries(fieldErrors)) {
      if (field === 'label' || field === 'city' || field === 'zone' || field === 'addressLine') {
        this.addressForm.controls[field].setErrors({
          ...this.addressForm.controls[field].errors,
          backend: message,
        });
        this.addressForm.controls[field].markAsTouched();
      }
    }
  }

  private clearAvatarPreview(): void {
    this.selectedAvatarFile = null;
    this.avatarPreviewUrl.set(null);
    this.revokeAvatarObjectUrl();
  }

  private revokeAvatarObjectUrl(): void {
    if (!this.avatarObjectUrl) {
      return;
    }

    URL.revokeObjectURL(this.avatarObjectUrl);
    this.avatarObjectUrl = null;
  }
}

function getInitials(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'A';
}

function createAddressForm(): AddressRequest {
  return {
    label: '',
    city: '',
    zone: '',
    addressLine: '',
    isDefault: false,
  };
}
