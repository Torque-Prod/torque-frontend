import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';

export interface MenuItem {
  id: number;
  label: string;
  icon: string;
  routerLink: string;
  requiredPrivilege: string;
  section: string;
  badgeType?: string;
  orderIndex: number;
}

@Injectable({
  providedIn: 'root'
})
export class MenuService {
  private apiUrl = `${API_BASE_URL}/api/menus`;

  constructor(private http: HttpClient) {}

  getMenus(): Observable<MenuItem[]> {
    return this.http.get<MenuItem[]>(this.apiUrl);
  }
}
