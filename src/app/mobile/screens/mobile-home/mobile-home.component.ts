import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import {
  IonBadge,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonChip,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
  IonTitle,
  IonToolbar
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  alertCircleOutline,
  arrowForwardOutline,
  briefcaseOutline,
  cashOutline,
  checkmarkCircleOutline,
  cubeOutline,
  peopleOutline,
  refreshOutline,
  searchOutline,
  timeOutline
} from 'ionicons/icons';

import { AuthService } from '../../../shared/services/auth.service';
import { CustomerService } from '../../../shared/services/customer.service';
import { PartService } from '../../../shared/services/part.service';
import { RepairJob, RepairJobService } from '../../../shared/services/repair-job.service';
import { JobStatusConfig, StatusConfigService } from '../../../shared/services/status-config.service';

@Component({
  selector: 'app-mobile-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    IonBadge,
    IonButton,
    IonButtons,
    IonCard,
    IonCardContent,
    IonChip,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonNote,
    IonRefresher,
    IonRefresherContent,
    IonSpinner,
    IonTitle,
    IonToolbar
  ],
  template: `
    <ion-header class="mobile-header">
      <ion-toolbar>
        <ion-title>Dashboard</ion-title>
        <ion-buttons slot="end">
          <ion-button fill="clear" aria-label="Refresh dashboard" (click)="loadDashboard()">
            <ion-icon name="refresh-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="mobile-dashboard">
      <ion-refresher slot="fixed" (ionRefresh)="handleRefresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <div class="hero">
        <div>
          <p class="eyebrow">{{ today | date:'EEEE, MMM d' }}</p>
          <h1>Hi, {{ username }}</h1>
          <p class="hero-copy">Here is today's repair shop activity.</p>
        </div>
        <div class="hero-total">
          <span>Total billed</span>
          <strong>Rs. {{ totalBilled | number }}</strong>
        </div>
      </div>

      <div class="loading" *ngIf="loading">
        <ion-spinner name="crescent"></ion-spinner>
        <span>Loading dashboard</span>
      </div>

      <div class="error-card" *ngIf="!loading && errorMessage">
        <ion-icon name="alert-circle-outline"></ion-icon>
        <div>
          <strong>Could not load dashboard</strong>
          <p>{{ errorMessage }}</p>
        </div>
      </div>

      <ng-container *ngIf="!loading && !errorMessage">
        <div class="stats-grid">
          <button class="stat-card stat-card--blue" type="button" (click)="goToWeb('/web/repair-jobs')">
            <ion-icon name="briefcase-outline"></ion-icon>
            <span>Open jobs</span>
            <strong>{{ activeJobsCount }}</strong>
          </button>
          <button class="stat-card stat-card--green" type="button" (click)="goToWeb('/web/customers')">
            <ion-icon name="people-outline"></ion-icon>
            <span>Customers</span>
            <strong>{{ customerCount }}</strong>
          </button>
          <button class="stat-card stat-card--amber" type="button" (click)="goToWeb('/web/inventory')">
            <ion-icon name="cube-outline"></ion-icon>
            <span>Low stock</span>
            <strong>{{ lowStockCount }}</strong>
          </button>
          <button class="stat-card stat-card--slate" type="button" (click)="goToWeb('/web/repair-jobs')">
            <ion-icon name="checkmark-circle-outline"></ion-icon>
            <span>Completed</span>
            <strong>{{ completedJobsCount }}</strong>
          </button>
        </div>

        <ion-card class="attention-card" *ngIf="hasUnassignedJobs">
          <ion-card-content>
            <div class="attention-icon">
              <ion-icon name="alert-circle-outline"></ion-icon>
            </div>
            <div>
              <h2>{{ unassignedJobs.length }} jobs need assignment</h2>
              <p>Active repair jobs are waiting for a technician.</p>
              <ion-button size="small" fill="solid" (click)="goToWeb('/web/repair-jobs')">
                Assign now
                <ion-icon slot="end" name="arrow-forward-outline"></ion-icon>
              </ion-button>
            </div>
          </ion-card-content>
        </ion-card>

        <section class="section">
          <div class="section-header">
            <h2>Recent jobs</h2>
            <ion-button fill="clear" size="small" (click)="goToWeb('/web/repair-jobs')">View all</ion-button>
          </div>
          <ion-list class="job-list" lines="none">
            <ion-item *ngIf="recentJobs.length === 0" class="empty-item">
              <ion-label>No recent jobs</ion-label>
            </ion-item>
            <ion-item button detail="true" *ngFor="let job of recentJobs" (click)="goToWeb('/web/repair-jobs')">
              <div class="job-icon" slot="start">
                <ion-icon name="time-outline"></ion-icon>
              </div>
              <ion-label>
                <h3>{{ job.jobNumber || 'New job' }}</h3>
                <p>{{ job.customerName || 'Unknown customer' }} · {{ job.itemName }}</p>
              </ion-label>
              <ion-chip slot="end" [style.--background]="getStatusOption(job.status).bg" [style.color]="getStatusOption(job.status).color">
                {{ getStatusOption(job.status).label }}
              </ion-chip>
            </ion-item>
          </ion-list>
        </section>

        <section class="section">
          <div class="section-header">
            <h2>Job breakdown</h2>
            <ion-note>{{ totalJobs }} total</ion-note>
          </div>
          <div class="breakdown-list">
            <div class="breakdown-row" *ngFor="let status of statusConfigs | slice:0:5">
              <div class="breakdown-copy">
                <span>{{ status.displayName }}</span>
                <strong>{{ getJobsByStatusCount(status.statusKey) }}</strong>
              </div>
              <div class="progress-track">
                <div class="progress-fill" [style.width.%]="getStatusPercent(status.statusKey)" [style.background]="status.color"></div>
              </div>
            </div>
          </div>
        </section>

        <section class="section">
          <div class="section-header">
            <h2>Quick actions</h2>
          </div>
          <div class="quick-actions">
            <ion-button expand="block" fill="outline" (click)="goToWeb('/web/repair-jobs')">
              <ion-icon slot="start" name="briefcase-outline"></ion-icon>
              Manage jobs
            </ion-button>
            <ion-button expand="block" fill="outline" (click)="goToWeb('/web/customers')">
              <ion-icon slot="start" name="people-outline"></ion-icon>
              Customers
            </ion-button>
            <ion-button expand="block" fill="outline" (click)="goToWeb('/web/inventory')">
              <ion-icon slot="start" name="search-outline"></ion-icon>
              Inventory
            </ion-button>
          </div>
        </section>

        <ion-button class="desktop-link" routerLink="/web/dashboard" expand="block" fill="clear">
          Open web dashboard
        </ion-button>
      </ng-container>
    </ion-content>
  `,
  styles: [`
    ion-toolbar {
      --background: #ffffff;
      --color: #111827;
    }

    .mobile-dashboard {
      --background: #f5f7fb;
    }

    .hero {
      margin: 16px;
      padding: 20px;
      color: #ffffff;
      background: linear-gradient(135deg, #155e75, #2563eb);
      border-radius: 18px;
      display: flex;
      flex-direction: column;
      gap: 18px;
      box-shadow: 0 16px 32px rgba(37, 99, 235, 0.22);
    }

    .eyebrow {
      margin: 0 0 6px;
      color: #bae6fd;
      font-size: 0.78rem;
      font-weight: 700;
      text-transform: uppercase;
    }

    .hero h1 {
      margin: 0;
      font-size: 1.75rem;
      font-weight: 800;
    }

    .hero-copy {
      margin: 6px 0 0;
      color: #dbeafe;
      font-size: 0.95rem;
    }

    .hero-total {
      padding: 12px 14px;
      background: rgba(255, 255, 255, 0.14);
      border: 1px solid rgba(255, 255, 255, 0.18);
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .hero-total span {
      color: #bfdbfe;
      font-size: 0.8rem;
      font-weight: 700;
      text-transform: uppercase;
    }

    .hero-total strong {
      font-size: 1.15rem;
      white-space: nowrap;
    }

    .loading,
    .error-card {
      margin: 16px;
      padding: 18px;
      border-radius: 14px;
      background: #ffffff;
      color: #475569;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .error-card {
      align-items: flex-start;
      border: 1px solid #fecaca;
      color: #991b1b;
    }

    .error-card ion-icon {
      font-size: 1.35rem;
    }

    .error-card p {
      margin: 4px 0 0;
      color: #b91c1c;
      font-size: 0.86rem;
    }

    .stats-grid {
      margin: 0 16px 18px;
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }

    .stat-card {
      min-height: 118px;
      padding: 14px;
      border: 1px solid #e5e7eb;
      border-radius: 16px;
      background: #ffffff;
      text-align: left;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      box-shadow: 0 8px 20px rgba(15, 23, 42, 0.05);
    }

    .stat-card ion-icon {
      width: 34px;
      height: 34px;
      padding: 8px;
      border-radius: 12px;
      font-size: 1.2rem;
    }

    .stat-card span {
      color: #64748b;
      font-size: 0.8rem;
      font-weight: 700;
    }

    .stat-card strong {
      color: #0f172a;
      font-size: 1.65rem;
      font-weight: 800;
    }

    .stat-card--blue ion-icon { background: #dbeafe; color: #2563eb; }
    .stat-card--green ion-icon { background: #dcfce7; color: #16a34a; }
    .stat-card--amber ion-icon { background: #fef3c7; color: #d97706; }
    .stat-card--slate ion-icon { background: #e2e8f0; color: #334155; }

    .attention-card {
      margin: 0 16px 18px;
      border: 1px solid #fed7aa;
      border-radius: 16px;
      box-shadow: none;
    }

    .attention-card ion-card-content {
      display: flex;
      gap: 14px;
    }

    .attention-icon {
      width: 42px;
      height: 42px;
      border-radius: 14px;
      background: #ffedd5;
      color: #c2410c;
      display: grid;
      place-items: center;
      flex: 0 0 auto;
    }

    .attention-icon ion-icon {
      font-size: 1.45rem;
    }

    .attention-card h2 {
      margin: 0 0 4px;
      color: #7c2d12;
      font-size: 1rem;
      font-weight: 800;
    }

    .attention-card p {
      margin: 0 0 12px;
      color: #9a3412;
      line-height: 1.4;
    }

    .section {
      margin: 0 16px 20px;
    }

    .section-header {
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .section-header h2 {
      margin: 0;
      color: #0f172a;
      font-size: 1.05rem;
      font-weight: 800;
    }

    .job-list,
    .breakdown-list {
      border: 1px solid #e5e7eb;
      border-radius: 16px;
      background: #ffffff;
      overflow: hidden;
    }

    ion-item {
      --background: #ffffff;
      --padding-start: 12px;
      --inner-padding-end: 10px;
    }

    ion-item h3 {
      margin: 0;
      color: #0f172a;
      font-size: 0.92rem;
      font-weight: 800;
    }

    ion-item p {
      margin-top: 4px;
      color: #64748b;
      font-size: 0.8rem;
      white-space: normal;
    }

    ion-chip {
      max-width: 108px;
      min-height: 28px;
      margin-inline-start: 8px;
      font-size: 0.72rem;
      font-weight: 800;
    }

    .job-icon {
      width: 36px;
      height: 36px;
      border-radius: 12px;
      background: #eef2ff;
      color: #4f46e5;
      display: grid;
      place-items: center;
    }

    .empty-item {
      color: #64748b;
      text-align: center;
    }

    .breakdown-list {
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .breakdown-copy {
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      color: #334155;
      font-size: 0.86rem;
      font-weight: 700;
    }

    .progress-track {
      height: 8px;
      border-radius: 999px;
      overflow: hidden;
      background: #e5e7eb;
    }

    .progress-fill {
      height: 100%;
      border-radius: inherit;
    }

    .quick-actions {
      display: grid;
      gap: 10px;
    }

    .desktop-link {
      margin: 4px 16px 24px;
    }

    @media (min-width: 520px) {
      .hero,
      .loading,
      .error-card,
      .stats-grid,
      .attention-card,
      .section,
      .desktop-link {
        max-width: 520px;
        margin-left: auto;
        margin-right: auto;
      }
    }
  `]
})
export class MobileHomeComponent implements OnInit {
  username = '';
  today = new Date();
  loading = true;
  errorMessage = '';

  activeJobsCount = 0;
  customerCount = 0;
  lowStockCount = 0;
  completedJobsCount = 0;
  totalBilled = 0;
  totalJobs = 0;

  jobs: RepairJob[] = [];
  recentJobs: RepairJob[] = [];
  unassignedJobs: RepairJob[] = [];
  statusConfigs: JobStatusConfig[] = [];

  constructor(
    private authService: AuthService,
    private repairJobService: RepairJobService,
    private customerService: CustomerService,
    private partService: PartService,
    private statusConfigService: StatusConfigService,
    private router: Router
  ) {
    addIcons({
      alertCircleOutline,
      arrowForwardOutline,
      briefcaseOutline,
      cashOutline,
      checkmarkCircleOutline,
      cubeOutline,
      peopleOutline,
      refreshOutline,
      searchOutline,
      timeOutline
    });
  }

  get hasUnassignedJobs(): boolean {
    return this.unassignedJobs.length > 0;
  }

  ngOnInit(): void {
    this.username = this.authService.getUsername() || 'User';
    this.loadDashboard();
  }

  loadDashboard(done?: () => void): void {
    this.loading = true;
    this.errorMessage = '';

    forkJoin({
      jobs: this.repairJobService.getAll(),
      customers: this.customerService.getAll(),
      parts: this.partService.getAll(),
      statuses: this.statusConfigService.getAll()
    }).subscribe({
      next: (result) => {
        this.jobs = result.jobs || [];
        this.statusConfigs = result.statuses || [];
        this.totalJobs = this.jobs.length;
        this.customerCount = result.customers?.length || 0;
        this.lowStockCount = result.parts?.filter(part => part.stockQuantity <= 5).length || 0;

        const terminalKeys = this.statusConfigs
          .filter(status => status.isTerminal)
          .map(status => status.statusKey);

        const activeJobs = this.jobs.filter(job => !terminalKeys.includes(job.status || ''));
        this.activeJobsCount = activeJobs.length;
        this.completedJobsCount = this.jobs.filter(job => terminalKeys.includes(job.status || '')).length;
        this.totalBilled = this.jobs
          .filter(job => job.paid && job.netTotal)
          .reduce((sum, job) => sum + (job.netTotal || 0), 0);

        this.unassignedJobs = activeJobs
          .filter(job => !job.technicianId)
          .sort((a, b) => (b.id || 0) - (a.id || 0))
          .slice(0, 3);

        this.recentJobs = [...this.jobs]
          .sort((a, b) => (b.id || 0) - (a.id || 0))
          .slice(0, 5);

        this.loading = false;
        done?.();
      },
      error: () => {
        this.errorMessage = 'Please check the API connection and try again.';
        this.loading = false;
        done?.();
      }
    });
  }

  handleRefresh(event: CustomEvent): void {
    this.loadDashboard(() => event.target && (event.target as HTMLIonRefresherElement).complete());
  }

  goToWeb(path: string): void {
    this.router.navigate([path]);
  }

  getStatusOption(statusKey?: string): { label: string; bg: string; color: string } {
    const config = this.statusConfigs.find(status => status.statusKey === statusKey);
    if (config) {
      return {
        label: config.displayName,
        bg: config.bg,
        color: config.color
      };
    }

    return {
      label: statusKey || 'Pending',
      bg: '#f1f5f9',
      color: '#475569'
    };
  }

  getJobsByStatusCount(statusKey: string): number {
    return this.jobs.filter(job => job.status === statusKey).length;
  }

  getStatusPercent(statusKey: string): number {
    if (this.totalJobs === 0) return 0;
    return Math.round((this.getJobsByStatusCount(statusKey) / this.totalJobs) * 100);
  }
}
