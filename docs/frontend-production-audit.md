# Frontend Production Audit

Date: 2026-08-06

## Backend Contract Audit

The frontend API calls were compared with the sibling Spring backend controllers and DTOs under `../badran-store-backend`.

### Confirmed Backend APIs

- Auth: `POST /api/v1/auth/login`, `POST /api/v1/auth/register`, `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout`, `POST /api/v1/auth/logout-all`, `POST /api/v1/auth/verify-email`, `POST /api/v1/auth/forgot-password`, `POST /api/v1/auth/reset-password`, `GET /api/v1/auth/me`.
- Catalog: `GET /api/v1/products`, `GET /api/v1/products/{id}`, `GET /api/v1/categories`, `GET /api/v1/categories/{categoryId}`, `GET /api/v1/brands`, `GET /api/v1/brands/{brandId}`, `GET /api/v1/reviews/product/{productId}`, `POST /api/v1/reviews/product/{productId}`.
- Coupons: `POST /api/v1/coupons/validate`.
- Cart: `GET /api/v1/cart`, `POST /api/v1/cart/items`, `DELETE /api/v1/cart/items/{productId}`, `DELETE /api/v1/cart`.
- Orders: `POST /api/v1/orders`, `GET /api/v1/orders`, `GET /api/v1/orders/{orderId}`, `POST /api/v1/orders/{orderId}/payment`, `POST /api/v1/orders/{orderId}/cancel`.
- Payments: `POST /api/v1/payments/stripe/checkout-sessions`, `POST /api/v1/payments/stripe/payment-intents`, `POST /api/v1/payments/stripe/success`, `POST /api/v1/payments/stripe/failure`, `POST /api/v1/payments/stripe/refunds`, `POST /api/v1/payments/paypal/payments`, `POST /api/v1/payments/paypal/capture`.
- Profile: `PUT /api/v1/profile`, `POST /api/v1/profile/avatar`, `DELETE /api/v1/profile/avatar`, `GET/POST /api/v1/profile/addresses`, `PUT/DELETE /api/v1/profile/addresses/{addressId}`, `PUT /api/v1/profile/addresses/{addressId}/default`.
- Admin: dashboard reports, paginated products, categories, brands, coupons, orders, users, detail reads, and admin order status updates.

### Missing APIs

None identified in the current backend contract.

### Missing DTOs / Request Models / Response Models

None identified in the current backend contract.

### Missing Validation Rules

None identified in the current backend contract.

## Frontend Integration Status

The backend now exposes coupon validation, avatar upload/delete, customer order cancellation, refresh-token rotation, and logout endpoints. The Angular services are wired to those real endpoints.
