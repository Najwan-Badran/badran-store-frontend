#!/bin/sh
set -eu

: "${API_BASE_URL:=/api}"
: "${API_PROXY_PASS:=http://backend:8080/api/}"
: "${CSP_CONNECT_SRC:=}"
: "${NGINX_PORT:=8080}"

export API_BASE_URL
export API_PROXY_PASS
export CSP_CONNECT_SRC
export NGINX_PORT

envsubst '${API_BASE_URL}' \
  < /usr/share/nginx/html/env.template.js \
  > /usr/share/nginx/html/env.js

envsubst '${API_PROXY_PASS} ${CSP_CONNECT_SRC} ${NGINX_PORT}' \
  < /etc/nginx/templates/default.conf.template \
  > /etc/nginx/conf.d/default.conf
