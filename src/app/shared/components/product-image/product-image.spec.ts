import { TestBed } from '@angular/core/testing';

import { provideApiConfig } from '../../../core/config/api.config';
import { ProductImage } from './product-image';

describe('ProductImage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductImage],
      providers: [provideApiConfig({ baseUrl: 'http://localhost:8080/api' })],
    }).compileComponents();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('does not rewrite backend image URLs through the legacy filename map', () => {
    const fixture = TestBed.createComponent(ProductImage);
    fixture.componentRef.setInput('src', 'http://localhost:8080/assets/products/logo.jpg');
    fixture.componentRef.setInput('alt', 'Product');
    fixture.detectChanges();

    const image = fixture.nativeElement.querySelector('img') as HTMLImageElement | null;

    expect(image?.getAttribute('src')).toBe('http://localhost:8080/assets/products/logo.jpg');
  });

  it('uses the legacy asset only after the backend image fails', () => {
    const fixture = TestBed.createComponent(ProductImage);
    fixture.componentRef.setInput('src', 'http://localhost:8080/assets/products/logo.jpg');
    fixture.componentRef.setInput('alt', 'Product');
    fixture.detectChanges();

    const image = fixture.nativeElement.querySelector('img') as HTMLImageElement;
    image.dispatchEvent(new Event('error'));
    fixture.detectChanges();

    const fallbackImage = fixture.nativeElement.querySelector('img') as HTMLImageElement | null;

    expect(fallbackImage?.getAttribute('src')).toBe('/assets/products/cardboard-protective-sheet.png');
  });
});
