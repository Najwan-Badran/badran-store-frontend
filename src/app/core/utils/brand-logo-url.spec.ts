import { resolveBrandLogoUrl } from './brand-logo-url';

describe('resolveBrandLogoUrl', () => {
  it('builds backend URLs for API brand asset paths', () => {
    expect(resolveBrandLogoUrl('/assets/brands/meguiars.png')).toBe('http://localhost:8080/assets/brands/meguiars.png');
  });

  it('keeps missing and absolute logo URLs unchanged', () => {
    expect(resolveBrandLogoUrl(null)).toBeNull();
    expect(resolveBrandLogoUrl('https://cdn.example.test/brand.png')).toBe('https://cdn.example.test/brand.png');
  });
});
