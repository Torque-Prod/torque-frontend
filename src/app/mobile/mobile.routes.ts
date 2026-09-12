import { Routes } from '@angular/router';
import { MobileShellComponent } from './mobile-shell/mobile-shell.component';

export const MOBILE_ROUTES: Routes = [
  {
    path: '',
    component: MobileShellComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'home', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./screens/mobile-home/mobile-home.component').then(m => m.MobileHomeComponent)
      }
    ]
  }
];
