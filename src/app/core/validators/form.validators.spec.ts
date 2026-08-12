import {
  isValidPhoneNumber,
  normalizePhoneNumber,
  passwordStrength,
  strongPasswordValidator,
} from './form.validators';

describe('form validators', () => {
  it('validates supported Palestinian and international phone formats', () => {
    expect(isValidPhoneNumber('+970599123456')).toBe(true);
    expect(isValidPhoneNumber('+970591234567')).toBe(true);
    expect(isValidPhoneNumber('+972501234567')).toBe(true);
    expect(isValidPhoneNumber('0591234567')).toBe(true);
    expect(isValidPhoneNumber('0561234567')).toBe(true);
    expect(isValidPhoneNumber('+14155552671')).toBe(true);
    expect(isValidPhoneNumber('0512345678')).toBe(false);
    expect(isValidPhoneNumber('059ABC12345')).toBe(false);
    expect(isValidPhoneNumber('05612x3456')).toBe(false);
    expect(isValidPhoneNumber('+97059A123456')).toBe(false);
    expect(isValidPhoneNumber('++970599999999')).toBe(false);
  });

  it('normalizes local Palestinian mobile numbers before submit', () => {
    expect(normalizePhoneNumber('0591234567')).toBe('+970591234567');
    expect(normalizePhoneNumber('0561234567')).toBe('+970561234567');
    expect(normalizePhoneNumber('+970591234567')).toBe('+970591234567');
    expect(normalizePhoneNumber('+972501234567')).toBe('+972501234567');
    expect(normalizePhoneNumber('+14155552671')).toBe('+14155552671');
    expect(normalizePhoneNumber('')).toBeUndefined();
    expect(normalizePhoneNumber('059ABC12345')).toBeUndefined();
    expect(normalizePhoneNumber('++970599999999')).toBeUndefined();
  });

  it('requires strong passwords for production forms', () => {
    const validator = strongPasswordValidator();

    expect(validator({ value: 'Weak1234' } as never)).toEqual({ special: true });
    expect(validator({ value: 'Strong!123' } as never)).toBeNull();
    expect(passwordStrength('Strong!123')).toBe('strong');
  });
});
