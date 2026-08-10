export function createMemoryStorage(): Storage {
  const entries = new Map<string, string>();

  return {
    get length() {
      return entries.size;
    },
    clear: () => entries.clear(),
    getItem: (key: string) => entries.get(key) ?? null,
    key: (index: number) => Array.from(entries.keys())[index] ?? null,
    removeItem: (key: string) => {
      entries.delete(key);
    },
    setItem: (key: string, value: string) => {
      entries.set(key, value);
    },
  };
}

export function installMemoryStorage(): Storage {
  const storage = createMemoryStorage();

  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: storage,
  });

  return storage;
}

export function uninstallMemoryStorage(): void {
  Reflect.deleteProperty(globalThis, 'localStorage');
}

export function createJwt(payload: object): string {
  return `header.${base64UrlEncode(JSON.stringify(payload))}.signature`;
}

export function createJwtPayload(overrides: Partial<JwtTestPayload> = {}): JwtTestPayload {
  return {
    sub: 'customer@example.com',
    userId: 2,
    role: 'customer',
    iat: nowInSeconds() - 60,
    exp: nowInSeconds() + 3600,
    ...overrides,
  };
}

export function nowInSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

interface JwtTestPayload {
  readonly sub: string;
  readonly userId: number;
  readonly role: string;
  readonly iat: number;
  readonly exp: number;
}

function base64UrlEncode(value: string): string {
  return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
