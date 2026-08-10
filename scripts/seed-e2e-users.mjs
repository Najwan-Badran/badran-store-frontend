import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

loadEnv();

const apiBaseUrl = normalizeBaseUrl(process.env.E2E_API_BASE_URL || 'http://localhost:8080/api');
const customer = readCredentials('E2E_CUSTOMER');
const admin = readCredentials('E2E_ADMIN');

await ensureCustomer();
await ensureAdmin();

console.log('E2E users are ready.');

async function ensureCustomer() {
  const loginResult = await tryLogin(customer);

  if (loginResult.ok) {
    console.log(`Customer login verified: ${customer.email}`);
    return;
  }

  await request('/v1/auth/register', {
    method: 'POST',
    body: {
      name: 'E2E Customer',
      email: customer.email,
      phone: '+970599100100',
      password: customer.password,
      preferredLanguage: 'en',
    },
    allowStatuses: [200, 400],
  });

  const verifiedLogin = await tryLogin(customer);

  if (!verifiedLogin.ok) {
    throw new Error(`Customer account could not be created or verified: ${verifiedLogin.message}`);
  }

  console.log(`Customer account created: ${customer.email}`);
}

async function ensureAdmin() {
  const loginResult = await tryLogin(admin);

  if (loginResult.ok) {
    console.log(`Admin login verified: ${admin.email}`);
    return;
  }

  const bootstrap = readOptionalCredentials('E2E_BOOTSTRAP_ADMIN');

  if (!bootstrap) {
    throw new Error(
      'Admin account is missing and cannot be created without E2E_BOOTSTRAP_ADMIN_EMAIL ' +
        'and E2E_BOOTSTRAP_ADMIN_PASSWORD for an existing admin account.',
    );
  }

  const bootstrapLogin = await login(bootstrap);
  await request('/v1/admin/users', {
    method: 'POST',
    token: bootstrapLogin.token,
    body: {
      name: 'E2E Admin',
      email: admin.email,
      phone: '+970599100200',
      password: admin.password,
      roleName: 'admin',
      preferredLanguage: 'en',
      isActive: true,
    },
    allowStatuses: [200, 400],
  });

  const verifiedLogin = await tryLogin(admin);

  if (!verifiedLogin.ok) {
    throw new Error(`Admin account could not be created or verified: ${verifiedLogin.message}`);
  }

  console.log(`Admin account created: ${admin.email}`);
}

async function tryLogin(credentials) {
  try {
    await login(credentials);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

async function login(credentials) {
  const response = await request('/v1/auth/login', {
    method: 'POST',
    body: {
      email: credentials.email,
      password: credentials.password,
    },
  });

  const token = response?.data?.token;

  if (typeof token !== 'string' || !token) {
    throw new Error(`Login response for ${credentials.email} did not include a token.`);
  }

  return response.data;
}

async function request(path, options) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: options.method,
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  const allowStatuses = options.allowStatuses || [200];

  if (!allowStatuses.includes(response.status)) {
    const message = payload?.message || payload?.error || response.statusText;
    throw new Error(`${options.method} ${path} failed with ${response.status}: ${message}`);
  }

  return payload;
}

function readCredentials(prefix) {
  const credentials = readOptionalCredentials(prefix);

  if (!credentials) {
    throw new Error(`${prefix}_EMAIL and ${prefix}_PASSWORD are required.`);
  }

  return credentials;
}

function readOptionalCredentials(prefix) {
  const email = process.env[`${prefix}_EMAIL`];
  const password = process.env[`${prefix}_PASSWORD`];

  if (!email || !password) {
    return null;
  }

  return { email, password };
}

function normalizeBaseUrl(value) {
  return value.replace(/\/+$/, '');
}

function loadEnv(envPath = resolve(process.cwd(), '.env')) {
  if (!existsSync(envPath)) {
    return;
  }

  for (const rawLine of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');

    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim().replace(/^(['"])(.*)\1$/, '$2');

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}
