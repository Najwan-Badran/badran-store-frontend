# Badran Store Frontend Deployment

## Production Build

```bash
npm ci
npm run build:production
```

The production artifact is generated in:

```text
dist/badran-store-frontend/browser
```

## Runtime Environment

The Docker image supports runtime configuration through environment variables:

| Variable | Default | Purpose |
| --- | --- | --- |
| `API_BASE_URL` | `/api` | Browser-facing API base URL used by Angular runtime config. |
| `API_PROXY_PASS` | `http://backend:8080/api/` | Internal Nginx upstream for `/api/` requests. |
| `CSP_CONNECT_SRC` | empty | Extra `connect-src` origins for Content Security Policy. |
| `NGINX_PORT` | `8080` | Container listen port. |
| `FRONTEND_PORT` | `8080` | Host port in `compose.prod.yml`. |

Runtime config is generated into `/env.js` at container startup from `public/env.template.js`.

## Docker

Build:

```bash
docker build -t badran-store-frontend:production .
```

Run:

```bash
docker run --rm -p 8080:8080 \
  -e API_BASE_URL=/api \
  -e API_PROXY_PASS=http://host.docker.internal:8080/api/ \
  badran-store-frontend:production
```

## Docker Compose

```bash
docker compose -f compose.prod.yml up --build
```

Health check:

```bash
curl http://localhost:8080/healthz
```

Expected response:

```text
ok
```

## Nginx Production Features

- SPA fallback routing to `index.html`.
- Gzip compression for text, CSS, JS, JSON, SVG, fonts, and WASM.
- Immutable one-year caching for hashed static assets.
- No-store caching for `index.html`, `/env.js`, and `/healthz`.
- Security headers:
  - `Content-Security-Policy`
  - `X-Content-Type-Options`
  - `X-Frame-Options`
  - `Referrer-Policy`
  - `Permissions-Policy`
- Reverse proxy for `/api/` to the Spring Boot backend.

## CI/CD

GitHub Actions workflow:

```text
.github/workflows/frontend-ci.yml
```

Pipeline stages:

1. Install dependencies with `npm ci`.
2. Run unit tests with `npm run test:ci`.
3. Build production bundle with `npm run build:production`.
4. Install Chromium for Playwright.
5. Run E2E smoke tests with `npm run e2e`.
6. Upload the compiled frontend artifact.
7. Build and push Docker image to GitHub Container Registry on non-PR events.

## E2E Runtime

By default, Playwright starts the Angular dev server on `http://127.0.0.1:4200`. Copy `.env.example` to `.env`
for local authenticated E2E credentials. `E2E_API_BASE_URL` defaults to `http://localhost:8080/api` when omitted.
To run against an already deployed frontend, set:

```bash
E2E_BASE_URL=https://store.example.com npm run e2e
```

Authenticated customer and admin E2E flows use real backend authentication and require credentials:

```bash
E2E_CUSTOMER_EMAIL=customer@example.com \
E2E_CUSTOMER_PASSWORD='customer-password' \
E2E_ADMIN_EMAIL=admin@example.com \
E2E_ADMIN_PASSWORD='admin-password' \
npm run e2e
```

To create or verify the accounts through the existing backend APIs, run:

```bash
npm run e2e:seed
```

`npm run e2e` runs this seed step automatically before Playwright. The seed command uses
`POST /api/v1/auth/register` for the customer account. Admin creation requires an existing admin account
because `POST /api/v1/admin/users` is protected; set `E2E_BOOTSTRAP_ADMIN_EMAIL` and
`E2E_BOOTSTRAP_ADMIN_PASSWORD` when the target admin account does not already exist.

## Deployment Checklist

- Set production backend URL through `API_PROXY_PASS`.
- Set `CSP_CONNECT_SRC` when the browser must call an external API origin directly.
- Keep TLS termination at the platform/load-balancer layer or an outer reverse proxy.
- Verify `/healthz`.
- Verify browser loads `/env.js`.
- Verify deep links such as `/products/1` and `/admin`.
- Verify authenticated API calls forward through `/api/`.
