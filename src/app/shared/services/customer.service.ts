import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';

export interface Customer {
  id?: number;
  name: string;
  phone: string;
  address: string;
  createdAt?: string;
}

export interface PagedCustomerResponse {
  data: Customer[];
  totalRecords: number;
}

@Injectable({ providedIn: 'root' })
export class CustomerService {

  private readonly API = `${API_BASE_URL}/api/v1/customers`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Customer[]> {
    return this.http.get<Customer[]>(this.API);
  }

  getById(id: number): Observable<Customer> {
    return this.http.get<Customer>(`${this.API}/${id}`);
  }

  search(keyword: string): Observable<Customer[]> {
    const params = new HttpParams().set('keyword', keyword);
    return this.http.get<Customer[]>(`${this.API}/search`, { params });
  }

  searchPaged(payload: any): Observable<PagedCustomerResponse> {
    return this.http.post<PagedCustomerResponse>(`${this.API}/search`, payload);
  }

  create(customer: Customer): Observable<Customer> {
    return this.http.post<Customer>(this.API, customer);
  }

  update(id: number, customer: Customer): Observable<Customer> {
    return this.http.put<Customer>(`${this.API}/${id}`, customer);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API}/${id}`);
  }
}
