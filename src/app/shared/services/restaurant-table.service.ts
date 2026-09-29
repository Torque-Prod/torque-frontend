import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';

export type TableStatus =
  | 'AVAILABLE'
  | 'OCCUPIED'
  | 'RESERVED'
  | 'NEEDS_CLEANING'
  | 'OUT_OF_SERVICE';

export interface RestaurantTableModel {
  id: number;
  tableNumber: string;
  capacity: number;
  section: string | null;
  qrToken: string;
  qrImageBase64: string;   // data:image/png;base64,... — use in <img src>
  status: TableStatus;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTableRequest {
  tableNumber: string;
  capacity: number;
  section?: string;
}

@Injectable({ providedIn: 'root' })
export class RestaurantTableService {
  private base = `${API_BASE_URL}/api/restaurant/tables`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<RestaurantTableModel[]> {
    return this.http.get<RestaurantTableModel[]>(this.base);
  }

  getById(id: number): Observable<RestaurantTableModel> {
    return this.http.get<RestaurantTableModel>(`${this.base}/${id}`);
  }

  create(request: CreateTableRequest): Observable<RestaurantTableModel> {
    return this.http.post<RestaurantTableModel>(this.base, request);
  }

  update(id: number, request: CreateTableRequest): Observable<RestaurantTableModel> {
    return this.http.put<RestaurantTableModel>(`${this.base}/${id}`, request);
  }

  regenerateQr(id: number): Observable<RestaurantTableModel> {
    return this.http.post<RestaurantTableModel>(`${this.base}/${id}/regenerate-qr`, {});
  }

  updateStatus(id: number, status: TableStatus): Observable<RestaurantTableModel> {
    return this.http.patch<RestaurantTableModel>(`${this.base}/${id}/status`, { status });
  }

  deactivate(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  // Public — no auth required
  getByToken(qrToken: string): Observable<RestaurantTableModel> {
    return this.http.get<RestaurantTableModel>(`${this.base}/public/by-token/${qrToken}`);
  }
}
