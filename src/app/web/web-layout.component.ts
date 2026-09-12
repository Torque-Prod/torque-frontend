import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { TopbarComponent } from './components/topbar/topbar.component';

@Component({
  selector: 'app-web-layout',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, TopbarComponent],
  template: `
    <div class="app-layout">
      <app-sidebar></app-sidebar>
      <div class="app-content-wrapper">
        <app-topbar></app-topbar>
        <main class="app-main-content">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `,
  styles: [`
    .app-layout {
      display: flex;
      min-height: 100vh;
      background: var(--surface-ground);
      overflow: hidden;
    }
    .app-content-wrapper {
      flex: 1;
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
    }
    .app-main-content {
      flex: 1;
      overflow-y: auto;
      background: #f1f5f9;
    }
    .app-main-content::-webkit-scrollbar { width: 8px; }
    .app-main-content::-webkit-scrollbar-track { background: transparent; }
    .app-main-content::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
  `]
})
export class WebLayoutComponent {}
