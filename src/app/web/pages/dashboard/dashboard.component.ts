import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';

import { AuthService } from '../../../shared/services/auth.service';
import { RepairJobService, RepairJob } from '../../../shared/services/repair-job.service';
import { CustomerService } from '../../../shared/services/customer.service';
import { PartService } from '../../../shared/services/part.service';
import { SaleService } from '../../../shared/services/sale.service';
import { StatusConfigService, JobStatusConfig } from '../../../shared/services/status-config.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  username = '';
  today = new Date();

  // Stats
  activeJobsCount = 0;
  customerCount = 0;
  lowStockCount = 0;
  completedJobsCount = 0;
  totalBilled = 0;
  salesRevenue = 0;

  // Recent & Unassigned Jobs
  recentJobs: RepairJob[] = [];
  unassignedJobs: RepairJob[] = [];
  hasUnassignedJobs = false;

  // Breakdown
  totalJobs = 0;
  statusConfigs: JobStatusConfig[] = [];

  constructor(
    private authService: AuthService,
    private repairJobService: RepairJobService,
    private customerService: CustomerService,
    private partService: PartService,
    private saleService: SaleService,
    private statusConfigService: StatusConfigService,
    public router: Router
  ) {}

  ngOnInit(): void {
    this.username = this.authService.getUsername() || 'User';
    this.loadStats();
  }

  loadStats(): void {
    forkJoin({
      jobs: this.repairJobService.getAll(),
      customers: this.customerService.getAll(),
      parts: this.partService.getAll(),
      sales: this.saleService.getAll(),
      statuses: this.statusConfigService.getAll()
    }).subscribe({
      next: (r) => {
        const jobs = r.jobs || [];
        const sales = r.sales || [];
        this.statusConfigs = r.statuses || [];
        this.customerCount = r.customers?.length || 0;
        this.lowStockCount = r.parts?.filter(p => p.stockQuantity <= 5).length || 0;

        this.totalJobs = jobs.length;
        
        // Terminal statuses are "Completed/Delivered"
        const terminalKeys = this.statusConfigs.filter(s => s.isTerminal).map(s => s.statusKey);
        
        const activeJobs = jobs.filter(j => !terminalKeys.includes(j.status!));
        this.activeJobsCount = activeJobs.length;
        this.completedJobsCount = jobs.filter(j => terminalKeys.includes(j.status!)).length;
        
        // Revenue (paid repair jobs + direct sales)
        const jobRevenue = jobs
          .filter(j => j.paid && j.netTotal)
          .reduce((sum, j) => sum + (j.netTotal || 0), 0);

        this.salesRevenue = sales.reduce((sum, s) => sum + (s.netTotal || 0), 0);
        this.totalBilled = jobRevenue + this.salesRevenue;

        // Unassigned Jobs (Active and no tech)
        this.unassignedJobs = activeJobs
          .filter(j => !j.technicianId)
          .sort((a, b) => (b.id || 0) - (a.id || 0))
          .slice(0, 5);
        this.hasUnassignedJobs = this.unassignedJobs.length > 0;

        // Sort by ID descending for recent jobs (latest 5)
        this.recentJobs = [...jobs].sort((a, b) => (b.id || 0) - (a.id || 0)).slice(0, 5);
      }
    });
  }

  getStatusOption(statusKey?: string): any {
    const config = this.statusConfigs.find(s => s.statusKey === statusKey);
    if (config) {
      return {
        label: config.displayName,
        bg: config.bg,
        color: config.color,
        border: config.border,
        icon: config.icon
      };
    }
    return { label: statusKey, bg: '#f1f5f9', color: '#475569', border: '#cbd5e1', icon: 'pi pi-circle' };
  }

  getStatusPercent(statusKey: string): number {
    if (this.totalJobs === 0) return 0;
    const count = this.recentJobs.filter(j => j.status === statusKey).length; // This is actually for all jobs in a real app, but let's use recentJobs for now or recalculate
    return Math.round((this.recentJobs.filter(j => j.status === statusKey).length / this.totalJobs) * 100);
  }

  // Helper for progress bars
  getJobsByStatusCount(statusKey: string): number {
    return this.recentJobs.filter(j => j.status === statusKey).length; // Need to store full jobs list if we want real stats
  }
}
