import {Component, HostListener, OnInit} from '@angular/core';
import {CommonModule, DatePipe} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {Router} from '@angular/router';

import {TableModule} from 'primeng/table';
import {ButtonModule} from 'primeng/button';
import {InputTextModule} from 'primeng/inputtext';
import {DialogModule} from 'primeng/dialog';
import {ToastModule} from 'primeng/toast';
import {CardModule} from 'primeng/card';
import {DropdownModule} from 'primeng/dropdown';
import {CalendarModule} from 'primeng/calendar';
import {TagModule} from 'primeng/tag';
import {InputTextareaModule} from 'primeng/inputtextarea';
import {TooltipModule} from 'primeng/tooltip';
import {DividerModule} from 'primeng/divider';
import {InputNumberModule} from 'primeng/inputnumber';
import {PaginatorModule} from 'primeng/paginator';

import {MessageService} from 'primeng/api';

import {RepairJob, RepairJobService, RepairJobStatus, UsedPart} from '../../../shared/services/repair-job.service';
import {Customer, CustomerService} from '../../../shared/services/customer.service';
import {Technician, TechnicianService} from '../../../shared/services/technician.service';
import {Part, PartService} from '../../../shared/services/part.service';
import {StatusConfigService, JobStatusConfig} from '../../../shared/services/status-config.service';
import {HasPrivilegeDirective} from '../../../shared/directives/has-privilege.directive';

interface RepairJobForm {
    customerId?: number;
    itemName?: string;
    modelNumber?: string;
    serialNumber?: string;
    problemDescription?: string;
    receivedDate?: Date;
    expectedDate?: Date;
}

interface AssignStaffMember {
    id: number;
    name: string;
    initials: string;
    avatarBg: string;
    avatarColor: string;
    status: 'Available' | 'On job';
}


@Component({
    selector: 'app-repair-jobs',
    standalone: true,
    imports: [
        CommonModule, FormsModule,
        TableModule, ButtonModule, InputTextModule,
        DialogModule, ToastModule, CardModule,
        DropdownModule, CalendarModule, TagModule,
        InputTextareaModule, TooltipModule, DividerModule,
        InputNumberModule, PaginatorModule, HasPrivilegeDirective
    ],
    providers: [MessageService, DatePipe],
    templateUrl: './repair-jobs.component.html',
    styleUrls: ['./repair-jobs.component.css']
})
export class RepairJobsComponent implements OnInit {
    // ── Grid data ──────────────────────────────────────────────
    jobs: RepairJob[] = [];
    totalRecords = 0;
    loading = false;

    // ── Pagination state ───────────────────────────────────────
    first = 0;
    rows = 25;
    sortField: string | null = null;
    sortOrder: number = 1;

    // ── Filters ────────────────────────────────────────────────
    searchKeyword = '';
    activeStatusFilter: string | null = null;

    filters = {
        jobNumber: '',
        customerName: '',
        itemName: '',
        modelNumber: '',
        serialNumber: '',
        technicianName: '',
        status: null as string | null,
        paid: null as boolean | null
    };

    // ── Status summary counters (separate lightweight call) ────
    statusConfigs: JobStatusConfig[] = [];
    statusCounts: Record<string, number> = {};
    totalCount = 0;

    // ── Supporting data ────────────────────────────────────────
    customers: Customer[] = [];
    technicians: Technician[] = [];
    inventory: Part[] = [];

    // ── Dialog state ───────────────────────────────────────────
    saving = false;
    exporting = false;
    detailDialogVisible = false;
    createDialogVisible = false;
    assignDialogVisible = false;
    statusDialogVisible = false;
    technicianDialogVisible = false;
    customerDialogVisible = false;

    selectedJob: RepairJob | null = null;
    selectedPartId: number | null = null;
    partQty = 1;
    serviceChargeInput = 0;
    newStatus: string = '';
    statusError = '';
    assignTechId: number | null = null;
    assignDropdownOpen = false;
    statusDropdownOpen = false;
    customerDropdownOpen = false;
    assignStaffMembers: AssignStaffMember[] = [];
    technicianSaving = false;
    technicianForm: Technician = {name: '', phone: ''};
    technicianFormError = '';
    customerSaving = false;
    customerForm: Customer = {name: '', phone: '', address: ''};
    customerFormError = '';

    form: RepairJobForm = {};

    constructor(
        public router: Router,
        private repairJobService: RepairJobService,
        private customerService: CustomerService,
        private technicianService: TechnicianService,
        private partService: PartService,
        private statusConfigService: StatusConfigService,
        private messageService: MessageService
    ) {
    }

    ngOnInit(): void {
        this.loadStatuses();
        this.loadCustomers();
        this.loadTechnicians();
        this.loadInventory();
        this.loadJobs();
        this.refreshStatusCounts();
    }

    @HostListener('document:click', ['$event'])
    closeAssignDropdownOnOutsideClick(event: MouseEvent): void {
        const target = event.target as HTMLElement | null;
        if (!target?.closest('.assign-tech-picker')) {
            this.assignDropdownOpen = false;
        }
        if (!target?.closest('.status-picker')) {
            this.statusDropdownOpen = false;
        }
        if (!target?.closest('.customer-picker')) {
            this.customerDropdownOpen = false;
        }
    }

    // ── Primary data loader (uses /search) ────────────────────
    loadJobs(event?: { first?: number; rows?: number; sortField?: string; sortOrder?: number }): void {
        if (event) {
            this.first = event.first ?? this.first;
            this.rows = event.rows ?? this.rows;
            this.sortField = event.sortField ?? this.sortField;
            this.sortOrder = event.sortOrder ?? this.sortOrder;
        }

        const payload = {
            first: this.first,
            rows: this.rows,
            sortField: this.sortField,
            sortOrder: this.sortOrder,
            globalFilter: this.searchKeyword || null,
            filters: {
                'rp.jobNumber': {value: this.filters.jobNumber || null, matchMode: 'contains'},
                'customerName': {value: this.filters.customerName || null, matchMode: 'contains'},
                'itemName': {value: this.filters.itemName || null, matchMode: 'contains'},
                'modelNumber': {value: this.filters.modelNumber || null, matchMode: 'contains'},
                'serialNumber': {value: this.filters.serialNumber || null, matchMode: 'contains'},
                'technicianName': {value: this.filters.technicianName || null, matchMode: 'contains'},
                'status': {value: this.activeStatusFilter || this.filters.status || null, matchMode: 'equals'},
                'paid': {value: this.filters.paid, matchMode: 'equals'}
            }
        };

        this.loading = true;
        this.repairJobService.searchJobs(payload).subscribe({
            next: (res) => {
                this.jobs = res.data;
                this.totalRecords = res.totalRecords;
                this.loading = false;
            },
            error: () => {
                this.loading = false;
            }
        });
    }

    // ── Export to Excel ────────────────────────────────────
    exportToExcel(): void {
        this.exporting = true;
        const payload = {
            first: 0,
            rows: 100000,
            sortField: this.sortField,
            sortOrder: this.sortOrder,
            globalFilter: this.searchKeyword || null,
            filters: {
                'rp.jobNumber': {value: this.filters.jobNumber || null, matchMode: 'contains'},
                'customerName': {value: this.filters.customerName || null, matchMode: 'contains'},
                'itemName': {value: this.filters.itemName || null, matchMode: 'contains'},
                'modelNumber': {value: this.filters.modelNumber || null, matchMode: 'contains'},
                'serialNumber': {value: this.filters.serialNumber || null, matchMode: 'contains'},
                'technicianName': {value: this.filters.technicianName || null, matchMode: 'contains'},
                'status': {value: this.activeStatusFilter || this.filters.status || null, matchMode: 'equals'},
                'paid': {value: this.filters.paid, matchMode: 'equals'}
            }
        };

        this.repairJobService.exportJobs(payload).subscribe({
            next: (blob: Blob) => {
                const today = new Date().toISOString().split('T')[0];
                const filename = `repair-jobs-${today}.xlsx`;
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                a.click();
                window.URL.revokeObjectURL(url);
                this.exporting = false;
                this.toast('success', 'Excel file downloaded');
            },
            error: () => {
                this.exporting = false;
                this.toast('error', 'Export failed. Please try again.');
            }
        });
    }

    // ── Refresh the status badge counts (uses simple getAll) ──
    refreshStatusCounts(): void {
        this.repairJobService.getAll().subscribe(all => {
            this.totalCount = all.length;
            this.statusCounts = {};
            all.forEach(j => {
                if (j.status) this.statusCounts[j.status] = (this.statusCounts[j.status] || 0) + 1;
            });
        });
    }

    countByStatus(key: string): number {
        return this.statusCounts[key] ?? 0;
    }

    // ── Filter triggers ────────────────────────────────────────
    onFilterChange(): void {
        this.first = 0;
        this.loadJobs();
    }

    onSearch(): void {
        this.first = 0;
        this.loadJobs();
    }

    onPageChange(event: any): void {
        this.first = event.first;
        this.rows = event.rows;
        this.loadJobs();
    }

    filterByStatus(status: string | null): void {
        this.activeStatusFilter = status;
        this.filters.status = null; // clear column filter when tab is clicked
        this.first = 0;
        this.loadJobs();
    }

    // ── Statuses ───────────────────────────────────────────────
    loadStatuses(): void {
        this.statusConfigService.getAll().subscribe(data => {
            this.statusConfigs = data.sort((a, b) => a.sortOrder - b.sortOrder);
        });
    }

    getStatusOption(statusKey?: string) {
        return this.statusConfigs.find(s => s.statusKey === statusKey);
    }

    getStatusLabel(statusKey?: string): string {
        return this.statusConfigs.find(s => s.statusKey === statusKey)?.displayName || '';
    }

    // ── Supporting loaders ─────────────────────────────────────
    loadCustomers(): void {
        this.customerService.getAll().subscribe(d => {
            this.customers = [
                ...d,
                {
                    id: -1,
                    name: '+ Add New Customer',
                    phone: '',
                    address: ''
                }
            ];
        });
    }

    onCustomerChange(event: any): void {
        if (event.value === -1) {
            this.form.customerId = undefined;
            this.openCustomerDialog();
        }
    }

    get selectedCustomer(): Customer | undefined {
        return this.customers.find(customer => customer.id === this.form.customerId);
    }

    toggleCustomerDropdown(event: MouseEvent): void {
        event.stopPropagation();
        this.customerDropdownOpen = !this.customerDropdownOpen;
        this.assignDropdownOpen = false;
        this.statusDropdownOpen = false;
    }

    selectCustomer(customer: Customer): void {
        if (customer.id === -1) {
            this.form.customerId = undefined;
            this.customerDropdownOpen = false;
            this.openCustomerDialog();
            return;
        }

        this.form.customerId = customer.id;
        this.customerDropdownOpen = false;
    }

    getCustomerInitials(name?: string): string {
        if (!name?.trim()) return 'CU';
        return name
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map(part => part.charAt(0).toUpperCase())
            .join('');
    }

    openCustomerDialog(): void {
        this.customerForm = {name: '', phone: '', address: ''};
        this.customerFormError = '';
        this.customerDialogVisible = true;
    }

    saveCustomerFromJobDialog(): void {
        if (!this.customerForm.name.trim() || !this.customerForm.phone.trim()) {
            this.customerFormError = 'Name and phone are required.';
            return;
        }

        this.customerSaving = true;
        this.customerFormError = '';

        this.customerService.create(this.customerForm).subscribe({
            next: (created) => {
                this.customerSaving = false;
                this.customerDialogVisible = false;
                this.form.customerId = created.id;
                this.customers = [
                    ...this.customers.filter(customer => customer.id !== -1),
                    created,
                    {id: -1, name: '+ Add New Customer', phone: '', address: ''}
                ];
                this.toast('success', 'Customer added');
            },
            error: (err) => {
                this.customerSaving = false;
                this.customerFormError = err?.error?.message || 'Failed to add customer.';
            }
        });
    }


    loadTechnicians(): void {
        this.technicianService.getAll().subscribe(data => {
            this.technicians = data;
            this.assignStaffMembers = data.map(t => this.technicianToStaffMember(t));
        });
    }

    /** Convert a Technician (with live status) into the AssignStaffMember shape */
    private technicianToStaffMember(t: Technician): AssignStaffMember {
        const palette = [
            { bg: '#B5D4F4', color: '#0C447C' },
            { bg: '#C0DD97', color: '#27500A' },
            { bg: '#FAC775', color: '#633806' },
            { bg: '#D8B4FE', color: '#5B21B6' },
            { bg: '#FCA5A5', color: '#991B1B' },
            { bg: '#6EE7B7', color: '#065F46' },
        ];
        const idx   = (t.id || 0) % palette.length;
        const avail = t.status === 'In Job' ? 'On job' : 'Available';
        return {
            id:          t.id!,
            name:        t.name,
            initials:    this.getInitials(t.name),
            avatarBg:    palette[idx].bg,
            avatarColor: palette[idx].color,
            status:      avail
        };
    }

    loadInventory(): void {
        this.partService.getAll().subscribe(d => this.inventory = d);
    }

    // ── Create Job ─────────────────────────────────────────────
    openCreateDialog(): void {
        this.form = {receivedDate: new Date()};
        this.createDialogVisible = true;
    }

    createJob(): void {
        if (!this.form.customerId || !this.form.itemName) return;
        this.saving = true;
        const payload: RepairJob = {
            customerId: this.form.customerId,
            itemName: this.form.itemName,
            modelNumber: this.form.modelNumber,
            serialNumber: this.form.serialNumber,
            problemDescription: this.form.problemDescription,
            receivedDate: this.form.receivedDate?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
            expectedDate: this.form.expectedDate?.toISOString().split('T')[0]
        };
        this.repairJobService.create(payload).subscribe({
            next: () => {
                this.saving = false;
                this.createDialogVisible = false;
                this.loadJobs();
                this.refreshStatusCounts();
                this.toast('success', 'Job Created');
            },
            error: () => this.saving = false
        });
    }

    // ── Detail Dialog ──────────────────────────────────────────
    openDetailDialog(job: RepairJob): void {
        // Fetch fresh copy with usedParts
        this.repairJobService.getById(job.id!).subscribe(fresh => {
            this.selectedJob = fresh;
            this.serviceChargeInput = fresh.serviceCharge || 0;
            this.selectedPartId = null;
            this.partQty = 1;
            this.detailDialogVisible = true;
        });
    }

    addPart(): void {
        if (!this.selectedJob || !this.selectedPartId) return;
        this.saving = true;
        this.repairJobService.addPart(this.selectedJob.id!, this.selectedPartId, this.partQty).subscribe({
            next: (updated) => {
                this.selectedJob = updated;
                this.updateJobInGrid(updated);
                this.saving = false;
                this.toast('success', 'Part added');
                this.loadInventory();
            },
            error: (err) => {
                this.saving = false;
                this.toast('error', err.error?.message || 'Failed');
            }
        });
    }

    removePart(jobPartId: number): void {
        this.repairJobService.removePart(this.selectedJob!.id!, jobPartId).subscribe(updated => {
            this.selectedJob = updated;
            this.updateJobInGrid(updated);
            this.loadInventory();
        });
    }

    updateServiceCharge(): void {
        if (!this.selectedJob || this.serviceChargeInput === this.selectedJob.serviceCharge) return;
        this.repairJobService.updateServiceCharge(this.selectedJob.id!, this.serviceChargeInput).subscribe(updated => {
            this.selectedJob = updated;
            this.updateJobInGrid(updated);
        });
    }

    markAsPaid(): void {
        this.saving = true;
        this.repairJobService.pay(this.selectedJob!.id!).subscribe(updated => {
            this.selectedJob = updated;
            this.updateJobInGrid(updated);
            this.saving = false;
            this.toast('success', 'Payment Marked');
        });
    }

    // ── Assign Technician ──────────────────────────────────────
    openAssignDialog(job: RepairJob): void {
        this.selectedJob = job;
        // pre-select the technician already assigned to this job (match by id)
        this.assignTechId = job.technicianId || this.assignStaffMembers[0]?.id || null;
        this.assignDropdownOpen = false;
        this.assignDialogVisible = true;
    }

    get selectedAssignStaff(): AssignStaffMember | undefined {
        return this.assignStaffMembers.find(staff => staff.id === this.assignTechId);
    }

    toggleAssignDropdown(event: MouseEvent): void {
        event.stopPropagation();
        this.assignDropdownOpen = !this.assignDropdownOpen;
    }

    selectAssignStaff(staff: AssignStaffMember): void {
        this.assignTechId = staff.id;
        this.assignDropdownOpen = false;
    }

    saveAssignment(): void {
        if (!this.assignTechId) return;
        this.saving = true;
        this.repairJobService.assignTechnician(this.selectedJob!.id!, this.assignTechId).subscribe(updated => {
            this.updateJobInGrid(updated);
            this.saving = false;
            this.assignDialogVisible = false;
            this.toast('success', 'Staff Assigned');
        });
    }

    openTechnicianDialog(): void {
        this.assignDropdownOpen = false;
        this.technicianForm = {name: '', phone: ''};
        this.technicianFormError = '';
        this.technicianDialogVisible = true;
    }

    saveTechnician(): void {
        if (!this.technicianForm.name.trim() || !this.technicianForm.phone.trim()) {
            this.technicianFormError = 'Name and phone are required.';
            return;
        }

        this.technicianSaving = true;
        this.technicianFormError = '';

        this.technicianService.create(this.technicianForm).subscribe({
            next: (created) => {
                this.technicianSaving = false;
                this.technicianDialogVisible = false;
                this.toast('success', 'Technician added');
                // Reload real list from API so status data is accurate
                this.technicianService.getAll().subscribe(data => {
                    this.technicians = data;
                    this.assignStaffMembers = data.map(t => this.technicianToStaffMember(t));
                    // auto-select the newly created technician
                    this.assignTechId = created.id || null;
                });
            },
            error: (err) => {
                this.technicianSaving = false;
                this.technicianFormError = err?.error?.message || 'Failed to add technician.';
            }
        });
    }

    getStaffStatusClass(status: AssignStaffMember['status']): string {
        return status === 'Available' ? 'staff-status--available' : 'staff-status--busy';
    }

    // ── Status Dialog ──────────────────────────────────────────
    openStatusDialog(job: RepairJob): void {
        this.selectedJob = job;
        this.newStatus = job.status!;
        this.statusError = '';
        this.assignTechId = job.technicianId || null;
        this.statusDropdownOpen = false;
        this.assignDropdownOpen = false;
        this.statusDialogVisible = true;
    }

    get selectedStatusConfig(): JobStatusConfig | undefined {
        return this.statusConfigs.find(status => status.statusKey === this.newStatus);
    }

    toggleStatusDropdown(event: MouseEvent): void {
        event.stopPropagation();
        this.statusDropdownOpen = !this.statusDropdownOpen;
        this.assignDropdownOpen = false;
    }

    selectStatus(status: JobStatusConfig): void {
        this.newStatus = status.statusKey;
        this.statusDropdownOpen = false;
    }

    saveStatus(): void {
        this.saving = true;
        this.repairJobService.updateStatus(this.selectedJob!.id!, this.newStatus, this.assignTechId || undefined).subscribe({
            next: (updated) => {
                this.updateJobInGrid(updated);
                this.saving = false;
                this.statusDialogVisible = false;
                this.refreshStatusCounts();
                this.toast('success', 'Status Saved');
            },
            error: (err) => {
                this.saving = false;
                this.statusError = err.error?.message || 'Error';
            }
        });
    }

    // ── Helpers ────────────────────────────────────────────────
    private updateJobInGrid(updated: RepairJob): void {
        const idx = this.jobs.findIndex(j => j.id === updated.id);
        if (idx !== -1) this.jobs[idx] = updated;
    }

    get today(): Date {
        return new Date();
    }

    printBill(): void {
        if (!this.selectedJob) return;

        const job = this.selectedJob;
        const statusLabel = this.getStatusLabel(job.status);
        const printDate = new Date().toLocaleString('en-GB');

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Bill – ${job.jobNumber}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif;
      font-size: 13px; color: #1e293b; background: #fff;
      padding: 32px 40px; max-width: 800px; margin: 0 auto;
    }
    /* ── Header ── */
    .bill-header {
      display: flex; justify-content: space-between; align-items: flex-start;
      padding-bottom: 16px; border-bottom: 2.5px solid #2563eb; margin-bottom: 20px;
    }
    .bill-brand { display: flex; align-items: center; gap: 12px; }
    .bill-logo {
      width: 44px; height: 44px; background: #2563eb; border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      color: #fff; font-size: 20px; font-weight: 800;
    }
    .bill-company { font-size: 22px; font-weight: 800; color: #2563eb; letter-spacing: -0.5px; }
    .bill-tagline { font-size: 11px; color: #64748b; margin-top: 2px; }
    
    .header-right { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; }
    .bill-company-details { text-align: right; font-size: 11px; color: #475569; line-height: 1.4; }
    .bill-company-details strong { font-size: 13px; color: #1e293b; display: block; margin-bottom: 2px; font-weight: 700; }
    
    .bill-paid-stamp {
      font-size: 12px; font-weight: 800; color: #15803d;
      border: 2px solid #15803d; border-radius: 6px;
      padding: 4px 10px; letter-spacing: 1px;
    }
    /* ── Meta ── */
    .bill-meta {
      display: grid; grid-template-columns: 1fr 1fr; gap: 6px 32px;
      padding: 14px 16px; background: #f8fafc; border-radius: 8px; margin-bottom: 22px;
    }
    .meta-row { display: flex; gap: 8px; font-size: 12px; margin-bottom: 3px; }
    .lbl { color: #64748b; font-weight: 600; min-width: 90px; }
    .val { color: #1e293b; font-weight: 500; }
    /* ── Totals ── */
    .totals { margin-left: auto; width: 300px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; margin-bottom: 24px; }
    .total-row { display: flex; justify-content: space-between; padding: 8px 14px; font-size: 12px; color: #475569; border-bottom: 1px solid #f1f5f9; }
    .total-row.grand { background: #2563eb; color: #fff; font-weight: 800; font-size: 14px; border-bottom: none; }
    /* ── Footer ── */
    .bill-footer { text-align: center; margin-top: 28px; padding-top: 14px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; }
    .bill-footer .date { margin-top: 4px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="bill-header">
    <div class="bill-brand">
      <div class="bill-logo">T</div>
      <div>
        <div class="bill-company">Torque</div>
        <div class="bill-tagline">Repair Shop Management System</div>
      </div>
    </div>
    <div class="header-right">
      <div class="bill-company-details">
        <strong>NEW VERSION ELECTRONIC</strong>
        SINGER SERVICE PLUS (AGENT)<br>
        NO 199/1/1, GALAGEDARA RD<br>
        KATUGASTOTA<br>
        0715337016 / 0812498145
      </div>
      <div class="bill-paid-stamp" style="display: ${job.paid ? 'block' : 'none'}">✓ PAID</div>
    </div>
  </div>

  <div class="bill-meta">
    <div>
      <div class="meta-row"><span class="lbl">Invoice No</span><span class="val">${job.jobNumber}</span></div>
      <div class="meta-row"><span class="lbl">Customer</span><span class="val">${job.customerName}</span></div>
      <div class="meta-row"><span class="lbl">Phone</span><span class="val">${job.customerPhone ?? '—'}</span></div>
      <div class="meta-row"><span class="lbl">Item</span><span class="val">${job.itemName}</span></div>
      ${job.modelNumber ? `<div class="meta-row"><span class="lbl">Model No.</span><span class="val">${job.modelNumber}</span></div>` : ''}
      ${job.serialNumber ? `<div class="meta-row"><span class="lbl">Serial No.</span><span class="val">${job.serialNumber}</span></div>` : ''}
    </div>
    <div>
      <div class="meta-row"><span class="lbl">Technician</span><span class="val">${job.technicianName ?? 'Unassigned'}</span></div>
      <div class="meta-row"><span class="lbl">Received</span><span class="val">${job.receivedDate ?? '—'}</span></div>
      ${job.expectedDate ? `<div class="meta-row"><span class="lbl">Expected</span><span class="val">${job.expectedDate}</span></div>` : ''}
      <div class="meta-row"><span class="lbl">Status</span><span class="val">${statusLabel}</span></div>
    </div>
  </div>

  <div class="totals">

    <div class="total-row grand"><span>NET TOTAL</span><span>Rs. ${(job.netTotal ?? 0).toFixed(2)}</span></div>
  </div>

  <div class="bill-footer">
    <p>Thank you for choosing Torque. Please keep this receipt for your records.</p>
    <p class="date">Printed: ${printDate}</p>
  </div>

  <script>
    window.onload = function() { window.print(); window.onafterprint = function() { window.close(); }; };
  </script>
</body>
</html>`;


        const printWindow = window.open('', '_blank', 'width=900,height=700');
        if (!printWindow) {
            alert('Pop-up blocked. Please allow pop-ups for this site to print the bill.');
            return;
        }
        printWindow.document.write(html);
        printWindow.document.close();
    }

    private toast(severity: string, detail: string): void {
        this.messageService.add({severity, summary: severity, detail});
    }

    private getInitials(name: string): string {
        return name
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map(part => part.charAt(0).toUpperCase())
            .join('');
    }
}
