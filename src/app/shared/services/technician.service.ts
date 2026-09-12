import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import { API_BASE_URL } from '../config/api.config';

export interface Technician {
    id?: number;
    name: string;
    phone: string;
    status?: string;    // "Available" | "In Job"
    jobNumber?: string; // populated when status is "In Job"
}

export type RepairJobStatus = string;

export interface RepairJob {
    id?: number;
    jobNumber?: string;
    customerId: number;
    customerName?: string;
    customerPhone?: string;
    technicianId?: number;
    technicianName?: string;
    itemName: string;
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
}

export interface TechnicianDetails {
    id?: number;
    name: string;
    phone: string;
    repairJobs?: RepairJob[];
}

@Injectable({providedIn: 'root'})
export class TechnicianService {

    private readonly API = `${API_BASE_URL}/api/v1/technicians`;

    constructor(private http: HttpClient) {
    }

    getAll(): Observable<Technician[]> {
        return this.http.get<Technician[]>(this.API);
    }

    getAllTechniciansDetails(): Observable<TechnicianDetails[]> {
        return this.http.get<TechnicianDetails[]>(`${this.API}/get_technicians_details`);
    }

    create(tech: Technician): Observable<Technician> {
        return this.http.post<Technician>(this.API, tech);
    }

    update(id: number, tech: Technician): Observable<Technician> {
        return this.http.put<Technician>(`${this.API}/${id}`, tech);
    }

    delete(id: number): Observable<void> {
        return this.http.delete<void>(`${this.API}/${id}`);
    }
}
