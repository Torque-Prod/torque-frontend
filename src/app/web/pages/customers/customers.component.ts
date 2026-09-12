import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { PaginatorModule } from 'primeng/paginator';

import { ConfirmationService, MessageService } from 'primeng/api';

import { Customer, CustomerService } from '../../../shared/services/customer.service';
import { HasPrivilegeDirective } from '../../../shared/directives/has-privilege.directive';

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    TableModule, ButtonModule, InputTextModule,
    DialogModule, ConfirmDialogModule, ToastModule, TooltipModule,
    PaginatorModule, HasPrivilegeDirective
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './customers.component.html',
  styleUrls: ['./customers.component.css']
})
export class CustomersComponent implements OnInit {

  // ── Grid data ──────────────────────────────────────────────
  customers: Customer[] = [];
  totalRecords = 0;
  loading = false;

  // ── Pagination state ───────────────────────────────────────
  first = 0;
  rows = 25;
  sortField: string | null = null;
  sortOrder: number = 1;

  // ── Filters ────────────────────────────────────────────────
  searchKeyword = '';
  filters = {
    name:    '',
    phone:   '',
    address: ''
  };

  // ── Dialog state ───────────────────────────────────────────
  saving = false;
  dialogVisible = false;
  editMode = false;
  selectedId: number | null = null;
  form: Customer = { name: '', phone: '', address: '' };
  formError = '';

  constructor(
    public  router: Router,
    private customerService: CustomerService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.loadCustomers();
  }

  // ── Primary data loader ────────────────────────────────────
  loadCustomers(event?: { first?: number; rows?: number; sortField?: string; sortOrder?: number }): void {
    if (event) {
      this.first     = event.first     ?? this.first;
      this.rows      = event.rows      ?? this.rows;
      this.sortField = event.sortField ?? this.sortField;
      this.sortOrder = event.sortOrder ?? this.sortOrder;
    }

    const payload = {
      first:       this.first,
      rows:        this.rows,
      sortField:   this.sortField,
      sortOrder:   this.sortOrder,
      globalFilter: this.searchKeyword || null,
      filters: {
        name:    { value: this.filters.name    || null, matchMode: 'contains' },
        phone:   { value: this.filters.phone   || null, matchMode: 'contains' },
        address: { value: this.filters.address || null, matchMode: 'contains' }
      }
    };

    this.loading = true;
    this.customerService.searchPaged(payload).subscribe({
      next: (res) => {
        this.customers    = res.data;
        this.totalRecords = res.totalRecords;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.toast('error', 'Failed to load customers.');
      }
    });
  }

  // ── Filter / pagination triggers ───────────────────────────
  onFilterChange(): void { this.first = 0; this.loadCustomers(); }
  onSearch():       void { this.first = 0; this.loadCustomers(); }

  onPageChange(event: any): void {
    this.first = event.first;
    this.rows  = event.rows;
    this.loadCustomers();
  }

  // ── Dialog ─────────────────────────────────────────────────
  openDialog(customer?: Customer): void {
    this.formError = '';
    if (customer) {
      this.editMode   = true;
      this.selectedId = customer.id!;
      this.form = { name: customer.name, phone: customer.phone, address: customer.address };
    } else {
      this.editMode   = false;
      this.selectedId = null;
      this.form = { name: '', phone: '', address: '' };
    }
    this.dialogVisible = true;
  }

  closeDialog(): void { this.dialogVisible = false; }

  saveCustomer(): void {
    if (!this.form.name?.trim() || !this.form.phone?.trim()) {
      this.formError = 'Name and Phone are required.';
      return;
    }
    this.saving = true;
    this.formError = '';
    const request$ = this.editMode
      ? this.customerService.update(this.selectedId!, this.form)
      : this.customerService.create(this.form);

    request$.subscribe({
      next: () => {
        this.saving = false;
        this.closeDialog();
        this.loadCustomers();
        this.toast('success', this.editMode ? 'Customer updated.' : 'Customer added.');
      },
      error: (err) => {
        this.saving = false;
        this.formError = err?.error?.message || 'An error occurred.';
      }
    });
  }

  // ── Delete ─────────────────────────────────────────────────
  confirmDelete(customer: Customer): void {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete <strong>${customer.name}</strong>?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.deleteCustomer(customer)
    });
  }

  deleteCustomer(customer: Customer): void {
    this.customerService.delete(customer.id!).subscribe({
      next: () => { this.loadCustomers(); this.toast('success', `${customer.name} has been removed.`); },
      error: (err) => this.toast('error', err?.error?.message || 'Delete failed.')
    });
  }

  private toast(severity: string, detail: string): void {
    this.messageService.add({ severity, summary: severity === 'success' ? 'Success' : 'Error', detail });
  }
}
