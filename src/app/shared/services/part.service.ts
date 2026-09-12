import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';

export interface Part {
  id?: number;
  name: string;
  price: number;
  stockQuantity: number;
  category?: string;
  containerLocation?: string;
  hasImage?: boolean;
}

export interface PagedPartResponse {
  data: Part[];
  totalRecords: number;
}

export interface CsvRowError {
  rowNumber: number;
  rowData: string;
  reason: string;
}

export interface CsvImportResult {
  totalRows: number;
  importedCount: number;
  skippedCount: number;
  errors: CsvRowError[];
}

@Injectable({ providedIn: 'root' })
export class PartService {

  private readonly API = `${API_BASE_URL}/api/v1/parts`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Part[]> {
    return this.http.get<Part[]>(this.API);
  }

  searchPaged(payload: any): Observable<PagedPartResponse> {
    return this.http.post<PagedPartResponse>(`${this.API}/search`, payload);
  }

  getById(id: number): Observable<Part> {
    return this.http.get<Part>(`${this.API}/${id}`);
  }

  create(part: Part): Observable<Part> {
    return this.http.post<Part>(this.API, part);
  }

  update(id: number, part: Part): Observable<Part> {
    return this.http.put<Part>(`${this.API}/${id}`, part);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API}/${id}`);
  }

  uploadImage(id: number, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(`${this.API}/${id}/image`, formData);
  }

  getImageUrl(id: number): string {
    return `${this.API}/${id}/image`;
  }

  deleteImage(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API}/${id}/image`);
  }

  importCsv(file: File): Observable<CsvImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<CsvImportResult>(`${this.API}/import-csv`, formData);
  }
}
