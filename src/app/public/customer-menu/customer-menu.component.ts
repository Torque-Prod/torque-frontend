import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '../../shared/config/api.config';

interface MenuItem { id: number; name: string; description: string; price: number; category: string; imageUrl?: string; available: boolean; }
interface CartItem { menuItem: MenuItem; quantity: number; notes: string; }
interface TableInfo { id: number; tableNumber: string; capacity: number; }

@Component({
  selector: 'app-customer-menu',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './customer-menu.component.html',
  styleUrls: ['./customer-menu.component.css']
})
export class CustomerMenuComponent implements OnInit {
  private api = `${API_BASE_URL}/api`;

  // State
  token = '';
  table: TableInfo | null = null;
  menuItems: MenuItem[] = [];
  cart: CartItem[] = [];
  searchQuery = '';
  selectedCategory = 'All';
  categories: string[] = [];

  // View state
  loading = true;
  tableError = false;
  cartOpen = false;
  orderPlaced = false;
  orderNumber = '';
  placing = false;
  customerName = '';
  activeView: 'menu' | 'cart' = 'menu';

  constructor(private route: ActivatedRoute, private http: HttpClient) {}

  ngOnInit() {
    this.token = this.route.snapshot.paramMap.get('token') || '';
    this.loadTable();
  }

  loadTable() {
    this.http.get<TableInfo>(`${this.api}/restaurant/tables/public/by-token/${this.token}`)
      .subscribe({
        next: (table) => {
          this.table = table;
          this.loadMenu();
        },
        error: () => {
          this.tableError = true;
          this.loading = false;
        }
      });
  }

  loadMenu() {
    this.http.get<MenuItem[]>(`${this.api}/restaurant/menu-items/public/available`)
      .subscribe({
        next: (items) => {
          this.menuItems = items;
          const cats = [...new Set(items.map(i => i.category).filter(Boolean))];
          this.categories = ['All', ...cats];
          this.loading = false;
        },
        error: () => { this.loading = false; }
      });
  }

  get filteredItems(): MenuItem[] {
    return this.menuItems.filter(item => {
      const matchCat = this.selectedCategory === 'All' || item.category === this.selectedCategory;
      const matchSearch = !this.searchQuery || item.name.toLowerCase().includes(this.searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }

  get cartCount(): number { return this.cart.reduce((s, c) => s + c.quantity, 0); }
  get cartTotal(): number { return this.cart.reduce((s, c) => s + c.menuItem.price * c.quantity, 0); }

  getCartQty(item: MenuItem): number {
    return this.cart.find(c => c.menuItem.id === item.id)?.quantity || 0;
  }

  addToCart(item: MenuItem) {
    const existing = this.cart.find(c => c.menuItem.id === item.id);
    if (existing) { existing.quantity++; }
    else { this.cart.push({ menuItem: item, quantity: 1, notes: '' }); }
  }

  removeFromCart(item: MenuItem) {
    const existing = this.cart.find(c => c.menuItem.id === item.id);
    if (!existing) return;
    if (existing.quantity > 1) { existing.quantity--; }
    else { this.cart = this.cart.filter(c => c.menuItem.id !== item.id); }
  }

  clearCart() { this.cart = []; }

  placeOrder() {
    if (!this.table || this.cart.length === 0) return;
    this.placing = true;
    const body = {
      tableId: this.table.id,
      customerName: this.customerName || 'Guest',
      items: this.cart.map(c => ({
        menuItemId: c.menuItem.id,
        quantity: c.quantity,
        notes: c.notes
      }))
    };
    this.http.post<any>(`${this.api}/restaurant/orders/public/customer-order`, body)
      .subscribe({
        next: (order) => {
          this.orderNumber = order.orderNumber;
          this.orderPlaced = true;
          this.placing = false;
          this.cart = [];
          this.activeView = 'menu';
        },
        error: () => { this.placing = false; }
      });
  }
}
