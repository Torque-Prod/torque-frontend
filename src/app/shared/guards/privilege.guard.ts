import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const privilegeGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const expectedPrivilege = route.data['privilege'];

  if (!authService.isLoggedIn()) {
    router.navigate(['/login']);
    return false;
  }

  if (expectedPrivilege && !authService.hasPrivilege(expectedPrivilege)) {
    // Optionally navigate to an 'unauthorized' page or dashboard
    router.navigate(['/dashboard']);
    return false;
  }

  return true;
};
