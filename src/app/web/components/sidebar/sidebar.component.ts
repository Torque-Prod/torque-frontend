import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../shared/services/auth.service';
import { RepairJobService } from '../../../shared/services/repair-job.service';
import { PartService } from '../../../shared/services/part.service';
import { MenuService, MenuItem } from '../../../shared/services/menu.service';
import { SidebarService } from '../../../shared/services/sidebar.service';
import { forkJoin, Subscription } from 'rxjs';

interface MenuSection {
  label: string;
  items: MenuItem[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <aside class="sidebar" [class.is-collapsed]="isCollapsed">
      <!-- Sidebar Header -->
      <div class="sidebar-header">
        <div class="brand-clickable" (click)="router.navigate(['/web/dashboard'])" [title]="isCollapsed ? 'TORQUE Dashboard' : ''">
          <div class="brand-icon"><i class="pi pi-bolt"></i></div>
          <div class="brand-text" *ngIf="!isCollapsed">TOR<b>QUE</b></div>
        </div>

        <button
          type="button"
          class="collapse-btn"
          (click)="toggleSidebar()"
          [title]="isCollapsed ? 'Expand sidebar' : 'Collapse to slim sidebar'">
          <i class="pi" [ngClass]="isCollapsed ? 'pi-chevron-right' : 'pi-chevron-left'"></i>
        </button>
      </div>

      <!-- Navigation Links -->
      <div class="sidebar-scroll">
        <div class="nav-section" *ngFor="let section of menuSections">
          <span class="section-label" *ngIf="!isCollapsed">{{ section.label }}</span>
          <div class="section-divider" *ngIf="isCollapsed"></div>

          <a *ngFor="let item of section.items"
             [routerLink]="getRouterLink(item.routerLink)" 
             [queryParams]="getQueryParams(item.routerLink)"
             routerLinkActive="active" 
             class="nav-item"
             [title]="item.label">
            <div class="nav-icon-wrap">
              <i [class]="item.icon"></i>
              <span *ngIf="isCollapsed && item.badgeType && getBadgeValue(item.badgeType)"
                    class="mini-badge-dot"
                    [class.mini-badge-blue]="item.badgeType === 'activeJobs'"
                    [class.mini-badge-amber]="item.badgeType === 'lowStock'">
              </span>
            </div>

            <span class="nav-text" *ngIf="!isCollapsed">{{ item.label }}</span>

            <span *ngIf="!isCollapsed && item.badgeType" [class]="getBadgeClass(item.badgeType)">
              {{ getBadgeValue(item.badgeType) }}
            </span>
          </a>
        </div>
      </div>

      <!-- Sidebar Footer -->
      <div class="sidebar-footer">
        <div class="user-profile" (click)="logout()" [title]="isCollapsed ? (username + ' (' + role + ') — Click to Logout') : 'Click to Logout'">
          <div class="avatar">{{ username.charAt(0).toUpperCase() }}</div>
          <div class="user-info" *ngIf="!isCollapsed">
            <span class="username">{{ username }}</span>
            <span class="role">{{ role }}</span>
          </div>
          <i class="pi pi-sign-out logout-icon" *ngIf="!isCollapsed" title="Logout"></i>
        </div>
      </div>
    </aside>
  `,
  styles: [`
    .sidebar {
      width: 250px;
      height: 100vh;
      background: #0f172a;
      color: #94a3b8;
      display: flex;
      flex-direction: column;
      border-right: 1px solid #1e293b;
      position: sticky;
      top: 0;
      flex-shrink: 0;
      transition: width 0.22s cubic-bezier(0.4, 0, 0.2, 1);
      z-index: 1000;
    }

    /* ─── Slim / Collapsed State ─── */
    .sidebar.is-collapsed {
      width: 68px;
    }

    .sidebar-header {
      height: 70px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 1rem 0 1.25rem;
      border-bottom: 1px solid #1e293b;
      flex-shrink: 0;
      gap: 0.5rem;
    }

    .sidebar.is-collapsed .sidebar-header {
      padding: 0;
      justify-content: center;
      position: relative;
    }

    .brand-clickable {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      cursor: pointer;
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
      font-size: 1.05rem;
      flex-shrink: 0;
    }

    .brand-text {
      color: #f8fafc;
      font-size: 1.15rem;
      letter-spacing: 0.05em;
      white-space: nowrap;
    }
    .brand-text b { color: #38bdf8; }

    .collapse-btn {
      width: 26px;
      height: 26px;
      border-radius: 6px;
      background: #1e293b;
      color: #94a3b8;
      border: 1px solid #334155;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 0.68rem;
      transition: all 0.2s;
    }

    .collapse-btn:hover {
      background: #2563eb;
      color: #ffffff;
      border-color: #2563eb;
    }

    .sidebar.is-collapsed .collapse-btn {
      position: absolute;
      right: -13px;
      top: 22px;
      width: 24px;
      height: 24px;
      background: #2563eb;
      color: #ffffff;
      border: 2px solid #0f172a;
      border-radius: 50%;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
      z-index: 1010;
    }
    .sidebar.is-collapsed .collapse-btn:hover {
      background: #1d4ed8;
      transform: scale(1.1);
    }

    .sidebar-scroll {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 1.25rem 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    .sidebar.is-collapsed .sidebar-scroll {
      padding: 1.25rem 0.35rem;
      gap: 0.85rem;
    }

    .sidebar-scroll::-webkit-scrollbar { width: 4px; }
    .sidebar-scroll::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }

    .nav-section { display: flex; flex-direction: column; gap: 0.2rem; }
    .section-label {
      font-size: 0.625rem;
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      padding: 0 0.65rem;
      margin-bottom: 0.35rem;
      white-space: nowrap;
    }

    .section-divider {
      height: 1px;
      background: #1e293b;
      margin: 0.35rem 0.5rem;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      padding: 0.55rem 0.65rem;
      color: #94a3b8;
      text-decoration: none;
      border-radius: 7px;
      font-size: 0.8125rem;
      font-weight: 500;
      transition: all 0.15s;
      cursor: pointer;
      position: relative;
    }

    .sidebar.is-collapsed .nav-item {
      justify-content: center;
      padding: 0.55rem 0;
      width: 44px;
      height: 40px;
      margin: 0 auto;
    }

    .nav-icon-wrap {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .nav-icon-wrap i {
      font-size: 1.05rem;
      width: 20px;
      text-align: center;
    }

    .nav-text {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .nav-item:hover:not(.disabled) {
      color: #f8fafc;
      background: #1e293b;
    }

    .nav-item.active {
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.1);
      font-weight: 600;
    }

    .nav-item.disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .badge {
      margin-left: auto;
      font-size: 0.65rem;
      font-weight: 700;
      padding: 0.12rem 0.4rem;
      border-radius: 9999px;
      color: #fff;
      line-height: 1.2;
    }
    .badge-blue { background: #2563eb; }
    .badge-amber { background: #d97706; }

    .mini-badge-dot {
      position: absolute;
      top: -3px;
      right: -3px;
      width: 7px;
      height: 7px;
      border-radius: 50%;
      border: 1.5px solid #0f172a;
    }
    .mini-badge-blue { background: #38bdf8; }
    .mini-badge-amber { background: #f59e0b; }

    .sidebar-footer {
      padding: 0.75rem;
      border-top: 1px solid #1e293b;
      flex-shrink: 0;
    }
    .sidebar.is-collapsed .sidebar-footer {
      padding: 0.75rem 0.35rem;
    }

    .user-profile {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      padding: 0.55rem 0.65rem;
      background: #1e293b;
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.2s;
    }
    .sidebar.is-collapsed .user-profile {
      justify-content: center;
      padding: 0.4rem 0;
      background: transparent;
    }
    .user-profile:hover {
      background: #334155;
    }

    .avatar {
      width: 32px;
      height: 32px;
      background: #38bdf8;
      color: #0f172a;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 0.95rem;
      flex-shrink: 0;
    }

    .user-info {
      display: flex;
      flex-direction: column;
      flex: 1;
      overflow: hidden;
    }
    .username {
      color: #f8fafc;
      font-weight: 600;
      font-size: 0.78rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .role {
      color: #64748b;
      font-size: 0.65rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .logout-icon {
      color: #64748b;
      font-size: 0.95rem;
      transition: color 0.15s;
    }
    .user-profile:hover .logout-icon {
      color: #ef4444;
    }
  `]
})
export class SidebarComponent implements OnInit, OnDestroy {
  username = 'User';
  role = 'Staff';
  activeJobs = 0;
  lowStock = 0;
  menuSections: MenuSection[] = [];
  isCollapsed = false;
  private sub?: Subscription;

  constructor(
    public router: Router,
    private authService: AuthService,
    private repairJobService: RepairJobService,
    private partService: PartService,
    private menuService: MenuService,
    private sidebarService: SidebarService
  ) {}

  ngOnInit(): void {
    this.username = this.authService.getUsername() || 'User';
    this.role = this.authService.getRole() || 'Staff';

    this.sub = this.sidebarService.collapsed$.subscribe(c => {
      this.isCollapsed = c;
    });

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

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  toggleSidebar(): void {
    this.sidebarService.toggle();
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
    if (!val) return 'd-none';
    if (badgeType === 'activeJobs') return 'badge badge-blue';
    if (badgeType === 'lowStock') return 'badge badge-amber';
    return 'badge';
  }

  logout(): void {
    this.authService.logout();
  }
}
