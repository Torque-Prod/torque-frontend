import {Injectable} from '@angular/core';
import {HttpClient, HttpParams} from '@angular/common/http';
import {Observable} from 'rxjs';
import { API_BASE_URL } from '../config/api.config';

export interface PagedRepairJobResponse {
    data: RepairJob[];
    totalRecords: number;
}

export type RepairJobStatus = string;

export interface UsedPart {
    id: number;
    partId: number;
    partName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
}

export interface RepairJob {
    id?: number;
    jobNumber?: string;
    customerId: number;
    customerName?: string;
    customerPhone?: string;
    technicianId?: number;
    technicianName?: string;
    itemName: string;
    modelNumber?: string;
    serialNumber?: string;
    problemDescription?: string;
    receivedDate: string;
    expectedDate?: string;
    status?: RepairJobStatus;
    createdAt?: string;

    // Billing fields
    serviceCharge?: number;
    partsTotal?: number;
    netTotal?: number;
    paid?: boolean;
    usedParts?: UsedPart[];
}

@Injectable({providedIn: 'root'})
export class RepairJobService {

    private readonly API = `${API_BASE_URL}/api/v1/repair-jobs`;

    constructor(private http: HttpClient) {
    }

    getAll(): Observable<RepairJob[]> {
        return this.http.get<RepairJob[]>(this.API);
    }

    getById(id: number): Observable<RepairJob> {
        return this.http.get<RepairJob>(`${this.API}/${id}`);
    }

    // search(keyword: string): Observable<RepairJob[]> {
    //   const params = new HttpParams().set('keyword', keyword);
    //   return this.http.get<RepairJob[]>(`${this.API}/search`, { params });
    // }

    getByStatus(status: RepairJobStatus): Observable<RepairJob[]> {
        const params = new HttpParams().set('status', status);
        return this.http.get<RepairJob[]>(`${this.API}/by-status`, {params});
    }

    create(job: RepairJob): Observable<RepairJob> {
        return this.http.post<RepairJob>(this.API, job);
    }

    updateStatus(id: number, status: RepairJobStatus, technicianId?: number): Observable<RepairJob> {
        return this.http.patch<RepairJob>(`${this.API}/${id}/status`, {status, technicianId});
    }

    assignTechnician(id: number, technicianId: number): Observable<RepairJob> {
        const params = new HttpParams().set('technicianId', technicianId);
        return this.http.patch<RepairJob>(`${this.API}/${id}/assign`, {}, {params});
    }

    // ─── BILLING & PARTS ────────────────────────────────────
    addPart(jobId: number, partId: number, quantity: number): Observable<RepairJob> {
        const params = new HttpParams().set('partId', partId).set('quantity', quantity);
        return this.http.post<RepairJob>(`${this.API}/${jobId}/parts`, {}, {params});
    }

    removePart(jobId: number, jobPartId: number): Observable<RepairJob> {
        return this.http.delete<RepairJob>(`${this.API}/${jobId}/parts/${jobPartId}`);
    }

    updateServiceCharge(jobId: number, amount: number): Observable<RepairJob> {
        const params = new HttpParams().set('amount', amount);
        return this.http.patch<RepairJob>(`${this.API}/${jobId}/service-charge`, {}, {params});
    }

    pay(jobId: number): Observable<RepairJob> {
        return this.http.patch<RepairJob>(`${this.API}/${jobId}/pay`, {});
    }

    searchJobs(payload: any): Observable<PagedRepairJobResponse> {
        return this.http.post<PagedRepairJobResponse>(`${this.API}/search`, payload);
    }

    exportJobs(payload: any): Observable<Blob> {
        return this.http.post(`${this.API}/export`, payload, {responseType: 'blob'});
    }
}
