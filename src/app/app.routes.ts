import { Routes } from '@angular/router';

import { adminGuard, anonymousGuard, authChildGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./layouts/customer/customer-layout').then((component) => component.CustomerLayout),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'home',
      },
      {
        path: 'home',
        title: 'Badran Store | Home',
        loadComponent: () =>
          import('./features/home/home-page').then((component) => component.HomePage),
      },
      {
        path: 'products',
        title: 'Badran Store | Products',
        loadComponent: () =>
          import('./features/products/products-page').then((component) => component.ProductsPage),
      },
      {
        path: 'products/:id',
        title: 'Badran Store | Product Details',
        loadComponent: () =>
          import('./features/products/product-details-page').then(
            (component) => component.ProductDetailsPage,
          ),
      },
      {
        path: 'privacy-policy',
        title: 'Badran Store | Privacy Policy',
        data: { type: 'privacy' },
        loadComponent: () =>
          import('./features/legal/legal-page').then((component) => component.LegalPage),
      },
      {
        path: 'terms',
        title: 'Badran Store | Terms',
        data: { type: 'terms' },
        loadComponent: () =>
          import('./features/legal/legal-page').then((component) => component.LegalPage),
      },
      {
        path: 'login',
        title: 'Badran Store | Login',
        canActivate: [anonymousGuard],
        loadComponent: () =>
          import('./features/auth/pages/login/login-page').then((component) => component.LoginPage),
      },
      {
        path: 'register',
        title: 'Badran Store | Register',
        canActivate: [anonymousGuard],
        loadComponent: () =>
          import('./features/auth/pages/register/register-page').then(
            (component) => component.RegisterPage,
          ),
      },
      {
        path: '',
        canActivateChild: [authChildGuard],
        children: [
          {
            path: 'cart',
            title: 'Badran Store | Cart',
            loadComponent: () =>
              import('./features/cart/cart-page').then((component) => component.CartPage),
          },
          {
            path: 'checkout/success',
            title: 'Badran Store | Checkout Success',
            data: { status: 'success' },
            loadComponent: () =>
              import('./features/checkout/checkout-result-page').then(
                (component) => component.CheckoutResultPage,
              ),
          },
          {
            path: 'checkout/failure',
            title: 'Badran Store | Checkout Failed',
            data: { status: 'failure' },
            loadComponent: () =>
              import('./features/checkout/checkout-result-page').then(
                (component) => component.CheckoutResultPage,
              ),
          },
          {
            path: 'payment/success',
            title: 'Badran Store | Payment Success',
            data: { status: 'success' },
            loadComponent: () =>
              import('./features/checkout/checkout-result-page').then(
                (component) => component.CheckoutResultPage,
              ),
          },
          {
            path: 'payment/cancel',
            title: 'Badran Store | Payment Cancelled',
            data: { status: 'failure' },
            loadComponent: () =>
              import('./features/checkout/checkout-result-page').then(
                (component) => component.CheckoutResultPage,
              ),
          },
          {
            path: 'wishlist',
            title: 'Badran Store | Wishlist',
            loadComponent: () =>
              import('./features/wishlist/wishlist-page').then(
                (component) => component.WishlistPage,
              ),
          },
          {
            path: 'profile',
            title: 'Badran Store | Profile',
            loadComponent: () =>
              import('./features/profile/profile-page').then((component) => component.ProfilePage),
          },
          {
            path: 'orders',
            title: 'Badran Store | Orders',
            loadComponent: () =>
              import('./features/orders/orders-page').then((component) => component.OrdersPage),
          },
          {
            path: 'orders/:id',
            title: 'Badran Store | Order Details',
            loadComponent: () =>
              import('./features/orders/order-details-page').then(
                (component) => component.OrderDetailsPage,
              ),
          },
        ],
      },
    ],
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./layouts/admin/admin-layout').then((component) => component.AdminLayout),
    children: [
      {
        path: '',
        title: 'Badran Store | Admin',
        loadComponent: () =>
          import('./features/admin/admin-page').then((component) => component.AdminPage),
      },
    ],
  },
  {
    path: '403',
    title: 'Badran Store | Access Denied',
    loadComponent: () =>
      import('./features/error/forbidden-page').then((component) => component.ForbiddenPage),
  },
  {
    path: '500',
    title: 'Badran Store | Server Error',
    loadComponent: () =>
      import('./features/error/server-error-page').then((component) => component.ServerErrorPage),
  },
  {
    path: 'offline',
    title: 'Badran Store | Offline',
    loadComponent: () =>
      import('./features/error/offline-page').then((component) => component.OfflinePage),
  },
  {
    path: '**',
    title: 'Badran Store | Page Not Found',
    loadComponent: () =>
      import('./features/error/not-found-page').then((component) => component.NotFoundPage),
  },
];
