import { AbstractControl, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';

export const PHONE_VALIDATION_MESSAGE =
  'Use +9705XXXXXXXX, 059XXXXXXX, 056XXXXXXX, or a valid international phone number.';

export function phoneValidator(): ValidatorFn {
  return (control: AbstractControl<string | null>): ValidationErrors | null => {
    const value = control.value?.trim();

    if (!value) {
      return null;
    }

    return isValidPhoneNumber(value) ? null : { phone: true };
  };
}

export function strongPasswordValidator(): ValidatorFn {
  return (control: AbstractControl<string | null>): ValidationErrors | null => {
    const value = control.value ?? '';

    if (!value) {
      return null;
    }

    const errors: ValidationErrors = {};

    if (value.length < 8) errors['minlength'] = { requiredLength: 8, actualLength: value.length };
    if (!/[A-Z]/.test(value)) errors['uppercase'] = true;
    if (!/[a-z]/.test(value)) errors['lowercase'] = true;
    if (!/\d/.test(value)) errors['number'] = true;
    if (!/[^A-Za-z0-9]/.test(value)) errors['special'] = true;

    return Object.keys(errors).length ? errors : null;
  };
}

export function matchingControlsValidator(controlName: string, matchingControlName: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const source = control.get(controlName);
    const target = control.get(matchingControlName);

    if (!source || !target || !target.value) {
      return null;
    }

    return source.value === target.value ? null : { mismatch: true };
  };
}

export function addressTextValidators() {
  return [Validators.required, Validators.minLength(2), Validators.maxLength(255)];
}

export function passwordStrength(value: string): 'empty' | 'weak' | 'medium' | 'strong' {
  if (!value) {
    return 'empty';
  }

  let score = 0;
  if (value.length >= 8) score += 1;
  if (/[A-Z]/.test(value)) score += 1;
  if (/[a-z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;

  if (score >= 5) {
    return 'strong';
  }

  return score >= 3 ? 'medium' : 'weak';
}

export function normalizePhoneNumber(value: string | null | undefined): string | undefined {
  const normalized = value?.replace(/[\s()-]/g, '').trim();

  if (!normalized) {
    return undefined;
  }

  if (/^0(59|56)\d{7}$/.test(normalized)) {
    return `+970${normalized.slice(1)}`;
  }

  return normalized;
}

export function isValidPhoneNumber(value: string): boolean {
  const normalized = value.replace(/[\s()-]/g, '').trim();
  const palestineLocalPattern = /^0(59|56)\d{7}$/;
  const palestineInternationalPattern = /^\+9705\d{8}$/;
  const internationalPattern = /^\+[1-9]\d{7,14}$/;

  return (
    palestineLocalPattern.test(normalized) ||
    palestineInternationalPattern.test(normalized) ||
    internationalPattern.test(normalized)
  );
}
