import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="topbar">
      <div class="topbar-search">
        <i class="pi pi-search"></i>
        <input type="text" placeholder="Search globally..." />
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
      padding: 0 2rem;
      position: sticky;
      top: 0;
      z-index: 100;
    }

    .topbar-search {
      position: relative;
      width: 320px;
    }
    .topbar-search i {
      position: absolute;
      left: 14px;
      top: 50%;
      transform: translateY(-50%);
      color: #94a3b8;
      font-size: 0.9rem;
    }
    .topbar-search input {
      width: 100%;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 999px;
      padding: 0.5rem 1rem 0.5rem 2.25rem;
      font-size: 0.85rem;
      color: #334155;
      outline: none;
      transition: all 0.2s;
    }
    .topbar-search input:focus {
      background: #fff;
      border-color: #2563eb;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
    }
    .topbar-search input::placeholder { color: #94a3b8; }

    .topbar-actions {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .action-btn {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: #64748b;
      position: relative;
      transition: background 0.2s;
    }
    .action-btn:hover { background: #f1f5f9; color: #1e293b; }
    .action-btn i { font-size: 1.15rem; }
    
    .notification-dot {
      position: absolute;
      top: 10px;
      right: 12px;
      width: 8px;
      height: 8px;
      background: #ef4444;
      border-radius: 50%;
      border: 2px solid #fff;
    }
  `]
})
export class TopbarComponent {}
