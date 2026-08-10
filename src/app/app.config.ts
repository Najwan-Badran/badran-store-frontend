import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { MAT_SNACK_BAR_DEFAULT_OPTIONS } from '@angular/material/snack-bar';

import { routes } from './app.routes';
import { provideApiConfig, resolveApiConfig } from './core/config/api.config';
import { authTokenInterceptor } from './core/interceptors/auth-token.interceptor';
import { loadingInterceptor } from './core/interceptors/loading.interceptor';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([loadingInterceptor, authTokenInterceptor])),
    provideApiConfig(
      environment.production
        ? resolveApiConfig({
            baseUrl: environment.apiBaseUrl,
          })
        : {
            baseUrl: environment.apiBaseUrl,
          },
    ),
    {
      provide: MAT_SNACK_BAR_DEFAULT_OPTIONS,
      useValue: {
        duration: 3200,
        horizontalPosition: 'end',
        verticalPosition: 'bottom',
      },
    },
  ],
};
