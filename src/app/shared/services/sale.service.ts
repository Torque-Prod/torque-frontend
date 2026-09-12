import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';

export interface SaleItemRequest {
  partId?: number | null;             // null for restaurant menu items
  itemType: 'PART' | 'MENU_ITEM';    // tells backend which lookup to use
  itemName?: string;                  // name snapshot for MENU_ITEM
  quantity: number;
  unitPrice?: number;
}

export interface CreateSaleRequest {
  customerId?: number | null;
  customerName: string;
  customerPhone?: string | null;
  paymentMethod: string;
  discount?: number;
  tax?: number;
  paidAmount?: number;
  notes?: string | null;
  items: SaleItemRequest[];
}

export interface SaleItemDto {
  id?: number;
  partId?: number | null;
  partName?: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
}

export interface SaleDto {
  id: number;
  invoiceNumber: string;
  customerId?: number | null;
  customerName: string;
  customerPhone?: string | null;
  paymentMethod: string;
  subtotal: number;
  discount: number;
  tax: number;
  netTotal: number;
  paidAmount: number;
  changeAmount: number;
  soldBy?: string;
  notes?: string;
  createdAt: string;
  items: SaleItemDto[];
}

export interface PagedSaleResponse {
  data: SaleDto[];
  totalRecords: number;
  totalRevenue: number;
}

@Injectable({
  providedIn: 'root'
})
export class SaleService {
  private apiUrl = `${API_BASE_URL}/api/v1/sales`;

  constructor(private http: HttpClient) {}

  checkout(request: CreateSaleRequest): Observable<SaleDto> {
    return this.http.post<SaleDto>(this.apiUrl, request);
  }

  getAll(): Observable<SaleDto[]> {
    return this.http.get<SaleDto[]>(this.apiUrl);
  }

  search(gridSearchDto: any): Observable<PagedSaleResponse> {
    return this.http.post<PagedSaleResponse>(`${this.apiUrl}/search`, gridSearchDto);
  }

  getById(id: number): Observable<SaleDto> {
    return this.http.get<SaleDto>(`${this.apiUrl}/${id}`);
  }

  getByInvoiceNumber(invoiceNumber: string): Observable<SaleDto> {
    return this.http.get<SaleDto>(`${this.apiUrl}/invoice/${invoiceNumber}`);
  }
}
