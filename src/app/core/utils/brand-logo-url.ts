import { environment } from '../../../environments/environment';

export function resolveBrandLogoUrl(url: string | null | undefined): string | null {
  const normalizedUrl = url?.trim();

  if (!normalizedUrl) {
    return null;
  }

  if (isAbsoluteUrl(normalizedUrl)) {
    return normalizedUrl;
  }

  if (normalizedUrl.startsWith('/') || normalizedUrl.startsWith('assets/')) {
    return joinUrl(getBackendBaseUrl(environment.apiBaseUrl), normalizedUrl);
  }

  return normalizedUrl;
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
