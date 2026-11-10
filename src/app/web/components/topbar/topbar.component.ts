import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarService } from '../../../shared/services/sidebar.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="topbar">
      <div class="topbar-left">
        <button
          type="button"
          class="sidebar-toggle-btn"
          (click)="toggleSidebar()"
          [title]="isCollapsed ? 'Expand navigation bar' : 'Collapse to slim navigation bar'">
          <i class="pi" [ngClass]="isCollapsed ? 'pi-bars' : 'pi-align-left'"></i>
        </button>

        <div class="topbar-search">
          <i class="pi pi-search"></i>
          <input type="text" placeholder="Search globally..." />
        </div>
      </div>

      <div class="topbar-actions">
        <div class="action-btn">
          <i class="pi pi-bell"></i>
          <span class="notification-dot"></span>
        </div>
      </div>
    </header>
  `,
  styles: [`
    .topbar {
      height: 70px;
      background: #fff;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0 1.5rem;
      position: sticky;
      top: 0;
      z-index: 100;
    }

    .topbar-left {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .sidebar-toggle-btn {
      width: 34px;
      height: 34px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      background: #ffffff;
      color: #64748b;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 0.95rem;
      transition: all 0.2s;
    }

    .sidebar-toggle-btn:hover {
      background: #f1f5f9;
      color: #2563eb;
      border-color: #cbd5e1;
    }

    .topbar-search {
      position: relative;
      width: 300px;
    }
    .topbar-search i {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: #94a3b8;
      font-size: 0.85rem;
    }
    .topbar-search input {
      width: 100%;
      height: 34px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 0 1rem 0 2.25rem;
      font-size: 0.8125rem;
      color: #334155;
      outline: none;
      transition: all 0.2s;
      box-sizing: border-box;
    }
    .topbar-search input:focus {
      background: #fff;
      border-color: #2563eb;
      box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
    }
    .topbar-search input::placeholder { color: #94a3b8; }

    .topbar-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .action-btn {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: #64748b;
      position: relative;
      transition: background 0.2s;
    }
    .action-btn:hover { background: #f1f5f9; color: #1e293b; }
    .action-btn i { font-size: 1.1rem; }
    
    .notification-dot {
      position: absolute;
      top: 8px;
      right: 9px;
      width: 7px;
      height: 7px;
      background: #ef4444;
      border-radius: 50%;
      border: 2px solid #fff;
    }
  `]
})
export class TopbarComponent implements OnInit, OnDestroy {
  isCollapsed = false;
  private sub?: Subscription;

  constructor(private sidebarService: SidebarService) {}

  ngOnInit(): void {
    this.sub = this.sidebarService.collapsed$.subscribe(c => {
      this.isCollapsed = c;
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  toggleSidebar(): void {
    this.sidebarService.toggle();
  }
}
