import { Routes } from '@angular/router';
import { authGuard } from './shared/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'web/dashboard', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./web/pages/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('./web/pages/register/register.component').then(m => m.RegisterComponent)
  },
  {
    path: 'web',
    loadChildren: () => import('./web/web.routes').then(m => m.WEB_ROUTES)
  },
  {
    path: 'mobile',
    loadChildren: () => import('./mobile/mobile.routes').then(m => m.MOBILE_ROUTES),
    canActivate: [authGuard]
  },
  { path: 'dashboard', redirectTo: 'web/dashboard', pathMatch: 'full' },
  { path: 'customers', redirectTo: 'web/customers', pathMatch: 'full' },
  { path: 'repair-jobs', redirectTo: 'web/repair-jobs', pathMatch: 'full' },
  { path: 'inventory', redirectTo: 'web/inventory', pathMatch: 'full' },
  { path: 'settings', redirectTo: 'web/settings', pathMatch: 'full' },
  
  // Public Customer QR Menu
  {
    path: 't/:token',
    loadComponent: () => import('./public/customer-menu/customer-menu.component').then(m => m.CustomerMenuComponent)
  },

  { path: '**', redirectTo: 'login' }
];
