import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { lastValueFrom } from 'rxjs';
import { AuthService } from './auth.service';
import { ApiService } from './api.service';

export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const api = inject(ApiService);

  if (!auth.getToken()) {
    return router.createUrlTree(['/login']);
  }

  if (!auth.user()) {
    try {
      const user = await lastValueFrom(api.profile());
      auth.setUser(user);
    } catch {
      auth.logout();
      return router.createUrlTree(['/login']);
    }
  }

  return true;
};

export const adminGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const api = inject(ApiService);

  if (!auth.getToken()) {
    return router.createUrlTree(['/login']);
  }

  if (!auth.user()) {
    try {
      const user = await lastValueFrom(api.profile());
      auth.setUser(user);
    } catch {
      auth.logout();
      return router.createUrlTree(['/login']);
    }
  }

  if (auth.user()?.role === 'admin') {
    return true;
  }
  return router.createUrlTree(['/']);
};
