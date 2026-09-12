import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { StatusConfigService, JobStatusConfig } from '../../../shared/services/status-config.service';
import { MessageService } from 'primeng/api';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { CheckboxModule } from 'primeng/checkbox';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { DividerModule } from 'primeng/divider';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    TableModule, ButtonModule, InputTextModule,
    DialogModule, CheckboxModule, ToastModule,
    TooltipModule, DividerModule, CardModule, TagModule
  ],
  providers: [MessageService],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent implements OnInit {

  statuses: JobStatusConfig[] = [];
  loading = false;
  displayDialog = false;
  saving = false;

  activeTab = 'general'; // Default tab

  selectedStatus: JobStatusConfig = this.resetForm();

  constructor(
    private statusService: StatusConfigService,
    private messageService: MessageService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['tab']) {
        this.activeTab = params['tab'];
      }
    });
    this.loadStatuses();
  }

  switchTab(tab: string): void {
    if (tab === 'security' || tab === 'notifications') return; // Keep these disabled for now
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: tab },
      queryParamsHandling: 'merge'
    });
  }

  loadStatuses(): void {
    this.loading = true;
    this.statusService.getAll().subscribe({
      next: (data) => {
        this.statuses = data.sort((a, b) => a.sortOrder - b.sortOrder);
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  openNew(): void {
    this.selectedStatus = this.resetForm();
    this.displayDialog = true;
  }

  editStatus(status: JobStatusConfig): void {
    this.selectedStatus = { ...status };
    this.displayDialog = true;
  }

  saveStatus(): void {
    if (!this.selectedStatus.displayName || !this.selectedStatus.statusKey) return;
    
    this.saving = true;
    if (this.selectedStatus.id) {
      this.statusService.update(this.selectedStatus.id, this.selectedStatus).subscribe({
        next: () => this.onSaveSuccess('Status Updated'),
        error: (err) => this.onSaveError(err)
      });
    } else {
      this.statusService.create(this.selectedStatus).subscribe({
        next: () => this.onSaveSuccess('Status Created'),
        error: (err) => this.onSaveError(err)
      });
    }
  }

  deleteStatus(status: JobStatusConfig): void {
    if (!confirm(`Are you sure you want to delete status "${status.displayName}"?`)) return;

    this.statusService.delete(status.id!).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'Status deleted successfully' });
        this.loadStatuses();
      },
      error: (err) => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error.message || 'Could not delete status' });
      }
    });
  }

  private onSaveSuccess(msg: string): void {
    this.saving = false;
    this.displayDialog = false;
    this.messageService.add({ severity: 'success', summary: 'Success', detail: msg });
    this.loadStatuses();
  }

  private onSaveError(err: any): void {
    this.saving = false;
    this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error.message || 'Operation failed' });
  }

  private resetForm(): JobStatusConfig {
    return {
      statusKey: '',
      displayName: '',
      color: '#3b82f6',
      bg: '#eff6ff',
      border: '#bfdbfe',
      icon: 'pi pi-tag',
      isDefault: false,
      isTerminal: false,
      sendSms: false,
      sortOrder: this.statuses.length + 1
    };
  }
}
