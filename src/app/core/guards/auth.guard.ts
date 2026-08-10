import { CanActivateChildFn, CanActivateFn, Router, RouterStateSnapshot } from '@angular/router';
import { inject } from '@angular/core';

import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.hasValidSession()) {
    return true;
  }

  return createLoginUrlTree(router, state);
};

export const authChildGuard: CanActivateChildFn = (_route, state) => authGuard(_route, state);

export const anonymousGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.hasValidSession() ? router.createUrlTree(['/home']) : true;
};

export const adminGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.hasValidSession()) {
    return createLoginUrlTree(router, state);
  }

  return authService.hasRole('admin') ? true : router.createUrlTree(['/home']);
};

function createLoginUrlTree(router: Router, state: RouterStateSnapshot) {
  return router.createUrlTree(['/login'], {
    queryParams: {
      returnUrl: state.url,
    },
  });
}
