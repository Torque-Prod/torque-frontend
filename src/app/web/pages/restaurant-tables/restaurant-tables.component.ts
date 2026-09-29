import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DropdownModule } from 'primeng/dropdown';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import {
  RestaurantTableService,
  RestaurantTableModel,
  CreateTableRequest,
  TableStatus
} from '../../../shared/services/restaurant-table.service';

@Component({
  selector: 'app-restaurant-tables',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    ToastModule, DialogModule, ConfirmDialogModule,
    DropdownModule, TagModule, TooltipModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './restaurant-tables.component.html',
  styleUrls: ['./restaurant-tables.component.css']
})
export class RestaurantTablesComponent implements OnInit {

  tables: RestaurantTableModel[] = [];
  filteredTables: RestaurantTableModel[] = [];
  loading = false;

  // Filters
  filterSection = '';
  filterStatus: TableStatus | '' = '';
  searchQuery = '';
  sections: string[] = [];

  statusOptions = [
    { label: 'All Statuses', value: '' },
    { label: 'Available',     value: 'AVAILABLE' },
    { label: 'Occupied',      value: 'OCCUPIED' },
    { label: 'Needs Cleaning',value: 'NEEDS_CLEANING' },
    { label: 'Reserved',      value: 'RESERVED' },
    { label: 'Out of Service',value: 'OUT_OF_SERVICE' }
  ];

  // Create / Edit dialog
  dialogVisible = false;
  dialogTitle = '';
  editingTable: RestaurantTableModel | null = null;
  saving = false;
  form: CreateTableRequest = { tableNumber: '', capacity: 2, section: '' };

  // QR dialog
  qrDialogVisible = false;
  qrTable: RestaurantTableModel | null = null;

  constructor(
    private tableService: RestaurantTableService,
    private messageService: MessageService,
    private confirmService: ConfirmationService
  ) {}

  ngOnInit(): void {
    this.loadTables();
  }

  loadTables(): void {
    this.loading = true;
    this.tableService.getAll().subscribe({
      next: tables => {
        this.tables = tables;
        this.sections = [...new Set(tables.map(t => t.section).filter(Boolean) as string[])];
        this.applyFilter();
        this.loading = false;
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load tables.' });
        this.loading = false;
      }
    });
  }

  applyFilter(): void {
    this.filteredTables = this.tables.filter(t => {
      const sectionMatch = !this.filterSection || t.section === this.filterSection;
      const statusMatch  = !this.filterStatus  || t.status === this.filterStatus;
      const searchMatch  = !this.searchQuery.trim() ||
        t.tableNumber.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        (t.section || '').toLowerCase().includes(this.searchQuery.toLowerCase());
      return sectionMatch && statusMatch && searchMatch;
    });
  }

  countByStatus(status: string): number {
    return this.tables.filter(t => t.status === status).length;
  }

  // ─── Stats ──────────────────────────────────────────────────────────────────

  get availableCount()    { return this.tables.filter(t => t.status === 'AVAILABLE').length; }
  get occupiedCount()     { return this.tables.filter(t => t.status === 'OCCUPIED').length; }
  get needsCleanCount()   { return this.tables.filter(t => t.status === 'NEEDS_CLEANING').length; }

  // ─── Create / Edit Dialog ───────────────────────────────────────────────────

  openCreateDialog(): void {
    this.editingTable = null;
    this.dialogTitle  = 'Add New Table';
    this.form = { tableNumber: '', capacity: 2, section: '' };
    this.dialogVisible = true;
  }

  openEditDialog(table: RestaurantTableModel): void {
    this.editingTable = table;
    this.dialogTitle  = `Edit Table ${table.tableNumber}`;
    this.form = { tableNumber: table.tableNumber, capacity: table.capacity, section: table.section || '' };
    this.dialogVisible = true;
  }

  saveTable(): void {
    if (!this.form.tableNumber?.trim()) {
      this.messageService.add({ severity: 'warn', summary: 'Validation', detail: 'Table number is required.' });
      return;
    }
    if (!this.form.capacity || this.form.capacity < 1) {
      this.messageService.add({ severity: 'warn', summary: 'Validation', detail: 'Capacity must be at least 1.' });
      return;
    }

    this.saving = true;
    const request: CreateTableRequest = {
      tableNumber: this.form.tableNumber.trim(),
      capacity:    this.form.capacity,
      section:     this.form.section?.trim() || undefined
    };

    const op$ = this.editingTable
      ? this.tableService.update(this.editingTable.id, request)
      : this.tableService.create(request);

    op$.subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success', summary: 'Saved',
          detail: `Table ${this.editingTable ? 'updated' : 'created'} successfully.`
        });
        this.dialogVisible = false;
        this.saving = false;
        this.loadTables();
      },
      error: (err) => {
        const msg = err?.error?.message || 'Failed to save table.';
        this.messageService.add({ severity: 'error', summary: 'Error', detail: msg });
        this.saving = false;
      }
    });
  }

  // ─── QR Dialog ──────────────────────────────────────────────────────────────

  openQrDialog(table: RestaurantTableModel): void {
    this.qrTable = table;
    this.qrDialogVisible = true;
  }

  downloadQr(): void {
    if (!this.qrTable) return;
    const a = document.createElement('a');
    a.href = this.qrTable.qrImageBase64;
    a.download = `QR-${this.qrTable.tableNumber}.png`;
    a.click();
  }

  regenerateQr(table: RestaurantTableModel): void {
    this.confirmService.confirm({
      message: `Regenerate QR for ${table.tableNumber}? The old QR code will stop working.`,
      header: 'Regenerate QR',
      icon: 'pi pi-refresh',
      accept: () => {
        this.tableService.regenerateQr(table.id).subscribe({
          next: updated => {
            this.messageService.add({ severity: 'success', summary: 'QR Regenerated', detail: `New QR generated for ${table.tableNumber}.` });
            if (this.qrTable?.id === table.id) this.qrTable = updated;
            this.loadTables();
          },
          error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to regenerate QR.' })
        });
      }
    });
  }

  // ─── Status Update ──────────────────────────────────────────────────────────

  markAvailable(table: RestaurantTableModel): void {
    this.tableService.updateStatus(table.id, 'AVAILABLE').subscribe({
      next: () => { this.messageService.add({ severity: 'success', summary: 'Updated', detail: `${table.tableNumber} marked as Available.` }); this.loadTables(); },
      error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to update status.' })
    });
  }

  // ─── Deactivate ─────────────────────────────────────────────────────────────

  deactivateTable(table: RestaurantTableModel): void {
    this.confirmService.confirm({
      message: `Deactivate table ${table.tableNumber}? It will be hidden from the system.`,
      header: 'Deactivate Table',
      icon: 'pi pi-trash',
      accept: () => {
        this.tableService.deactivate(table.id).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Deactivated', detail: `${table.tableNumber} deactivated.` });
            this.loadTables();
          },
          error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to deactivate table.' })
        });
      }
    });
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  getStatusLabel(status: TableStatus): string {
    const map: Record<TableStatus, string> = {
      AVAILABLE:      'Available',
      OCCUPIED:       'Occupied',
      RESERVED:       'Reserved',
      NEEDS_CLEANING: 'Needs Cleaning',
      OUT_OF_SERVICE: 'Out of Service'
    };
    return map[status] || status;
  }

  // Returns bg, color, border, icon — same pattern as repair-jobs getStatusOption()
  getStatusStyle(status: TableStatus): { bg: string; color: string; border: string; icon: string } {
    const map: Record<TableStatus, { bg: string; color: string; border: string; icon: string }> = {
      AVAILABLE:      { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0', icon: 'pi pi-check-circle' },
      OCCUPIED:       { bg: '#fef2f2', color: '#dc2626', border: '#fecaca', icon: 'pi pi-users' },
      RESERVED:       { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe', icon: 'pi pi-calendar' },
      NEEDS_CLEANING: { bg: '#fffbeb', color: '#d97706', border: '#fde68a', icon: 'pi pi-exclamation-triangle' },
      OUT_OF_SERVICE: { bg: '#f1f5f9', color: '#94a3b8', border: '#e2e8f0', icon: 'pi pi-ban' }
    };
    return map[status] || { bg: '#f1f5f9', color: '#64748b', border: '#e2e8f0', icon: 'pi pi-circle' };
  }

  getStatusSeverity(status: TableStatus): string {
    const map: Record<TableStatus, string> = {
      AVAILABLE:      'success',
      OCCUPIED:       'danger',
      RESERVED:       'info',
      NEEDS_CLEANING: 'warning',
      OUT_OF_SERVICE: 'secondary'
    };
    return map[status] || 'info';
  }
}
