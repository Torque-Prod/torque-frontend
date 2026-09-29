import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { TooltipModule } from 'primeng/tooltip';
import { PaginatorModule } from 'primeng/paginator';
import { CalendarModule } from 'primeng/calendar';
import { TagModule } from 'primeng/tag';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

import { PartService, Part, PagedPartResponse } from '../../../shared/services/part.service';
import { CustomerService, Customer } from '../../../shared/services/customer.service';
import { SaleService, SaleDto, CreateSaleRequest } from '../../../shared/services/sale.service';
import { AuthService } from '../../../shared/services/auth.service';
import { BusinessTypeService, BusinessType, TenantInfo } from '../../../shared/services/business-type.service';
import { RestaurantMenuItemService, RestaurantMenuItemModel } from '../../../shared/services/restaurant-menu-item.service';
import { RestaurantTableService, RestaurantTableModel, TableStatus } from '../../../shared/services/restaurant-table.service';
import { RestaurantOrderService, TableSessionModel, RestaurantOrderModel, RestaurantOrderItemModel, OrderItemStatus, OrderStatus } from '../../../shared/services/restaurant-order.service';

export interface CartItem {
  part: Part;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  itemType: 'PART' | 'MENU_ITEM';  // tells the backend how to handle this line
  itemName?: string;               // snapshot of name for MENU_ITEM
}

@Component({
  selector: 'app-sales',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ToastModule, DialogModule,
    DropdownModule,
    TooltipModule,
    PaginatorModule,
    CalendarModule,
    TagModule,
    ConfirmDialogModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './sales.component.html',
  styleUrls: ['./sales.component.css']
})
export class SalesComponent implements OnInit {

  // Active View Tab: 'pos' | 'tables' | 'history'
  activeTab: 'pos' | 'tables' | 'history' = 'pos';

  // ── Business Type & Tenant Info ──
  businessType: BusinessType = 'REPAIR_CENTER';
  tenantInfo: any = {};

  // ── POS Catalog State (Server-Side Paginated) — Repair Center ──
  catalogParts: Part[] = [];
  catalogTotalRecords: number = 0;
  catalogFirst: number = 0;
  catalogRows: number = 12;
  catalogSearch: string = '';
  loadingCatalog: boolean = false;

  // ── POS Catalog State — Restaurant ──
  restaurantItems: RestaurantMenuItemModel[] = [];
  filteredRestaurantItems: RestaurantMenuItemModel[] = [];
  restaurantSearch: string = '';

  // ── POS Cart State ──
  cart: CartItem[] = [];
  isWalkIn: boolean = true;
  customers: Customer[] = [];
  selectedCustomerId: number | null = null;
  customerName: string = 'Walk-in Customer';
  customerPhone: string = '';

  // ── Billing Summary ──
  subtotal: number = 0;
  discount: number = 0;
  tax: number = 0;
  netTotal: number = 0;
  paidAmount: number = 0;
  changeAmount: number = 0;
  paymentMethod: string = 'CASH';
  notes: string = '';

  paymentMethods = [
    { label: 'Cash', value: 'CASH', icon: 'pi-money-bill' },
    { label: 'Card', value: 'CARD', icon: 'pi-credit-card' },
    { label: 'Bank Transfer', value: 'TRANSFER', icon: 'pi-building' },
    { label: 'Credit / Pay Later', value: 'CREDIT', icon: 'pi-clock' }
  ];

  // ── Checkout & Invoice Modal ──
  checkingOut: boolean = false;
  invoiceModalVisible: boolean = false;
  currentInvoice: SaleDto | null = null;

  // ── Sales History Tab State ──
  salesHistory: SaleDto[] = [];
  historyTotalRecords: number = 0;
  historyTotalRevenue: number = 0;
  historyFirst: number = 0;
  historyRows: number = 25;
  historySearch: string = '';
  historyDateRange: Date[] = [];
  historyFilters: any = {
    invoiceNumber: '',
    customerName: '',
    paymentMethod: ''
  };
  loadingHistory: boolean = false;

  // ── Restaurant Tables & Live Sessions State ──
  tables: RestaurantTableModel[] = [];
  filteredTables: RestaurantTableModel[] = [];
  loadingTables: boolean = false;
  filterTableStatus: TableStatus | '' = '';
  filterTableSection: string = '';
  tableSections: string[] = [];
  tableSearchQuery: string = '';

  selectedTableForOrders: RestaurantTableModel | null = null;
  activeSessionForTable: TableSessionModel | null = null;
  ordersForActiveSession: RestaurantOrderModel[] = [];
  loadingSessionOrders: boolean = false;
  orderModalVisible: boolean = false;

  // Inline Order Round Creator State
  showAddItemSection: boolean = false;
  tableOrderDraftItems: { menuItem: RestaurantMenuItemModel; quantity: number; notes: string }[] = [];
  tableOrderSearchQuery: string = '';
  filteredTableMenu: RestaurantMenuItemModel[] = [];
  submittingOrderRound: boolean = false;

  checkoutModalVisible: boolean = false;
  checkoutCustomerName: string = '';
  checkoutCustomerPhone: string = '';
  checkoutPaymentMethod: string = 'CASH';
  checkoutDiscount: number = 0;
  checkoutTax: number = 0;
  checkoutPaidAmount: number = 0;
  checkoutNotes: string = '';
  processingCheckout: boolean = false;

  constructor(
    private partService: PartService,
    private customerService: CustomerService,
    private saleService: SaleService,
    public authService: AuthService,
    private messageService: MessageService,
    private router: Router,
    private businessTypeService: BusinessTypeService,
    private restaurantMenuItemService: RestaurantMenuItemService,
    private restaurantTableService: RestaurantTableService,
    private restaurantOrderService: RestaurantOrderService
  ) {}

  ngOnInit(): void {
    this.businessTypeService.getTenantInfo().subscribe((info: TenantInfo) => {
      this.tenantInfo = info;
      this.businessType = info.type;
      if (info.type === 'RESTAURANT') {
        this.loadRestaurantCatalog();
        this.loadTables();
      } else {
        this.loadCatalog();
      }
    });
    this.loadCustomers();
  }

  // ─── RESTAURANT CATALOG ───────────────────────────────────
  loadRestaurantCatalog(): void {
    this.loadingCatalog = true;
    this.restaurantMenuItemService.getAvailableItems().subscribe({
      next: (items) => {
        this.restaurantItems = items;
        this.filteredRestaurantItems = items;
        this.loadingCatalog = false;
      },
      error: () => {
        this.loadingCatalog = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load restaurant menu' });
      }
    });
  }

  onRestaurantSearch(): void {
    const q = this.restaurantSearch.toLowerCase().trim();
    if (!q) {
      this.filteredRestaurantItems = this.restaurantItems;
    } else {
      this.filteredRestaurantItems = this.restaurantItems.filter(item =>
        item.name.toLowerCase().includes(q) || (item.categoryName && item.categoryName.toLowerCase().includes(q))
      );
    }
  }

  // Add food menu item to POS cart
  addMenuItemToCart(foodItem: RestaurantMenuItemModel): void {
    const existing = this.cart.find(i => i.part.id === foodItem.id && i.itemType === 'MENU_ITEM');
    if (existing) {
      existing.quantity++;
      existing.totalPrice = existing.quantity * existing.unitPrice;
    } else {
      const dummyPart: Part = {
        id: foodItem.id,
        name: foodItem.name,
        category: foodItem.categoryName || 'Food',
        price: foodItem.price,
        stockQuantity: 9999
      };
      this.cart.push({
        part: dummyPart,
        quantity: 1,
        unitPrice: foodItem.price,
        totalPrice: foodItem.price,
        itemType: 'MENU_ITEM',
        itemName: foodItem.name
      });
    }
    this.calculateTotals();
    this.messageService.add({ severity: 'success', summary: 'Added to Cart', detail: foodItem.name });
  }

  // ─── REPAIR CENTER CATALOG ────────────────────────────────
  loadCatalog(): void {
    this.loadingCatalog = true;
    const dto = {
      first: this.catalogFirst,
      rows: this.catalogRows,
      globalFilter: this.catalogSearch,
      sortField: 'name',
      sortOrder: 1
    };

    this.partService.searchPaged(dto).subscribe({
      next: (res: PagedPartResponse) => {
        this.catalogParts = res.data || [];
        this.catalogTotalRecords = res.totalRecords || 0;
        this.loadingCatalog = false;
      },
      error: () => {
        this.loadingCatalog = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load parts catalog' });
      }
    });
  }

  onCatalogSearch(): void {
    this.catalogFirst = 0;
    this.loadCatalog();
  }

  onCatalogPageChange(event: any): void {
    this.catalogFirst = event.first;
    this.catalogRows = event.rows;
    this.loadCatalog();
  }

  // ─── CART MANAGEMENT ──────────────────────────────────────
  addToCart(part: Part): void {
    if (part.stockQuantity <= 0) {
      this.messageService.add({ severity: 'warn', summary: 'Out of Stock', detail: `${part.name} is currently out of stock.` });
      return;
    }
    const existing = this.cart.find(i => i.part.id === part.id && i.itemType === 'PART');
    if (existing) {
      if (existing.quantity >= part.stockQuantity) {
        this.messageService.add({ severity: 'warn', summary: 'Stock Limit', detail: `Only ${part.stockQuantity} items in stock.` });
        return;
      }
      existing.quantity++;
      existing.totalPrice = existing.quantity * existing.unitPrice;
    } else {
      this.cart.push({
        part: part,
        quantity: 1,
        unitPrice: part.price,
        totalPrice: part.price,
        itemType: 'PART'
      });
    }
    this.calculateTotals();
  }

  incrementQuantity(item: CartItem): void {
    if (item.itemType === 'PART' && item.quantity >= item.part.stockQuantity) {
      this.messageService.add({ severity: 'warn', summary: 'Stock Limit', detail: `Only ${item.part.stockQuantity} available.` });
      return;
    }
    item.quantity++;
    item.totalPrice = item.quantity * item.unitPrice;
    this.calculateTotals();
  }

  decrementQuantity(item: CartItem): void {
    if (item.quantity > 1) {
      item.quantity--;
      item.totalPrice = item.quantity * item.unitPrice;
    } else {
      this.removeFromCart(item);
    }
    this.calculateTotals();
  }

  updateItemQuantity(item: CartItem, newQty: number): void {
    if (newQty <= 0) {
      this.removeFromCart(item);
      return;
    }
    if (item.itemType === 'PART' && newQty > item.part.stockQuantity) {
      item.quantity = item.part.stockQuantity;
      this.messageService.add({ severity: 'warn', summary: 'Stock Limit', detail: `Capped to max stock: ${item.part.stockQuantity}` });
    } else {
      item.quantity = newQty;
    }
    item.totalPrice = item.quantity * item.unitPrice;
    this.calculateTotals();
  }

  updateItemUnitPrice(item: CartItem, newPrice: number): void {
    item.unitPrice = Math.max(0, newPrice || 0);
    item.totalPrice = item.quantity * item.unitPrice;
    this.calculateTotals();
  }

  removeFromCart(item: CartItem): void {
    this.cart = this.cart.filter(i => !(i.part.id === item.part.id && i.itemType === item.itemType));
    this.calculateTotals();
  }

  clearCart(): void {
    this.cart = [];
    this.calculateTotals();
  }

  calculateTotals(): void {
    this.subtotal = this.cart.reduce((sum, i) => sum + i.totalPrice, 0);
    this.netTotal = Math.max(0, this.subtotal - (this.discount || 0) + (this.tax || 0));
    if (this.paidAmount < this.netTotal && this.paymentMethod === 'CASH') {
      this.paidAmount = this.netTotal;
    }
    this.changeAmount = Math.max(0, (this.paidAmount || 0) - this.netTotal);
  }

  // ─── CUSTOMER SELECTION ────────────────────────────────
  loadCustomers(): void {
    this.customerService.getAll().subscribe({
      next: (custs) => {
        this.customers = custs || [];
      }
    });
  }

  onCustomerTypeChange(): void {
    if (this.isWalkIn) {
      this.selectedCustomerId = null;
      this.customerName = 'Walk-in Customer';
      this.customerPhone = '';
    } else {
      this.customerName = '';
      this.customerPhone = '';
    }
  }

  onCustomerSelect(cust: Customer | null): void {
    if (cust) {
      this.selectedCustomerId = cust.id!;
      this.customerName = cust.name;
      this.customerPhone = cust.phone || '';
    }
  }

  // ─── CHECKOUT & INVOICE ─────────────────────────────────
  completeSale(): void {
    if (this.cart.length === 0) {
      this.messageService.add({ severity: 'error', summary: 'Cart Empty', detail: 'Please add items to cart before checkout.' });
      return;
    }

    if (!this.isWalkIn && (!this.customerName || !this.customerName.trim())) {
      this.messageService.add({ severity: 'error', summary: 'Customer Required', detail: 'Please select or enter customer name.' });
      return;
    }

    this.checkingOut = true;

    const payload: CreateSaleRequest = {
      customerId: this.selectedCustomerId,
      customerName: this.isWalkIn ? 'Walk-in Customer' : this.customerName,
      customerPhone: this.customerPhone,
      paymentMethod: this.paymentMethod,
      discount: this.discount || 0,
      tax: this.tax || 0,
      paidAmount: this.paidAmount || this.netTotal,
      notes: this.notes,
      items: this.cart.map(i => ({
        partId: i.itemType === 'PART' ? i.part.id! : null,
        itemType: i.itemType,
        itemName: i.itemName || i.part.name,
        quantity: i.quantity,
        unitPrice: i.unitPrice
      }))
    };

    this.saleService.checkout(payload).subscribe({
      next: (sale) => {
        this.checkingOut = false;
        this.currentInvoice = sale;
        this.invoiceModalVisible = true;
        this.messageService.add({ severity: 'success', summary: 'Sale Completed', detail: `Invoice #${sale.invoiceNumber} created!` });
        
        // Reset POS Cart & Refresh Catalog stock levels
        this.clearCart();
        if (this.businessType === 'REPAIR_CENTER') {
          this.loadCatalog();
        }
      },
      error: (err) => {
        this.checkingOut = false;
        const msg = err.error?.message || 'Failed to complete checkout.';
        this.messageService.add({ severity: 'error', summary: 'Checkout Error', detail: msg });
      }
    });
  }

  // ─── PRINTING RECEIPT ───────────────────────────────────
  printInvoice(): void {
    if (!this.currentInvoice) return;

    const inv = this.currentInvoice;
    const printDate = new Date().toLocaleString('en-GB');

    let html = '';

    if (this.businessType === 'RESTAURANT') {
      const itemsRows = (inv.items || []).map(item => `
        <tr>
          <td class="r-item-name">${item.partName}</td>
          <td style="text-align: center">${item.quantity}</td>
          <td style="text-align: right">${(item.unitPrice || 0).toFixed(2)}</td>
          <td style="text-align: right">${(item.totalPrice || 0).toFixed(2)}</td>
        </tr>
      `).join('');

      html = `
<!DOCTYPE html>
<html>
<head>
  <title>Receipt - ${inv.invoiceNumber}</title>
  <style>
    @media print {
      @page { margin: 0; size: 80mm auto; }
      body { margin: 0; padding: 10px; font-family: 'Courier New', monospace; font-size: 12px; }
    }
    body { font-family: 'Inter', sans-serif; font-size: 13px; color: #1e293b; max-width: 400px; margin: 0 auto; padding: 20px; }
    .r-header { text-align: center; border-bottom: 1px dashed #94a3b8; padding-bottom: 10px; margin-bottom: 12px; }
    .r-title { font-size: 18px; font-weight: 800; color: #0f172a; }
    .r-subtitle { font-size: 11px; color: #64748b; }
    .r-meta { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 8px; }
    .r-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 12px; }
    .r-table th { border-bottom: 1px solid #0f172a; padding: 4px 0; text-transform: uppercase; font-size: 10px; }
    .r-table td { padding: 6px 0; border-bottom: 1px dashed #e2e8f0; }
    .r-totals { border-top: 1px solid #0f172a; padding-top: 8px; margin-top: 8px; }
    .r-total-row { display: flex; justify-content: space-between; padding: 2px 0; }
    .r-grand { font-weight: 800; font-size: 15px; border-top: 1px dashed #0f172a; padding-top: 6px; margin-top: 4px; }
    .r-footer { text-align: center; font-size: 11px; color: #64748b; margin-top: 16px; border-top: 1px dashed #94a3b8; padding-top: 10px; }
  </style>
</head>
<body>
  <div class="r-header">
    <div class="r-title">${this.tenantInfo?.shopName || 'Restaurant POS'}</div>
    <div class="r-subtitle">${this.tenantInfo?.shopAddress || ''}</div>
    <div class="r-subtitle">Tel: ${this.tenantInfo?.shopPhone || ''}</div>
  </div>
  <div class="r-meta">
    <div>Order / Inv: <strong>${inv.invoiceNumber}</strong></div>
    <div>Date: ${new Date(inv.createdAt).toLocaleDateString('en-GB')}</div>
  </div>
  <div class="r-meta">
    <div>Customer: <strong>${inv.customerName}</strong></div>
    <div>Pay: <strong>${inv.paymentMethod}</strong></div>
  </div>
  <table class="r-table">
    <thead>
      <tr>
        <th style="text-align: left">Item</th>
        <th style="text-align: center">Qty</th>
        <th style="text-align: right">Price</th>
        <th style="text-align: right">Total</th>
      </tr>
    </thead>
    <tbody>${itemsRows}</tbody>
  </table>
  <div class="r-totals">
    <div class="r-total-row"><span>Subtotal:</span><span>Rs. ${(inv.subtotal || 0).toFixed(2)}</span></div>
    ${inv.discount ? `<div class="r-total-row"><span>Discount:</span><span>- Rs. ${inv.discount.toFixed(2)}</span></div>` : ''}
    <div class="r-total-row r-grand"><span>TOTAL:</span><span>Rs. ${(inv.netTotal || 0).toFixed(2)}</span></div>
  </div>
  <div class="r-footer">
    <p>Thank you for dining with us!</p>
    <p>Printed: ${printDate}</p>
  </div>
  <script>window.onload = function() { window.focus(); window.print(); window.onafterprint = function() { window.close(); }; };</script>
</body>
</html>`;
    } else {
      const itemsRows = (inv.items || []).map(item => `
        <tr>
          <td>${item.partName}</td>
          <td style="text-align: center">${item.quantity}</td>
          <td style="text-align: right">${(item.unitPrice || 0).toFixed(2)}</td>
          <td style="text-align: right">${(item.totalPrice || 0).toFixed(2)}</td>
        </tr>
      `).join('');

      html = `
<!DOCTYPE html>
<html>
<head>
  <title>Invoice #${inv.invoiceNumber}</title>
  <style>
    body { font-family: 'Inter', sans-serif; font-size: 13px; color: #1e293b; max-width: 800px; margin: 0 auto; padding: 32px 40px; }
    .bill-header { display: flex; justify-content: space-between; border-bottom: 2.5px solid #2563eb; padding-bottom: 16px; margin-bottom: 20px; }
    .bill-company { font-size: 22px; font-weight: 800; color: #2563eb; }
    .bill-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 32px; background: #f8fafc; padding: 14px 16px; border-radius: 8px; margin-bottom: 22px; }
    .meta-row { display: flex; gap: 8px; font-size: 12px; margin-bottom: 3px; }
    .lbl { color: #64748b; font-weight: 600; min-width: 100px; }
    .val { color: #1e293b; font-weight: 600; }
    .bill-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
    .bill-table th { background: #2563eb; color: #fff; padding: 9px 12px; text-align: left; }
    .bill-table td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; }
    .totals { margin-left: auto; width: 320px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
    .total-row { display: flex; justify-content: space-between; padding: 8px 14px; font-size: 12px; }
    .total-row.grand { background: #2563eb; color: #fff; font-weight: 800; font-size: 14px; }
  </style>
</head>
<body>
  <div class="bill-header">
    <div>
      <div class="bill-company">Torque Auto Care</div>
      <div>${this.tenantInfo?.shopName || ''}</div>
    </div>
    <div style="text-align: right">
      <div style="font-weight: 800; color: #15803d; border: 2px solid #15803d; padding: 4px 10px; border-radius: 6px;">✓ PAID (${inv.paymentMethod})</div>
    </div>
  </div>
  <div class="bill-meta">
    <div>
      <div class="meta-row"><span class="lbl">Invoice No</span><span class="val">${inv.invoiceNumber}</span></div>
      <div class="meta-row"><span class="lbl">Customer</span><span class="val">${inv.customerName}</span></div>
    </div>
    <div>
      <div class="meta-row"><span class="lbl">Date</span><span class="val">${new Date(inv.createdAt).toLocaleString('en-GB')}</span></div>
      <div class="meta-row"><span class="lbl">Payment Method</span><span class="val">${inv.paymentMethod}</span></div>
    </div>
  </div>
  <table class="bill-table">
    <thead>
      <tr><th>Part / Item</th><th style="text-align: center">Qty</th><th style="text-align: right">Price</th><th style="text-align: right">Total</th></tr>
    </thead>
    <tbody>${itemsRows}</tbody>
  </table>
  <div class="totals">
    <div class="total-row"><span>Subtotal</span><span>Rs. ${(inv.subtotal || 0).toFixed(2)}</span></div>
    ${inv.discount ? `<div class="total-row"><span>Discount</span><span>- Rs. ${inv.discount.toFixed(2)}</span></div>` : ''}
    <div class="total-row grand"><span>NET TOTAL</span><span>Rs. ${(inv.netTotal || 0).toFixed(2)}</span></div>
  </div>
  <script>window.onload = function() { window.focus(); window.print(); window.onafterprint = function() { window.close(); }; };</script>
</body>
</html>`;
    }

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      alert('Pop-up blocked. Please allow pop-ups for this site to print the bill.');
      return;
    }
    printWindow.document.write(html);
    printWindow.document.close();
  }

  // ─── TABLES & LIVE SESSIONS ─────────────────────────────
  loadTables(): void {
    this.loadingTables = true;
    this.restaurantTableService.getAll().subscribe({
      next: (tables) => {
        this.tables = tables;
        this.tableSections = [...new Set(tables.map(t => t.section).filter(Boolean) as string[])];
        this.applyTableFilter();
        this.loadingTables = false;
      },
      error: () => {
        this.loadingTables = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load restaurant tables' });
      }
    });
  }

  applyTableFilter(): void {
    this.filteredTables = this.tables.filter(t => {
      const sectionMatch = !this.filterTableSection || t.section === this.filterTableSection;
      const statusMatch = !this.filterTableStatus || t.status === this.filterTableStatus;
      const searchMatch = !this.tableSearchQuery.trim() ||
        t.tableNumber.toLowerCase().includes(this.tableSearchQuery.toLowerCase()) ||
        (t.section || '').toLowerCase().includes(this.tableSearchQuery.toLowerCase());
      return sectionMatch && statusMatch && searchMatch;
    });
  }

  countTablesByStatus(status: string): number {
    return this.tables.filter(t => t.status === status).length;
  }

  getTableStatusStyle(status: TableStatus): { bg: string, color: string, border: string, icon: string } {
    switch (status) {
      case 'AVAILABLE':      return { bg: '#f0fdf4', color: '#166534', border: '#bbf7d0', icon: 'pi pi-check-circle' };
      case 'OCCUPIED':       return { bg: '#fef2f2', color: '#991b1b', border: '#fecaca', icon: 'pi pi-user' };
      case 'NEEDS_CLEANING': return { bg: '#fffbeb', color: '#92400e', border: '#fde68a', icon: 'pi pi-sync' };
      case 'RESERVED':       return { bg: '#eff6ff', color: '#1e40af', border: '#bfdbfe', icon: 'pi pi-bookmark' };
      case 'OUT_OF_SERVICE': return { bg: '#f8fafc', color: '#475569', border: '#cbd5e1', icon: 'pi pi-ban' };
      default:               return { bg: '#f8fafc', color: '#475569', border: '#cbd5e1', icon: 'pi pi-info-circle' };
    }
  }

  getTableStatusLabel(status: TableStatus): string {
    switch (status) {
      case 'AVAILABLE':      return 'Available';
      case 'OCCUPIED':       return 'Occupied';
      case 'NEEDS_CLEANING': return 'Needs Cleaning';
      case 'RESERVED':       return 'Reserved';
      case 'OUT_OF_SERVICE': return 'Out of Service';
      default:               return status;
    }
  }

  openTableOrdersModal(table: RestaurantTableModel): void {
    this.selectedTableForOrders = table;
    this.loadingSessionOrders = true;
    this.showAddItemSection = false;
    this.tableOrderDraftItems = [];
    this.orderModalVisible = true;

    this.restaurantOrderService.getActiveSession(table.id).subscribe({
      next: (session) => {
        if (session) {
          this.activeSessionForTable = session;
          this.loadOrdersForSession(session.id);
        } else {
          // Open session automatically if table is available
          this.restaurantOrderService.openSession(table.id).subscribe({
            next: (newSession) => {
              this.activeSessionForTable = newSession;
              this.ordersForActiveSession = [];
              this.loadingSessionOrders = false;
              this.loadTables();
            },
            error: () => {
              this.loadingSessionOrders = false;
              this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Could not open session for table' });
            }
          });
        }
      },
      error: () => {
        this.loadingSessionOrders = false;
      }
    });
  }

  toggleAddItemsSection(): void {
    this.showAddItemSection = !this.showAddItemSection;
    if (this.showAddItemSection) {
      this.tableOrderSearchQuery = '';
      this.filteredTableMenu = this.restaurantItems;
      this.tableOrderDraftItems = [];
    }
  }

  onTableMenuSearch(): void {
    const q = (this.tableOrderSearchQuery || '').toLowerCase().trim();
    if (!q) {
      this.filteredTableMenu = this.restaurantItems;
    } else {
      this.filteredTableMenu = this.restaurantItems.filter(item =>
        item.name.toLowerCase().includes(q) || (item.categoryName && item.categoryName.toLowerCase().includes(q))
      );
    }
  }

  addFoodToDraft(foodItem: RestaurantMenuItemModel): void {
    const existing = this.tableOrderDraftItems.find(d => d.menuItem.id === foodItem.id);
    if (existing) {
      existing.quantity++;
    } else {
      this.tableOrderDraftItems.push({
        menuItem: foodItem,
        quantity: 1,
        notes: ''
      });
    }
    this.messageService.add({ severity: 'info', summary: 'Added to Order Draft', detail: foodItem.name });
  }

  incrementDraftQty(draft: any): void {
    draft.quantity++;
  }

  decrementDraftQty(draft: any): void {
    if (draft.quantity > 1) {
      draft.quantity--;
    } else {
      this.removeDraftItem(draft);
    }
  }

  removeDraftItem(draft: any): void {
    this.tableOrderDraftItems = this.tableOrderDraftItems.filter(d => d !== draft);
  }

  getDraftTotal(): number {
    return this.tableOrderDraftItems.reduce((sum, d) => sum + (d.menuItem.price * d.quantity), 0);
  }

  getTotalItemCount(): number {
    return this.ordersForActiveSession.reduce((sum, o) => sum + (o.items?.length || 0), 0);
  }

  getServedCount(): number {
    return this.ordersForActiveSession.reduce((sum, o) =>
      sum + (o.items?.filter((i: any) => i.status === 'SERVED').length || 0), 0);
  }

  getPendingCount(): number {
    return this.ordersForActiveSession.reduce((sum, o) =>
      sum + (o.items?.filter((i: any) => i.status !== 'SERVED' && i.status !== 'CANCELLED').length || 0), 0);
  }

  submitNewOrderRound(): void {
    if (!this.selectedTableForOrders) return;
    if (this.tableOrderDraftItems.length === 0) {
      this.messageService.add({ severity: 'warn', summary: 'No Items Selected', detail: 'Please select menu items to add to this order round.' });
      return;
    }

    this.submittingOrderRound = true;
    const items = this.tableOrderDraftItems.map(d => ({
      menuItemId: d.menuItem.id,
      quantity: d.quantity,
      notes: d.notes
    }));

    const req = {
      tableId: this.selectedTableForOrders.id,
      items: items,
      notes: ''
    };

    this.restaurantOrderService.createOrder(req, 'WAITER').subscribe({
      next: (order) => {
        this.submittingOrderRound = false;
        this.tableOrderDraftItems = [];
        this.showAddItemSection = false;
        this.messageService.add({ severity: 'success', summary: 'Order Placed', detail: `Order ${order.orderNumber} added to session!` });
        if (this.activeSessionForTable) {
          this.loadOrdersForSession(this.activeSessionForTable.id);
        }
        this.loadTables();
      },
      error: (err) => {
        this.submittingOrderRound = false;
        this.messageService.add({ severity: 'error', summary: 'Failed to Place Order', detail: err.error?.message || 'Could not add order round' });
      }
    });
  }

  loadOrdersForSession(sessionId: number): void {
    this.loadingSessionOrders = true;
    this.restaurantOrderService.getOrdersBySession(sessionId).subscribe({
      next: (orders) => {
        this.ordersForActiveSession = orders;
        this.loadingSessionOrders = false;
      },
      error: () => {
        this.loadingSessionOrders = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load session orders' });
      }
    });
  }

  updateItemStatus(item: RestaurantOrderItemModel, newStatus: OrderItemStatus): void {
    this.restaurantOrderService.updateItemStatus(item.id, newStatus).subscribe({
      next: () => {
        if (this.activeSessionForTable) {
          this.loadOrdersForSession(this.activeSessionForTable.id);
          this.loadTables();
        }
        this.messageService.add({ severity: 'info', summary: 'Item Status Updated', detail: `${item.itemName} marked as ${newStatus}` });
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to update item status' });
      }
    });
  }

  sendCartItemsToTableOrder(): void {
    if (!this.selectedTableForOrders) return;
    if (this.cart.length === 0) {
      this.messageService.add({ severity: 'warn', summary: 'Cart Empty', detail: 'Please add menu items to POS cart first.' });
      return;
    }

    const items = this.cart.map(c => ({
      menuItemId: c.part.id!,
      quantity: c.quantity,
      notes: ''
    }));

    const req = {
      tableId: this.selectedTableForOrders.id,
      items: items,
      notes: this.notes
    };

    this.restaurantOrderService.createOrder(req, 'WAITER').subscribe({
      next: (order) => {
        this.clearCart();
        this.messageService.add({ severity: 'success', summary: 'Order Placed', detail: `Order ${order.orderNumber} placed for table ${this.selectedTableForOrders?.tableNumber}` });
        this.openTableOrdersModal(this.selectedTableForOrders!);
        this.loadTables();
      },
      error: (err) => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.message || 'Failed to place order for table' });
      }
    });
  }

  openTableCheckoutModal(table: RestaurantTableModel): void {
    this.selectedTableForOrders = table;
    this.restaurantOrderService.getActiveSession(table.id).subscribe({
      next: (session) => {
        if (!session) {
          this.messageService.add({ severity: 'warn', summary: 'No Session', detail: 'This table has no open session to checkout.' });
          return;
        }
        this.activeSessionForTable = session;
        this.checkoutCustomerName = `Table ${table.tableNumber}`;
        this.checkoutCustomerPhone = '';
        this.checkoutPaymentMethod = 'CASH';
        this.checkoutDiscount = 0;
        this.checkoutTax = 0;
        this.checkoutPaidAmount = session.runningTotal;
        this.checkoutNotes = '';
        this.checkoutModalVisible = true;
      }
    });
  }

  confirmTableCheckout(): void {
    if (!this.activeSessionForTable) return;
    if (!this.checkoutCustomerName || !this.checkoutCustomerName.trim()) {
      this.messageService.add({ severity: 'error', summary: 'Customer Required', detail: 'Please enter customer name' });
      return;
    }

    this.processingCheckout = true;
    const req = {
      customerName: this.checkoutCustomerName.trim(),
      customerPhone: this.checkoutCustomerPhone,
      paymentMethod: this.checkoutPaymentMethod,
      discount: this.checkoutDiscount || 0,
      tax: this.checkoutTax || 0,
      paidAmount: this.checkoutPaidAmount || this.activeSessionForTable.runningTotal,
      notes: this.checkoutNotes
    };

    this.restaurantOrderService.checkoutSession(this.activeSessionForTable.id, req).subscribe({
      next: (sale) => {
        this.processingCheckout = false;
        this.checkoutModalVisible = false;
        this.orderModalVisible = false;
        this.currentInvoice = sale;
        this.invoiceModalVisible = true;
        this.messageService.add({ severity: 'success', summary: 'Checkout Completed', detail: `Invoice #${sale.invoiceNumber} created!` });
        this.loadTables();
      },
      error: (err) => {
        this.processingCheckout = false;
        this.messageService.add({ severity: 'error', summary: 'Checkout Failed', detail: err.error?.message || 'Failed to checkout table session' });
      }
    });
  }

  markTableAvailable(table: RestaurantTableModel): void {
    this.restaurantTableService.updateStatus(table.id, 'AVAILABLE').subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Table Ready', detail: `Table ${table.tableNumber} is now available.` });
        this.loadTables();
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to update table status' });
      }
    });
  }

  // ─── SALES HISTORY TAB ──────────────────────────────────
  switchTab(tab: 'pos' | 'tables' | 'history'): void {
    this.activeTab = tab;
    if (tab === 'history') {
      this.loadSalesHistory();
    } else if (tab === 'tables') {
      this.loadTables();
    }
  }

  loadSalesHistory(): void {
    this.loadingHistory = true;
    let startDate: string | undefined;
    let endDate: string | undefined;

    if (this.historyDateRange && this.historyDateRange.length > 0) {
      if (this.historyDateRange[0]) {
        const d1 = this.historyDateRange[0];
        startDate = `${d1.getFullYear()}-${String(d1.getMonth() + 1).padStart(2, '0')}-${String(d1.getDate()).padStart(2, '0')}`;
      }
      if (this.historyDateRange[1]) {
        const d2 = this.historyDateRange[1];
        endDate = `${d2.getFullYear()}-${String(d2.getMonth() + 1).padStart(2, '0')}-${String(d2.getDate()).padStart(2, '0')}`;
      }
    }

    const dto = {
      first: this.historyFirst,
      rows: this.historyRows,
      globalFilter: this.historySearch,
      startDate: startDate,
      endDate: endDate,
      invoiceNumber: this.historyFilters.invoiceNumber,
      customerName: this.historyFilters.customerName,
      paymentMethod: this.historyFilters.paymentMethod,
      sortField: 'createdAt',
      sortOrder: -1
    };

    this.saleService.search(dto).subscribe({
      next: (res) => {
        this.salesHistory = res.data || [];
        this.historyTotalRecords = res.totalRecords || 0;
        this.historyTotalRevenue = res.totalRevenue || 0;
        this.loadingHistory = false;
      },
      error: () => {
        this.loadingHistory = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load sales history' });
      }
    });
  }

  onHistoryPageChange(event: any): void {
    this.historyFirst = event.first;
    this.historyRows = event.rows;
    this.loadSalesHistory();
  }

  viewInvoice(sale: SaleDto): void {
    this.currentInvoice = sale;
    this.invoiceModalVisible = true;
  }

  getPartImageUrl(partId: number): string {
    return this.partService.getImageUrl(partId);
  }
}
