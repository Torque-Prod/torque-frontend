import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';

export interface RestaurantCategory {
  id: number;
  name: string;
  displayOrder: number;
}

export interface RestaurantMenuItemModel {
  id: number;
  name: string;
  description: string;
  price: number;
  categoryId: number;
  categoryName: string;
  available: boolean;
  imageType: string;
  imageBase64: string;
}

@Injectable({
  providedIn: 'root'
})
export class RestaurantMenuItemService {
  private base = `${API_BASE_URL}/api/restaurant`;

  constructor(private http: HttpClient) {}

  getCategories(): Observable<RestaurantCategory[]> {
    return this.http.get<RestaurantCategory[]>(`${this.base}/categories`);
  }

  getAvailableItems(): Observable<RestaurantMenuItemModel[]> {
    return this.http.get<RestaurantMenuItemModel[]>(`${this.base}/menu-items/available`);
  }

  getAllItems(): Observable<RestaurantMenuItemModel[]> {
    return this.http.get<RestaurantMenuItemModel[]>(`${this.base}/menu-items`);
  }

  createItem(formData: FormData): Observable<RestaurantMenuItemModel> {
    return this.http.post<RestaurantMenuItemModel>(`${this.base}/menu-items`, formData);
  }

  updateItem(id: number, formData: FormData): Observable<RestaurantMenuItemModel> {
    return this.http.put<RestaurantMenuItemModel>(`${this.base}/menu-items/${id}`, formData);
  }

  deleteItem(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/menu-items/${id}`);
  }
}
