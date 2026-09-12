import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { DropdownModule } from 'primeng/dropdown';
import { PaginatorModule } from 'primeng/paginator';
import { MessageService } from 'primeng/api';

import { Part, PartService, CsvImportResult, CsvRowError } from '../../../shared/services/part.service';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    TableModule, ButtonModule, InputTextModule,
    DialogModule, ToastModule, TooltipModule,
    DropdownModule, PaginatorModule
  ],
  providers: [MessageService],
  templateUrl: './inventory.component.html',
  styleUrls: ['./inventory.component.css']
})
export class InventoryComponent implements OnInit {

  // ── Grid data ──────────────────────────────────────────────
  parts: Part[] = [];
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
    name:             '',
    stockStatus:      null as string | null,
    category:         '',
    containerLocation: ''
  };
  stockStatusDropdownOpen = false;

  // ── Stats (separate lightweight counters) ─────────────────
  totalPartsCount  = 0;
  inStockCount     = 0;
  lowStockCount    = 0;

  // ── Stock status dropdown options ──────────────────────────
  stockStatusOptions = [
    { label: 'Available (> 5)', value: 'available' },
    { label: 'Low Stock (≤ 5)', value: 'low' }
  ];

  // ── Dialog state ───────────────────────────────────────────
  saving = false;
  dialogVisible = false;
  isEdit = false;
  form: Part = { name: '', price: 0, stockQuantity: 0, category: '', containerLocation: '' };
  formError = '';
  originalStockQuantity = 0;

  // ── Image Upload state ─────────────────────────────────────
  selectedImageFile: File | null = null;
  imagePreviewUrl: string | null = null;
  imageDragOver = false;
  imageRemoved = false;

  // ── CSV Import state ──────────────────────────────────────
  csvDialogVisible = false;
  csvFile: File | null = null;
  csvImporting = false;
  csvDragOver = false;
  csvResult: CsvImportResult | null = null;
  csvFileError = '';

  // ── Export state ───────────────────────────────────────────
  exporting = false;

  constructor(
    public router: Router,
    private partService: PartService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.loadParts();
    this.refreshStats();
  }

  @HostListener('document:click', ['$event'])
  closeDropdownOnOutsideClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target?.closest('.stock-filter-dropdown')) {
      this.stockStatusDropdownOpen = false;
    }
  }

  // ── Primary data loader ────────────────────────────────────
  loadParts(event?: { first?: number; rows?: number; sortField?: string; sortOrder?: number }): void {
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
        name:             { value: this.filters.name             || null, matchMode: 'contains' },
        stockStatus:      { value: this.filters.stockStatus      || null, matchMode: 'equals'   },
        category:         { value: this.filters.category         || null, matchMode: 'contains' },
        containerLocation:{ value: this.filters.containerLocation || null, matchMode: 'contains' }
      }
    };

    this.loading = true;
    this.partService.searchPaged(payload).subscribe({
      next: (res) => {
        this.parts        = res.data;
        this.totalRecords = res.totalRecords;
        this.loading = false;
      },
      error: () => { this.loading = false; this.toast('error', 'Failed to load inventory.'); }
    });
  }

  // ── Refresh stat cards ─────────────────────────────────────
  refreshStats(): void {
    this.partService.getAll().subscribe(all => {
      this.totalPartsCount = all.length;
      this.inStockCount    = all.filter(p => p.stockQuantity > 5).length;
      this.lowStockCount   = all.filter(p => p.stockQuantity <= 5).length;
    });
  }

  // ── Filter / pagination triggers ───────────────────────────
  onFilterChange(): void { this.first = 0; this.loadParts(); }
  onSearch():       void { this.first = 0; this.loadParts(); }

  get selectedStockStatusLabel(): string {
    return this.stockStatusOptions.find(option => option.value === this.filters.stockStatus)?.label || 'All';
  }

  toggleStockStatusDropdown(event: MouseEvent): void {
    event.stopPropagation();
    this.stockStatusDropdownOpen = !this.stockStatusDropdownOpen;
  }

  selectStockStatus(value: string | null): void {
    this.filters.stockStatus = value;
    this.stockStatusDropdownOpen = false;
    this.onFilterChange();
  }

  onPageChange(event: any): void {
    this.first = event.first;
    this.rows  = event.rows;
    this.loadParts();
  }

  // ── Dialog ─────────────────────────────────────────────────
  openCreateDialog(): void {
    this.isEdit = false;
    this.form = { name: '', price: 0, stockQuantity: 0, category: '', containerLocation: '' };
    this.formError = '';
    this.originalStockQuantity = 0;
    this.selectedImageFile = null;
    this.imagePreviewUrl = null;
    this.imageRemoved = false;
    this.dialogVisible = true;
  }

  openEditDialog(part: Part): void {
    this.isEdit = true;
    this.form = { ...part };
    this.formError = '';
    this.originalStockQuantity = part.stockQuantity;
    this.selectedImageFile = null;
    this.imagePreviewUrl = part.hasImage ? this.getPartImageUrl(part.id!) : null;
    this.imageRemoved = false;
    this.dialogVisible = true;
  }

  savePart(): void {
    if (!this.form.name.trim() || this.form.price === null || this.form.stockQuantity === null) {
      this.formError = 'All fields are required.';
      return;
    }
    if (this.isEdit && this.form.stockQuantity < this.originalStockQuantity) {
      this.formError = `You cannot manually decrease the stock quantity below its current value (${this.originalStockQuantity}).`;
      return;
    }
    this.saving = true;
    const request = this.isEdit
      ? this.partService.update(this.form.id!, this.form)
      : this.partService.create(this.form);

    request.subscribe({
      next: (savedPart) => {
        if (this.selectedImageFile && savedPart.id) {
          this.partService.uploadImage(savedPart.id, this.selectedImageFile).subscribe({
            next: () => this.finalizeSave(),
            error: () => {
              this.saving = false;
              this.toast('error', 'Part saved, but image upload failed.');
              this.finalizeSave();
            }
          });
        } else if (this.isEdit && this.imageRemoved && savedPart.id) {
          this.partService.deleteImage(savedPart.id).subscribe({
            next: () => this.finalizeSave(),
            error: () => {
              this.saving = false;
              this.toast('error', 'Part saved, but failed to remove image.');
              this.finalizeSave();
            }
          });
        } else {
          this.finalizeSave();
        }
      },
      error: (err) => { this.saving = false; this.formError = err?.error?.message || 'Failed to save part.'; }
    });
  }

  private finalizeSave(): void {
    this.saving = false;
    this.dialogVisible = false;
    this.loadParts();
    this.refreshStats();
    this.toast('success', `Part ${this.isEdit ? 'updated' : 'added'} successfully.`);
  }

  // ── Image Upload Handlers ──────────────────────────────────
  onImageDragOver(event: DragEvent): void {
    event.preventDefault();
    this.imageDragOver = true;
  }

  onImageDragLeave(): void {
    this.imageDragOver = false;
  }

  onImageDrop(event: DragEvent): void {
    event.preventDefault();
    this.imageDragOver = false;
    const file = event.dataTransfer?.files?.[0];
    if (file) this.setImageFile(file);
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.setImageFile(file);
  }

  private setImageFile(file: File): void {
    if (!file.type.startsWith('image/')) {
      this.formError = 'Only image files are allowed.';
      return;
    }
    this.formError = '';
    this.selectedImageFile = file;
    const reader = new FileReader();
    reader.onload = (e) => this.imagePreviewUrl = e.target?.result as string;
    reader.readAsDataURL(file);
  }

  removeSelectedImage(event: Event): void {
    event.stopPropagation();
    this.selectedImageFile = null;
    this.imagePreviewUrl = null;
    this.imageRemoved = true;
  }

  getPartImageUrl(id: number): string {
    // Add a timestamp to bypass browser cache when image is updated
    return `${this.partService.getImageUrl(id)}?t=${new Date().getTime()}`;
  }

  deletePart(part: Part): void {
    if (confirm(`Are you sure you want to delete ${part.name}?`)) {
      this.partService.delete(part.id!).subscribe({
        next: () => { this.loadParts(); this.refreshStats(); this.toast('success', 'Part deleted.'); },
        error: () => this.toast('error', 'Failed to delete part.')
      });
    }
  }

  // ── CSV Import ─────────────────────────────────────────────
  openCsvDialog(): void {
    this.csvFile = null;
    this.csvResult = null;
    this.csvFileError = '';
    this.csvDragOver = false;
    this.csvDialogVisible = true;
  }

  onCsvDragOver(event: DragEvent): void {
    event.preventDefault();
    this.csvDragOver = true;
  }

  onCsvDragLeave(): void {
    this.csvDragOver = false;
  }

  onCsvDrop(event: DragEvent): void {
    event.preventDefault();
    this.csvDragOver = false;
    const file = event.dataTransfer?.files?.[0];
    if (file) this.setCsvFile(file);
  }

  onCsvFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.setCsvFile(file);
  }

  private setCsvFile(file: File): void {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      this.csvFileError = 'Only .csv files are accepted.';
      this.csvFile = null;
      return;
    }
    this.csvFileError = '';
    this.csvResult = null;
    this.csvFile = file;
  }

  importCsv(): void {
    if (!this.csvFile) return;
    this.csvImporting = true;
    this.csvResult = null;
    this.partService.importCsv(this.csvFile).subscribe({
      next: (result) => {
        this.csvImporting = false;
        this.csvResult = result;
        this.loadParts();
        this.refreshStats();
        if (result.importedCount > 0) {
          this.toast('success', `${result.importedCount} part(s) imported successfully.`);
        }
      },
      error: () => {
        this.csvImporting = false;
        this.toast('error', 'Import failed. Please check your file and try again.');
      }
    });
  }

  downloadCsvTemplate(): void {
    const header = 'name,price,stockQuantity,category,containerLocation';
    const sample = [
      'Sewing Machine Belt,250.00,20,Belts,Shelf A-3',
      'Needle Bar Spring,75.50,50,Needles,Drawer 2B',
      'Presser Foot Set,450.00,15,Accessories,Shelf B-1'
    ].join('\n');
    const content = header + '\n' + sample;
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'parts-import-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  private toast(severity: string, detail: string): void {
    this.messageService.add({ severity, summary: severity === 'success' ? 'Success' : 'Error', detail });
  }

  exportToExcel(): void {
    this.exporting = true;
    this.partService.getAll().subscribe({
      next: (parts) => {
        const headers = ['Part Name', 'Unit Price (Rs.)', 'Stock Quantity', 'Category', 'Location', 'Status'];
        
        const rows = parts.map(p => {
          return [
            `"${(p.name || '').replace(/"/g, '""')}"`,
            p.price,
            p.stockQuantity,
            `"${(p.category || '').replace(/"/g, '""')}"`,
            `"${(p.containerLocation || '').replace(/"/g, '""')}"`,
            p.stockQuantity > 5 ? 'Available' : 'Low Stock'
          ].join(',');
        });
        
        const csvContent = headers.join(',') + '\n' + rows.join('\n');
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' }); // \uFEFF is BOM for Excel to read UTF-8 correctly
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Spare_Parts_Inventory.csv';
        a.click();
        URL.revokeObjectURL(url);
        
        this.exporting = false;
        this.toast('success', 'Inventory exported successfully.');
      },
      error: () => {
        this.exporting = false;
        this.toast('error', 'Failed to export inventory.');
      }
    });
  }
}
