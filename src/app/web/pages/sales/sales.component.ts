import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { TooltipModule } from 'primeng/tooltip';
import { PaginatorModule } from 'primeng/paginator';
import { CalendarModule } from 'primeng/calendar';

import { PartService, Part } from '../../../shared/services/part.service';
import { CustomerService, Customer } from '../../../shared/services/customer.service';
import { SaleService, SaleDto, CreateSaleRequest } from '../../../shared/services/sale.service';
import { AuthService } from '../../../shared/services/auth.service';
import { BusinessTypeService, BusinessType, TenantInfo } from '../../../shared/services/business-type.service';
import { RestaurantMenuItemService, RestaurantMenuItemModel } from '../../../shared/services/restaurant-menu-item.service';

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
    CalendarModule
  ],
  providers: [MessageService],
  templateUrl: './sales.component.html',
  styleUrls: ['./sales.component.css']
})
export class SalesComponent implements OnInit {

  // Active View Tab: 'pos' or 'history'
  activeTab: 'pos' | 'history' = 'pos';

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

  constructor(
    private partService: PartService,
    private customerService: CustomerService,
    private saleService: SaleService,
    public authService: AuthService,
    private messageService: MessageService,
    private router: Router,
    private businessTypeService: BusinessTypeService,
    private restaurantMenuItemService: RestaurantMenuItemService
  ) {}

  ngOnInit(): void {
    this.businessTypeService.getTenantInfo().subscribe((info: TenantInfo) => {
      this.tenantInfo = info;
      this.businessType = info.type;
      if (info.type === 'RESTAURANT') {
        this.loadRestaurantCatalog();
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
    this.filteredRestaurantItems = q
      ? this.restaurantItems.filter(i => i.name.toLowerCase().includes(q) || (i.categoryName || '').toLowerCase().includes(q))
      : this.restaurantItems;
  }

  addRestaurantItemToCart(item: RestaurantMenuItemModel): void {
    // Check if already in cart — just increase quantity
    const existing = this.cart.find(i => i.part.id === item.id && i.itemType === 'MENU_ITEM');
    if (existing) {
      existing.quantity++;
      existing.totalPrice = existing.quantity * existing.unitPrice;
      this.calculateTotals();
      return;
    }
    // Add new restaurant cart line with MENU_ITEM type
    const partLike: Part = {
      id: item.id,
      name: item.name,
      price: item.price,
      stockQuantity: 99999, // no stock limit for food
      category: item.categoryName
    } as any;
    this.cart.push({
      part: partLike,
      quantity: 1,
      unitPrice: item.price,
      totalPrice: item.price,
      itemType: 'MENU_ITEM',
      itemName: item.name
    });
    this.calculateTotals();
  }

  // ─── 1. CATALOG METHODS (SERVER-SIDE PAGINATION) ───────────
  loadCatalog(): void {
    this.loadingCatalog = true;

    const payload = {
      first: this.catalogFirst,
      rows: this.catalogRows,
      sortField: 'name',
      sortOrder: 1,
      globalFilter: this.catalogSearch ? this.catalogSearch.trim() : null
    };

    this.partService.searchPaged(payload).subscribe({
      next: (res) => {
        this.catalogParts = res.data || [];
        this.catalogTotalRecords = res.totalRecords || 0;
        this.loadingCatalog = false;
      },
      error: () => {
        this.loadingCatalog = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load spare parts catalog' });
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

  // ─── 2. CART MANAGEMENT ───────────────────────────────────
  addToCart(part: Part): void {
    if (part.stockQuantity <= 0) {
      this.messageService.add({ severity: 'warn', summary: 'Out of Stock', detail: `${part.name} is currently out of stock!` });
      return;
    }

    const existing = this.cart.find(item => item.part.id === part.id && item.itemType === 'PART');
    if (existing) {
      if (existing.quantity + 1 > part.stockQuantity) {
        this.messageService.add({ severity: 'warn', summary: 'Stock Limit', detail: `Only ${part.stockQuantity} units in stock.` });
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
    if (item.quantity + 1 > item.part.stockQuantity) {
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
    if (newQty > item.part.stockQuantity) {
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
    this.cart = this.cart.filter(i => i.part.id !== item.part.id);
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

  // ─── 3. CUSTOMER SELECTION ────────────────────────────────
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

  // ─── 4. CHECKOUT & INVOICE ─────────────────────────────────
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
        this.loadCatalog();
      },
      error: (err) => {
        this.checkingOut = false;
        const msg = err.error?.message || 'Failed to complete checkout. Check stock levels.';
        this.messageService.add({ severity: 'error', summary: 'Checkout Error', detail: msg });
      }
    });
  }

  // ─── 5. PRINTING RECEIPT ───────────────────────────────────
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

      html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Receipt – ${inv.invoiceNumber}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Courier Prime', 'Courier New', Courier, monospace;
      font-size: 12px; color: #000; background: #fff;
      padding: 10px; width: 300px; margin: 0 auto;
    }
    .receipt-header { text-align: center; }
    .receipt-shop-name { margin: 0; font-size: 18px; font-weight: 700; }
    .receipt-sub { margin: 2px 0 0 0; font-size: 11px; }
    .receipt-info { margin: 2px 0 0 0; font-size: 11px; }
    .receipt-divider { border-bottom: 1px dashed #000; margin: 8px 0; }
    .meta-row { display: flex; justify-content: space-between; margin-bottom: 3px; }
    .receipt-table { width: 100%; border-collapse: collapse; margin: 6px 0; }
    .receipt-table th { border-bottom: 1px solid #000; padding: 4px 0; font-size: 11px; text-align: left; }
    .receipt-table td { padding: 4px 0; font-size: 11px; vertical-align: top; }
    .r-item-name { max-width: 140px; word-break: break-word; }
    .total-row { display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 12px; }
    .net-row { font-weight: 700; font-size: 14px; padding-top: 4px; border-top: 1px solid #000; border-bottom: 1px solid #000; margin: 4px 0; }
    .receipt-footer { text-align: center; margin-top: 12px; }
    .thank-you { font-weight: 700; margin: 0; }
    .terms { font-size: 10px; margin: 4px 0 0 0; }
  </style>
</head>
<body>
  <div class="receipt-header">
    <h2 class="receipt-shop-name">${this.tenantInfo?.shopName || 'Torque Auto Care'}</h2>
    ${this.tenantInfo?.shopAddress ? `<p class="receipt-sub">${this.tenantInfo.shopAddress.replace(/\\n/g, '<br>')}</p>` : ''}
    ${this.tenantInfo?.shopPhone ? `<p class="receipt-info">Tel: ${this.tenantInfo.shopPhone}</p>` : ''}
    <div class="receipt-divider"></div>
  </div>
  <div class="receipt-meta">
    <div class="meta-row"><span>Invoice No:</span><strong>${inv.invoiceNumber}</strong></div>
    <div class="meta-row"><span>Date:</span><span>${new Date(inv.createdAt).toLocaleString('en-GB')}</span></div>
    <div class="meta-row"><span>Customer:</span><span>${inv.customerName}</span></div>
    ${inv.soldBy ? `<div class="meta-row"><span>Cashier:</span><span>${inv.soldBy}</span></div>` : ''}
  </div>
  <div class="receipt-divider"></div>
  <table class="receipt-table">
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
  <div class="receipt-divider"></div>
  <div class="receipt-totals">
    <div class="total-row"><span>Subtotal:</span><span>Rs. ${(inv.subtotal || 0).toFixed(2)}</span></div>
    ${(inv.discount && inv.discount > 0) ? `<div class="total-row"><span>Discount:</span><span>- Rs. ${inv.discount.toFixed(2)}</span></div>` : ''}
    <div class="total-row net-row"><span>NET TOTAL:</span><span>Rs. ${(inv.netTotal || 0).toFixed(2)}</span></div>
    <div class="total-row"><span>Payment (${inv.paymentMethod}):</span><span>Rs. ${(inv.paidAmount || 0).toFixed(2)}</span></div>
    ${(inv.changeAmount && inv.changeAmount > 0) ? `<div class="total-row"><span>Change Given:</span><span>Rs. ${inv.changeAmount.toFixed(2)}</span></div>` : ''}
  </div>
  <div class="receipt-divider"></div>
  <div class="receipt-footer">
    <p class="thank-you">Thank you for your business!</p>
    <p class="terms">Goods once sold cannot be returned without receipt.</p>
  </div>
  <script>
    window.onload = function() { window.print(); window.onafterprint = function() { window.close(); }; }
  </script>
</body>
</html>`;

    } else {
      const itemsRows = (inv.items || []).map(item => `
        <tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-weight: 500;">${item.partName}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: center;">${item.quantity}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: right;">${(item.unitPrice || 0).toFixed(2)}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 600;">${(item.totalPrice || 0).toFixed(2)}</td>
        </tr>
      `).join('');

      html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Invoice – ${inv.invoiceNumber}</title>
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
    .lbl { color: #64748b; font-weight: 600; min-width: 100px; }
    .val { color: #1e293b; font-weight: 600; }

    /* ── Table ── */
    .bill-table {
      width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px;
    }
    .bill-table thead tr {
      background: #2563eb; color: #fff;
    }
    .bill-table th {
      padding: 9px 12px; font-weight: 700; text-align: left; font-size: 11px; letter-spacing: 0.05em; text-transform: uppercase;
    }
    
    /* ── Totals ── */
    .totals { margin-left: auto; width: 320px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; margin-bottom: 24px; }
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
        <div class="bill-company">Torque Auto Care</div>
        <div class="bill-tagline">Automotive Spare Parts & POS Sales</div>
      </div>
    </div>
    <div class="header-right">
      <div class="bill-paid-stamp">✓ PAID (${inv.paymentMethod})</div>
      <div class="bill-company-details">
        <strong>${this.tenantInfo?.shopName || 'Torque Auto Care'}</strong><br>
        ${this.tenantInfo?.shopAddress ? this.tenantInfo.shopAddress.replace(/\\n/g, '<br>') + '<br>' : ''}
        ${this.tenantInfo?.shopPhone ? 'Tel: ' + this.tenantInfo.shopPhone : ''}
      </div>   
    </div>
  </div>

  <div class="bill-meta">
    <div>
      <div class="meta-row"><span class="lbl">Invoice No</span><span class="val">${inv.invoiceNumber}</span></div>
      <div class="meta-row"><span class="lbl">Customer</span><span class="val">${inv.customerName}</span></div>
      ${inv.customerPhone ? `<div class="meta-row"><span class="lbl">Phone</span><span class="val">${inv.customerPhone}</span></div>` : ''}
      ${inv.soldBy ? `<div class="meta-row"><span class="lbl">Cashier</span><span class="val">${inv.soldBy}</span></div>` : ''}
    </div>
    <div>
      <div class="meta-row"><span class="lbl">Date</span><span class="val">${new Date(inv.createdAt).toLocaleString('en-GB')}</span></div>
      <div class="meta-row"><span class="lbl">Payment Method</span><span class="val">${inv.paymentMethod}</span></div>
      <div class="meta-row"><span class="lbl">Items Count</span><span class="val">${inv.items?.length || 0} item(s)</span></div>
    </div>
  </div>

  <table class="bill-table">
    <thead>
      <tr>
        <th style="text-align: left">Part / Item Name</th>
        <th style="text-align: center">Qty</th>
        <th style="text-align: right">Price (Rs.)</th>
        <th style="text-align: right">Total (Rs.)</th>
      </tr>
    </thead>
    <tbody>
      ${itemsRows}
    </tbody>
  </table>

  <div class="totals">
    <div class="total-row"><span>Subtotal</span><span>Rs. ${(inv.subtotal || 0).toFixed(2)}</span></div>
    ${(inv.discount && inv.discount > 0) ? `<div class="total-row"><span>Discount</span><span>- Rs. ${inv.discount.toFixed(2)}</span></div>` : ''}
    <div class="total-row grand"><span>NET TOTAL</span><span>Rs. ${(inv.netTotal || 0).toFixed(2)}</span></div>
    ${(inv.paymentMethod === 'CASH' && inv.paidAmount) ? `
    ` : ''}
  </div>

  <div class="bill-footer">
    <p>Thank you for choosing ${this.tenantInfo?.shopName || 'Torque Auto Care'}! Please keep this receipt for your records.</p>
    <p class="date">Printed: ${printDate}</p>
  </div>

  <script>
    window.onload = function() {
      window.focus();
      window.print();
      window.onafterprint = function() { window.close(); };
    };
  </script>
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

  // ─── 6. SALES HISTORY TAB ──────────────────────────────────
  switchTab(tab: 'pos' | 'history'): void {
    this.activeTab = tab;
    if (tab === 'history') {
      this.loadSalesHistory();
    }
  }

  loadSalesHistory(): void {
    this.loadingHistory = true;
    
    let startDate: string | undefined;
    let endDate: string | undefined;

    if (this.historyDateRange && this.historyDateRange.length > 0) {
      if (this.historyDateRange[0]) {
        // Format to YYYY-MM-DD
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
