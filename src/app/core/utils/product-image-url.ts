import { ProductDto } from '../models/product.models';
import { environment } from '../../../environments/environment';

type ProductImageRecord = Record<string, unknown>;

const DIRECT_IMAGE_FIELDS = ['image', 'imageUrl', 'image_url', 'thumbnail'] as const;
const COLLECTION_IMAGE_FIELDS = ['url', 'image', 'imageUrl', 'image_url', 'thumbnail', 'src', 'path'] as const;

export function getPrimaryProductImageUrl(product: ProductDto): string | null {
  const productRecord = product as unknown as ProductImageRecord;

  for (const field of DIRECT_IMAGE_FIELDS) {
    const value = asNonEmptyString(productRecord[field]);

    if (value) {
      return resolveProductImageUrl(value);
    }
  }

  return getFirstCollectionImage(productRecord['images']) ?? getFirstCollectionImage(productRecord['media']);
}

export function getProductGalleryImageUrls(product: ProductDto): readonly string[] {
  const productRecord = product as unknown as ProductImageRecord;
  const images = getCollectionImageUrls(productRecord['images']);

  return images.length ? images : getCollectionImageUrls(productRecord['media']);
}

function getFirstCollectionImage(value: unknown): string | null {
  return getCollectionImageUrls(value)[0] ?? null;
}

function getCollectionImageUrls(value: unknown): readonly string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...value]
    .sort(compareImageSortOrder)
    .map((image) => getImageUrl(image))
    .filter((url): url is string => url !== null);
}

function getImageUrl(image: unknown): string | null {
  if (typeof image === 'string') {
    const value = asNonEmptyString(image);

    return value ? resolveProductImageUrl(value) : null;
  }

  if (!image || typeof image !== 'object') {
    return null;
  }

  const imageRecord = image as ProductImageRecord;

  for (const field of COLLECTION_IMAGE_FIELDS) {
    const value = asNonEmptyString(imageRecord[field]);

    if (value) {
      return resolveProductImageUrl(value);
    }
  }

  return null;
}

function resolveProductImageUrl(url: string): string {
  if (isAbsoluteUrl(url)) {
    return url;
  }

  if (url.startsWith('/') || url.startsWith('assets/')) {
    return joinUrl(getBackendBaseUrl(environment.apiBaseUrl), url);
  }

  return url;
}

function isAbsoluteUrl(url: string): boolean {
  return /^(?:https?:)?\/\//i.test(url) || /^(?:data|blob):/i.test(url);
}

function getBackendBaseUrl(apiBaseUrl: string): string {
  return apiBaseUrl.replace(/\/api(?:\/.*)?$/i, '');
}

function joinUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}

function compareImageSortOrder(first: unknown, second: unknown): number {
  return getSortOrder(first) - getSortOrder(second);
}

function getSortOrder(image: unknown): number {
  if (!image || typeof image !== 'object') {
    return 0;
  }

  const value = Number((image as ProductImageRecord)['sortOrder']);

  return Number.isFinite(value) ? value : 0;
}

function asNonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}
