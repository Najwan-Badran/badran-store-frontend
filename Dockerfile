FROM node:24.15.0-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build -- --configuration production

FROM nginx:1.29-alpine AS runtime

ENV API_BASE_URL=/api
ENV NGINX_PORT=8080
ENV CSP_CONNECT_SRC=

COPY nginx/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY docker/entrypoint.sh /docker-entrypoint.d/40-badran-runtime-config.sh
COPY --from=build /app/dist/badran-store-frontend/browser /usr/share/nginx/html

RUN chmod +x /docker-entrypoint.d/40-badran-runtime-config.sh

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:${NGINX_PORT}/healthz || exit 1
