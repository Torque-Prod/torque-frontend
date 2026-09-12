import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ToolbarModule } from 'primeng/toolbar';
import { AvatarModule } from 'primeng/avatar';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { AuthService } from '../../../shared/services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, ToolbarModule, ButtonModule, AvatarModule, MenuModule],
  template: `
    <p-toolbar styleClass="main-nav">
      <div class="p-toolbar-group-start">
        <div class="brand" (click)="router.navigate(['/web/dashboard'])">
          <i class="pi pi-bolt brand-icon"></i>
          <span class="brand-text">REPAIR<b>PRO</b></span>
        </div>
        <div class="nav-links">
          <a routerLink="/web/dashboard" routerLinkActive="active" class="nav-item"><i class="pi pi-home"></i> Dashboard</a>
          <a routerLink="/web/repair-jobs" routerLinkActive="active" class="nav-item"><i class="pi pi-wrench"></i> Jobs</a>
          <a routerLink="/web/customers" routerLinkActive="active" class="nav-item"><i class="pi pi-users"></i> Customers</a>
          <a routerLink="/web/inventory" routerLinkActive="active" class="nav-item"><i class="pi pi-box"></i> Inventory</a>
        </div>
      </div>

      <div class="p-toolbar-group-end">
        <div class="user-info">
          <div class="user-details">
            <span class="username">{{ username }}</span>
            <span class="role">{{ role }}</span>
          </div>
          <p-avatar icon="pi pi-user" shape="circle" styleClass="user-avatar" (click)="menu.toggle($event)" />
          <p-menu #menu [model]="userMenuItems" [popup]="true" />
        </div>
      </div>
    </p-toolbar>
  `,
  styles: [`
    .main-nav {
      background: #1e293b;
      border: none;
      border-radius: 0;
      padding: 0.75rem 2rem;
      position: sticky;
      top: 0;
      z-index: 1000;
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      cursor: pointer;
      margin-right: 3rem;
    }
    .brand-icon {
      font-size: 1.5rem;
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.1);
      padding: 0.5rem;
      border-radius: 12px;
    }
    .brand-text {
      color: #f8fafc;
      font-size: 1.25rem;
      letter-spacing: 0.05em;
    }
    .brand-text b { color: #38bdf8; }

    .nav-links { display: flex; gap: 1rem; align-items: center; }
    .nav-item {
      color: #94a3b8;
      text-decoration: none;
      padding: 0.5rem 1rem;
      border-radius: 8px;
      font-weight: 500;
      font-size: 0.95rem;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .nav-item i { font-size: 1rem; }
    .nav-item:hover { color: #f8fafc; background: rgba(255,255,255,0.05); }
    .nav-item.active { color: #38bdf8; background: rgba(56, 189, 248, 0.1); }

    .user-info { display: flex; align-items: center; gap: 1rem; }
    .user-details { text-align: right; line-height: 1.2; }
    .username { display: block; color: #f8fafc; font-weight: 600; font-size: 0.9rem; }
    .role { display: block; color: #94a3b8; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; }
    
    ::ng-deep .user-avatar { background: #38bdf8; color: #1e293b; cursor: pointer; border: 2px solid rgba(255,255,255,0.1); }
  `]
})
export class NavbarComponent implements OnInit {
  username: string = 'User';
  role: string = 'Staff';
  userMenuItems: MenuItem[] = [];

  constructor(public router: Router, private authService: AuthService) {}

  ngOnInit(): void {
    this.username = this.authService.getUsername() || 'User';
    this.role = this.authService.getRole() || 'Staff';

    this.userMenuItems = [
      { label: 'Profile', icon: 'pi pi-user' },
      { label: 'Settings', icon: 'pi pi-cog' },
      { separator: true },
      { label: 'Logout', icon: 'pi pi-sign-out', command: () => this.authService.logout() }
    ];
  }
}
