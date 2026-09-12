import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../shared/services/auth.service';
import { RepairJobService } from '../../../shared/services/repair-job.service';
import { PartService } from '../../../shared/services/part.service';
import { MenuService, MenuItem } from '../../../shared/services/menu.service';
import { forkJoin } from 'rxjs';

interface MenuSection {
  label: string;
  items: MenuItem[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <aside class="sidebar">
      <div class="sidebar-header" (click)="router.navigate(['/web/dashboard'])">
        <div class="brand-icon"><i class="pi pi-bolt"></i></div>
        <div class="brand-text">TOR<b>QUE</b></div>
      </div>

      <div class="sidebar-scroll">
        <div class="nav-section" *ngFor="let section of menuSections">
          <span class="section-label">{{ section.label }}</span>
          
          <a *ngFor="let item of section.items"
             [routerLink]="getRouterLink(item.routerLink)" 
             [queryParams]="getQueryParams(item.routerLink)"
             routerLinkActive="active" 
             class="nav-item">
            <i [class]="item.icon"></i> {{ item.label }}
            <span *ngIf="item.badgeType" [class]="getBadgeClass(item.badgeType)">
              {{ getBadgeValue(item.badgeType) }}
            </span>
          </a>
        </div>
      </div>

      <div class="sidebar-footer">
        <div class="user-profile" (click)="logout()">
          <div class="avatar">{{ username.charAt(0).toUpperCase() }}</div>
          <div class="user-info">
            <span class="username">{{ username }}</span>
            <span class="role">{{ role }}</span>
          </div>
          <i class="pi pi-sign-out logout-icon" title="Logout"></i>
        </div>
      </div>
    </aside>
  `,
  styles: [`
    .sidebar {
      width: 260px;
      height: 100vh;
      background: #0f172a;
      color: #94a3b8;
      display: flex;
      flex-direction: column;
      border-right: 1px solid #1e293b;
      position: sticky;
      top: 0;
    }

    .sidebar-header {
      height: 70px;
      display: flex;
      align-items: center;
      padding: 0 1.5rem;
      gap: 0.75rem;
      cursor: pointer;
      border-bottom: 1px solid #1e293b;
      flex-shrink: 0;
    }
    .brand-icon {
      width: 32px;
      height: 32px;
      background: #2563eb;
      color: #fff;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.1rem;
    }
    .brand-text {
      color: #f8fafc;
      font-size: 1.25rem;
      letter-spacing: 0.05em;
    }
    .brand-text b { color: #38bdf8; }

    .sidebar-scroll {
      flex: 1;
      overflow-y: auto;
      padding: 1.5rem 1rem;
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }
    .sidebar-scroll::-webkit-scrollbar { width: 4px; }
    .sidebar-scroll::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }

    .nav-section { display: flex; flex-direction: column; gap: 0.25rem; }
    .section-label {
      font-size: 0.65rem;
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      padding: 0 0.75rem;
      margin-bottom: 0.5rem;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.65rem 0.75rem;
      color: #94a3b8;
      text-decoration: none;
      border-radius: 8px;
      font-size: 0.875rem;
      font-weight: 500;
      transition: all 0.2s;
      cursor: pointer;
    }
    .nav-item i { font-size: 1.1rem; width: 20px; text-align: center; }
    .nav-item:hover:not(.disabled) { color: #f8fafc; background: #1e293b; }
    .nav-item.active { color: #38bdf8; background: rgba(56, 189, 248, 0.1); font-weight: 600; }
    .nav-item.disabled { opacity: 0.5; cursor: not-allowed; }

    .badge {
      margin-left: auto;
      font-size: 0.7rem;
      font-weight: 700;
      padding: 0.15rem 0.4rem;
      border-radius: 999px;
      color: #fff;
    }
    .badge-blue { background: #2563eb; }
    .badge-amber { background: #d97706; }

    .sidebar-footer {
      padding: 1rem;
      border-top: 1px solid #1e293b;
      flex-shrink: 0;
    }
    .user-profile {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem;
      background: #1e293b;
      border-radius: 10px;
      cursor: pointer;
      transition: background 0.2s;
    }
    .user-profile:hover { background: #334155; }
    .avatar {
      width: 36px;
      height: 36px;
      background: #38bdf8;
      color: #0f172a;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 1.1rem;
      flex-shrink: 0;
    }
    .user-info { display: flex; flex-direction: column; flex: 1; overflow: hidden; }
    .username { color: #f8fafc; font-weight: 600; font-size: 0.85rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .role { color: #64748b; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; }
    .logout-icon { color: #64748b; font-size: 1.1rem; }
    .user-profile:hover .logout-icon { color: #ef4444; }
  `]
})
export class SidebarComponent implements OnInit {
  username = 'User';
  role = 'Staff';
  activeJobs = 0;
  lowStock = 0;
  menuSections: MenuSection[] = [];

  constructor(
    public router: Router,
    private authService: AuthService,
    private repairJobService: RepairJobService,
    private partService: PartService,
    private menuService: MenuService
  ) {}

  ngOnInit(): void {
    this.username = this.authService.getUsername() || 'User';
    this.role = this.authService.getRole() || 'Staff';

    // Fetch badges
    forkJoin({
      jobs: this.repairJobService.getAll(),
      parts: this.partService.getAll()
    }).subscribe(res => {
      this.activeJobs = res.jobs.filter(j => j.status !== 'DELIVERED').length;
      this.lowStock = res.parts.filter(p => p.stockQuantity <= 5).length;
    });

    // Fetch dynamic menus
    this.menuService.getMenus().subscribe(items => {
      const grouped = items.reduce((acc, item) => {
        if (!acc[item.section]) acc[item.section] = [];
        acc[item.section].push(item);
        return acc;
      }, {} as { [key: string]: MenuItem[] });

      this.menuSections = Object.keys(grouped).map(key => ({
        label: key,
        items: grouped[key]
      }));
    });
  }
  
  getRouterLink(link: string): string[] {
    return [link.split('?')[0]];
  }

  getQueryParams(link: string): any {
    if (!link.includes('?')) return null;
    const queryString = link.split('?')[1];
    const urlParams = new URLSearchParams(queryString);
    const params: any = {};
    urlParams.forEach((value, key) => {
      params[key] = value;
    });
    return params;
  }

  getBadgeValue(badgeType: string): string {
    if (badgeType === 'activeJobs' && this.activeJobs > 0) return this.activeJobs.toString();
    if (badgeType === 'lowStock' && this.lowStock > 0) return this.lowStock.toString();
    return '';
  }

  getBadgeClass(badgeType: string): string {
    const val = this.getBadgeValue(badgeType);
    if (!val) return 'd-none'; // hide if empty
    if (badgeType === 'activeJobs') return 'badge badge-blue';
    if (badgeType === 'lowStock') return 'badge badge-amber';
    return 'badge';
  }

  logout(): void {
    this.authService.logout();
  }
}
