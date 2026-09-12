import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';

export interface JobStatusConfig {
  id?: number;
  statusKey: string;
  displayName: string;
  color: string;
  bg: string;
  border: string;
  icon: string;
  isDefault: boolean;
  isTerminal: boolean;
  sendSms: boolean;
  sortOrder: number;
}

@Injectable({
  providedIn: 'root'
})
export class StatusConfigService {
  private apiUrl = `${API_BASE_URL}/api/v1/settings/statuses`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<JobStatusConfig[]> {
    return this.http.get<JobStatusConfig[]>(this.apiUrl);
  }

  create(config: JobStatusConfig): Observable<JobStatusConfig> {
    return this.http.post<JobStatusConfig>(this.apiUrl, config);
  }

  update(id: number, config: JobStatusConfig): Observable<JobStatusConfig> {
    return this.http.put<JobStatusConfig>(`${this.apiUrl}/${id}`, config);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
