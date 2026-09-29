import { Routes } from '@angular/router';
import { authGuard } from '../shared/guards/auth.guard';
import { privilegeGuard } from '../shared/guards/privilege.guard';
import { WebLayoutComponent } from './web-layout.component';

export const WEB_ROUTES: Routes = [
  {
    path: '',
    component: WebLayoutComponent,
    canActivateChild: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'customers',
        canActivate: [privilegeGuard],
        data: { privilege: 'READ_CUSTOMER' },
        loadComponent: () => import('./pages/customers/customers.component').then(m => m.CustomersComponent)
      },
      {
        path: 'repair-jobs',
        canActivate: [privilegeGuard],
        data: { privilege: 'READ_JOB' },
        loadComponent: () => import('./pages/repair-jobs/repair-jobs.component').then(m => m.RepairJobsComponent)
      },
      {
        path: 'inventory',
        loadComponent: () => import('./pages/inventory/inventory.component').then(m => m.InventoryComponent)
      },
      {
        path: 'sales',
        loadComponent: () => import('./pages/sales/sales.component').then(m => m.SalesComponent)
      },
      {
        path: 'staff',
        loadComponent: () => import('./pages/staff/staff.component').then(m => m.StaffComponent)
      },
      {
        path: 'settings',
        loadComponent: () => import('./pages/settings/settings.component').then(m => m.SettingsComponent)
      },
      {
        path: 'roles',
        canActivate: [privilegeGuard],
        data: { privilege: 'MANAGE_ROLES' },
        loadComponent: () => import('./pages/roles/roles.component').then(m => m.RolesComponent)
      },
      {
        path: 'restaurant-menu',
        loadComponent: () => import('./pages/restaurant-menu/restaurant-menu.component').then(m => m.RestaurantMenuComponent)
      },
      {
        path: 'restaurant-tables',
        loadComponent: () => import('./pages/restaurant-tables/restaurant-tables.component').then(m => m.RestaurantTablesComponent)
      }
    ]
  }
];
