import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';

import { API_CONFIG } from '../../../core/config/api.config';

const LEGACY_PRODUCT_IMAGES: Readonly<Record<string, string>> = {
  'flamingo.jpg': '/assets/products/flamingo-foam-cleaner.png',
  'soapwithwakes.jpg': '/assets/products/purple-wax-soap-jug.png',
  'soapwithcoloar.jpg': '/assets/products/blue-cleaner-jug.png',
  'stpeverest.jpg': '/assets/products/everest-silicone-jug.png',
  'd2000.jpg': '/assets/products/d2000-orange-jug.png',
  'airfreshener.jpg': '/assets/products/air-freshener-spray-bundle.png',
  'carsafety.jpg': '/assets/products/car-safety-driving-kit.png',
  'brash.jpg': '/assets/products/car-wash-brush-set.png',
};

const PRODUCT_ASSETS = new Set([
  '12v-car-compressor-box.png',
  '2-blue-cleaner-jug.png',
  'air-freshener-spray-bundle.png',
  'alteco-ap6200-glue-set.png',
  'areon-x-4-scents.png',
  'areon-x-sticks-display-box.png',
  'blue-cleaner-jug.png',
  'blue-green-soap-jug.png',
  'brown-soap-jug.png',
  'car-brand-keychain-set.png',
  'car-floor-mat-set-4pc.png',
  'car-floor-mat-set.png',
  'car-keychains-and-antenna-set.png',
  'car-safety-driving-kit.png',
  'car-seat-cushion-set.png',
  'car-wash-brush-set.png',
  'cardboard-protective-sheet.png',
  'd2000-orange-jug.png',
  'dark-cleaner-jug.png',
  'door-seal-rolls-4-colors.png',
  'everest-blanco-silicone-jug.png',
  'everest-silicone-jug.png',
  'everest-skye-400-jug.png',
  'five-detailing-brush-set.png',
  'flamingo-foam-cleaner.png',
  'formula-77-blue-jug.png',
  'green-shampoo-jug.png',
  'green-stp-jug.png',
  'leyo-black-silicone-jug.png',
  'pink-dumer-jug.png',
  'pink-soap-jug.png',
  'purple-wax-soap-jug.png',
  'spray-cleaner-set.png',
  'warning-alarm-electronic-horn.png',
  'zohar-dalia-stp-blue-jug.png',
]);
const IMAGE_FADE_READY_DELAY_MS = 120;

@Component({
  selector: 'app-product-image',
  templateUrl: './product-image.html',
  styleUrl: './product-image.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductImage {
  private readonly apiConfig = inject(API_CONFIG);

  readonly src = input<string | null | undefined>(null);
  readonly alt = input('');
  readonly loading = input<'eager' | 'lazy'>('lazy');
  readonly fetchPriority = input<'high' | 'low' | 'auto'>('auto');
  readonly compact = input(false);

  protected readonly failedUrl = signal<string | null>(null);
  protected readonly loadedUrl = signal<string | null>(null);
  protected readonly imageUrl = computed(() => {
    const source = resolveProductImageUrl(this.src(), this.apiConfig.baseUrl);
    return source && source !== this.failedUrl() ? source : null;
  });

  protected markImageLoaded(url: string): void {
    window.setTimeout(() => this.loadedUrl.set(url), IMAGE_FADE_READY_DELAY_MS);
  }

  protected markImageFailed(url: string | null): void {
    this.failedUrl.set(url);
  }
}

function resolveProductImageUrl(url: string | null | undefined, apiBaseUrl: string): string | null {
  const normalizedUrl = url?.trim();

  if (!normalizedUrl) {
    return null;
  }

  const filename = getFilename(normalizedUrl);
  const legacyAsset = LEGACY_PRODUCT_IMAGES[filename];

  if (legacyAsset) {
    return legacyAsset;
  }

  if (isKnownProductAssetFilename(normalizedUrl, filename)) {
    return `/assets/products/${filename}`;
  }

  if (isFrontendAssetUrl(normalizedUrl)) {
    return normalizedUrl.startsWith('/') ? normalizedUrl : `/${normalizedUrl}`;
  }

  if (isAbsoluteUrl(normalizedUrl)) {
    return normalizedUrl;
  }

  if (normalizedUrl.startsWith('/')) {
    return joinUrl(apiBaseUrl, normalizedUrl);
  }

  return joinUrl(apiBaseUrl, normalizedUrl);
}

function isKnownProductAssetFilename(url: string, filename: string): boolean {
  return PRODUCT_ASSETS.has(filename) && url === filename;
}

function isFrontendAssetUrl(url: string): boolean {
  return url.startsWith('/assets/') || url.startsWith('assets/');
}

function isAbsoluteUrl(url: string): boolean {
  return /^(?:https?:)?\/\//i.test(url) || /^(?:data|blob):/i.test(url);
}

function joinUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}

function getFilename(url: string): string {
  const withoutQuery = url.split(/[?#]/, 1)[0];
  return withoutQuery.slice(withoutQuery.lastIndexOf('/') + 1).toLowerCase();
}
