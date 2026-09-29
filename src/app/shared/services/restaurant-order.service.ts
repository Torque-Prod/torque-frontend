import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { SaleDto } from './sale.service';

export type TableSessionStatus = 'OPEN' | 'CLOSED';
export type OrderSource = 'CUSTOMER_QR' | 'WAITER' | 'POS_STAFF';
export type OrderStatus = 'PLACED' | 'CONFIRMED' | 'IN_PREPARATION' | 'READY' | 'SERVED' | 'CANCELLED';
export type OrderItemStatus = 'PENDING' | 'PREPARING' | 'READY' | 'SERVED' | 'CANCELLED';

export interface TableSessionModel {
  id: number;
  tableId: number;
  tableNumber: string;
  status: TableSessionStatus;
  openedAt: string;
  closedAt: string | null;
  closedBy: string | null;
  orderCount: number;
  runningTotal: number;
}

export interface RestaurantOrderItemModel {
  id: number;
  menuItemId: number;
  itemName: string;
  unitPrice: number;
  quantity: number;
  notes: string | null;
  status: OrderItemStatus;
  lineTotal: number;
}

export interface RestaurantOrderModel {
  id: number;
  sessionId: number;
  orderNumber: string;
  source: OrderSource;
  status: OrderStatus;
  notes: string | null;
  items: RestaurantOrderItemModel[];
  itemTotal: number;
  createdAt: string;
}

export interface OrderItemRequest {
  menuItemId: number;
  quantity: number;
  notes?: string;
}

export interface CreateOrderRequest {
  tableId: number;
  items: OrderItemRequest[];
  notes?: string;
}

export interface CheckoutRequest {
  customerName: string;
  customerPhone?: string;
  customerId?: number;
  paymentMethod?: string;
  paidAmount?: number;
  discount?: number;
  tax?: number;
  notes?: string;
}

@Injectable({ providedIn: 'root' })
export class RestaurantOrderService {
  private sessionBase = `${API_BASE_URL}/api/restaurant/table-sessions`;
  private orderBase = `${API_BASE_URL}/api/restaurant/orders`;

  constructor(private http: HttpClient) {}

  // Sessions
  getActiveSession(tableId: number): Observable<TableSessionModel | null> {
    return this.http.get<TableSessionModel | null>(`${this.sessionBase}/active/table/${tableId}`);
  }

  openSession(tableId: number): Observable<TableSessionModel> {
    return this.http.post<TableSessionModel>(`${this.sessionBase}/open/${tableId}`, {});
  }

  closeSession(sessionId: number): Observable<TableSessionModel> {
    return this.http.post<TableSessionModel>(`${this.sessionBase}/${sessionId}/close`, {});
  }

  // Orders
  createOrder(request: CreateOrderRequest, source: OrderSource = 'WAITER'): Observable<RestaurantOrderModel> {
    return this.http.post<RestaurantOrderModel>(`${this.orderBase}?source=${source}`, request);
  }

  getOrdersBySession(sessionId: number): Observable<RestaurantOrderModel[]> {
    return this.http.get<RestaurantOrderModel[]>(`${this.orderBase}/session/${sessionId}`);
  }

  updateItemStatus(itemId: number, status: OrderItemStatus): Observable<RestaurantOrderModel> {
    return this.http.put<RestaurantOrderModel>(`${this.orderBase}/items/${itemId}/status?status=${status}`, {});
  }

  updateOrderStatus(orderId: number, status: OrderStatus): Observable<RestaurantOrderModel> {
    return this.http.put<RestaurantOrderModel>(`${this.orderBase}/${orderId}/status?status=${status}`, {});
  }

  checkoutSession(sessionId: number, request: CheckoutRequest): Observable<SaleDto> {
    return this.http.post<SaleDto>(`${this.orderBase}/session/${sessionId}/checkout`, request);
  }
}
