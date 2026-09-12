import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { PaginatorModule } from 'primeng/paginator';

import { ConfirmationService, MessageService } from 'primeng/api';

import { Technician, TechnicianService } from '../../../shared/services/technician.service';

@Component({
  selector: 'app-staff',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    ButtonModule, InputTextModule,
    DialogModule, ConfirmDialogModule,
    ToastModule, TooltipModule,
    PaginatorModule
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './staff.component.html',
  styleUrls: ['./staff.component.css']
})
export class StaffComponent implements OnInit {

  // ── All data + filtered view ─────────────────────────────
  allTechnicians: Technician[] = [];
  technicians: Technician[] = []; // filtered subset
  loading = false;

  // ── Pagination ──────────────────────────────────────────
  first = 0;
  rows = 10;
  rowsPerPageOptions = [5, 10, 25, 50];

  // ── Inline column filters ───────────────────────────────
  filters = {
    name:   '',
    phone:  '',
    status: ''
  };

  // ── Dialog state ────────────────────────────────────────
  saving = false;
  dialogVisible = false;
  editMode = false;
  selectedId: number | null = null;
  form: Technician = { name: '', phone: '' };
  formError = '';

  constructor(
    private technicianService: TechnicianService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.loadStaff();
  }

  // ── Load all technicians (client-side filter later) ─────
  loadStaff(): void {
    this.loading = true;
    this.technicianService.getAll().subscribe({
      next: (data) => {
        this.allTechnicians = data;
        this.applyFilters();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.toast('error', 'Failed to load staff.');
      }
    });
  }

  // ── Client-side filtering ───────────────────────────────
  applyFilters(): void {
    const name   = this.filters.name.toLowerCase().trim();
    const phone  = this.filters.phone.toLowerCase().trim();
    const status = this.filters.status.trim();

    this.technicians = this.allTechnicians.filter(t => {
      const matchName   = !name   || t.name.toLowerCase().includes(name);
      const matchPhone  = !phone  || t.phone.toLowerCase().includes(phone);
      const matchStatus = !status || (t.status || 'Available') === status;
      return matchName && matchPhone && matchStatus;
    });
  }

  onFilterChange(): void {
    this.first = 0; // reset to first page on every filter change
    this.applyFilters();
  }

  // ── Pagination ──────────────────────────────────────────
  get pagedTechnicians(): Technician[] {
    return this.technicians.slice(this.first, this.first + this.rows);
  }

  onPageChange(event: any): void {
    this.first = event.first;
    this.rows  = event.rows;
  }

  get availableCount(): number {
    return this.allTechnicians.filter(t => (t.status || 'Available') === 'Available').length;
  }

  get inJobCount(): number {
    return this.allTechnicians.filter(t => t.status === 'In Job').length;
  }

  // ── Dialog open/close ───────────────────────────────────
  openDialog(tech?: Technician): void {
    this.formError = '';
    if (tech) {
      this.editMode   = true;
      this.selectedId = tech.id!;
      this.form = { name: tech.name, phone: tech.phone };
    } else {
      this.editMode   = false;
      this.selectedId = null;
      this.form = { name: '', phone: '' };
    }
    this.dialogVisible = true;
  }

  closeDialog(): void {
    this.dialogVisible = false;
  }

  // ── Save (Create / Update) ──────────────────────────────
  saveStaff(): void {
    if (!this.form.name?.trim() || !this.form.phone?.trim()) {
      this.formError = 'Name and Phone are required.';
      return;
    }
    this.saving    = true;
    this.formError = '';

    const request$ = this.editMode
      ? this.technicianService.update(this.selectedId!, this.form)
      : this.technicianService.create(this.form);

    request$.subscribe({
      next: () => {
        this.saving = false;
        this.closeDialog();
        this.loadStaff();
        this.toast('success', this.editMode ? 'Staff member updated.' : 'Staff member added.');
      },
      error: (err) => {
        this.saving    = false;
        this.formError = err?.error?.message || 'An error occurred.';
      }
    });
  }

  // ── Delete ──────────────────────────────────────────────
  confirmDelete(tech: Technician): void {
    this.confirmationService.confirm({
      message: `Are you sure you want to remove <strong>${tech.name}</strong>? This cannot be undone.`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.deleteStaff(tech)
    });
  }

  deleteStaff(tech: Technician): void {
    this.technicianService.delete(tech.id!).subscribe({
      next: () => {
        this.loadStaff();
        this.toast('success', `${tech.name} has been removed.`);
      },
      error: (err) => this.toast('error', err?.error?.message || 'Delete failed.')
    });
  }

  // ── Helpers ─────────────────────────────────────────────
  getInitials(name: string): string {
    return name.trim().split(/\s+/).slice(0, 2).map(w => w[0].toUpperCase()).join('');
  }

  private toast(severity: string, detail: string): void {
    this.messageService.add({
      severity,
      summary: severity === 'success' ? 'Success' : 'Error',
      detail
    });
  }
}
