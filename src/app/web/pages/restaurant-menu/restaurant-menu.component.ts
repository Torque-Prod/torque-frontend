import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';

import { PaginatorModule } from 'primeng/paginator';

import {
  RestaurantMenuItemService,
  RestaurantMenuItemModel,
  RestaurantCategory
} from '../../../shared/services/restaurant-menu-item.service';

@Component({
  selector: 'app-restaurant-menu',
  standalone: true,
  imports: [CommonModule, FormsModule, ToastModule, DialogModule, PaginatorModule],
  providers: [MessageService],
  templateUrl: './restaurant-menu.component.html',
  styleUrls: ['./restaurant-menu.component.css']
})
export class RestaurantMenuComponent implements OnInit {
  categories: RestaurantCategory[] = [];
  allItems: RestaurantMenuItemModel[] = [];
  filteredItems: RestaurantMenuItemModel[] = [];
  selectedCategoryId: number | null = null;
  searchQuery = '';
  loading = false;

  // Stats
  totalCount = 0;
  availableCount = 0;
  unavailableCount = 0;

  // Dialog
  dialogVisible = false;
  editingItem: RestaurantMenuItemModel | null = null;
  saving = false;
  selectedImageFile: File | null = null;
  imagePreview: string | null = null;

  form = {
    name: '',
    description: '',
    price: 0 as number,
    categoryId: null as number | null,
    available: true
  };

  constructor(
    private menuItemService: RestaurantMenuItemService,
    private messageService: MessageService
  ) {}

  first = 0;
  rows = 10;
  totalRecords = 0;

  ngOnInit(): void {
    this.loadAll();
  }

  loadAll(): void {
    this.loading = true;
    this.menuItemService.getCategories().subscribe(cats => this.categories = cats);
    this.menuItemService.getAllItems().subscribe({
      next: items => {
        this.allItems = items;
        this.totalCount = items.length;
        this.availableCount = items.filter(i => i.available).length;
        this.unavailableCount = items.filter(i => !i.available).length;
        this.applyFilter();
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  filterByCategory(catId: number | null): void {
    this.selectedCategoryId = catId;
    this.first = 0;
    this.applyFilter();
  }

  onSearch(): void {
    this.first = 0;
    this.applyFilter();
  }

  applyFilter(): void {
    let items = this.allItems;
    if (this.selectedCategoryId !== null) {
      items = items.filter(i => i.categoryId === this.selectedCategoryId);
    }
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      items = items.filter(i => i.name.toLowerCase().includes(q) || (i.categoryName || '').toLowerCase().includes(q));
    }
    
    this.totalRecords = items.length;
    this.filteredItems = items.slice(this.first, this.first + this.rows);
  }

  onPageChange(event: any): void {
    this.first = event.first;
    this.rows = event.rows;
    this.applyFilter();
  }

  openAddDialog(): void {
    this.editingItem = null;
    this.form = { name: '', description: '', price: 0, categoryId: null, available: true };
    this.selectedImageFile = null;
    this.imagePreview = null;
    this.dialogVisible = true;
  }

  openEditDialog(item: RestaurantMenuItemModel): void {
    this.editingItem = item;
    this.form = {
      name: item.name,
      description: item.description,
      price: item.price,
      categoryId: item.categoryId,
      available: item.available
    };
    this.imagePreview = item.imageBase64 || null;
    this.selectedImageFile = null;
    this.dialogVisible = true;
  }

  onImageSelected(event: any): void {
    const file: File = event.target.files[0];
    if (!file) return;
    this.selectedImageFile = file;
    const reader = new FileReader();
    reader.onload = (e: any) => this.imagePreview = e.target.result;
    reader.readAsDataURL(file);
  }

  removeImage(): void {
    this.selectedImageFile = null;
    this.imagePreview = null;
  }

  saveItem(): void {
    if (!this.form.name?.trim()) {
      this.messageService.add({ severity: 'warn', summary: 'Validation', detail: 'Item name is required.' });
      return;
    }
    if (!this.form.price || this.form.price <= 0) {
      this.messageService.add({ severity: 'warn', summary: 'Validation', detail: 'A valid price is required.' });
      return;
    }
    this.saving = true;

    const formData = new FormData();
    const itemBlob = new Blob([JSON.stringify({
      name: this.form.name,
      description: this.form.description,
      price: this.form.price,
      categoryId: this.form.categoryId,
      available: this.form.available
    })], { type: 'application/json' });
    formData.append('item', itemBlob);
    if (this.selectedImageFile) formData.append('image', this.selectedImageFile);

    const request$ = this.editingItem
      ? this.menuItemService.updateItem(this.editingItem.id, formData)
      : this.menuItemService.createItem(formData);

    request$.subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Saved', detail: `Menu item ${this.editingItem ? 'updated' : 'created'} successfully.` });
        this.dialogVisible = false;
        this.saving = false;
        this.loadAll();
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to save menu item.' });
        this.saving = false;
      }
    });
  }

  deleteItem(item: RestaurantMenuItemModel): void {
    if (!confirm(`Delete "${item.name}"? This action cannot be undone.`)) return;
    this.menuItemService.deleteItem(item.id).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Deleted', detail: `"${item.name}" has been removed.` });
        this.loadAll();
      },
      error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete item.' })
    });
  }

  toggleAvailability(item: RestaurantMenuItemModel): void {
    const formData = new FormData();
    const blob = new Blob([JSON.stringify({
      name: item.name, description: item.description,
      price: item.price, categoryId: item.categoryId,
      available: !item.available
    })], { type: 'application/json' });
    formData.append('item', blob);
    this.menuItemService.updateItem(item.id, formData).subscribe({
      next: () => { item.available = !item.available; this.applyFilter(); },
      error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to update availability.' })
    });
  }
}
