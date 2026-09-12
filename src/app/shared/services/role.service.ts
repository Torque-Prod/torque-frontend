import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';

export interface Privilege {
  id: number;
  name: string;
  description: string;
}

export interface Role {
  id: number;
  name: string;
  description: string;
  privileges: Privilege[];
}

export interface RoleRequest {
  name: string;
  description: string;
  privilegeIds: number[];
}

@Injectable({
  providedIn: 'root'
})
export class RoleService {
  private readonly API_URL = `${API_BASE_URL}/api/v1/roles`;

  constructor(private http: HttpClient) {}

  getAllRoles(): Observable<Role[]> {
    return this.http.get<Role[]>(this.API_URL);
  }

  getAllPrivileges(): Observable<Privilege[]> {
    return this.http.get<Privilege[]>(`${this.API_URL}/privileges`);
  }

  createRole(request: RoleRequest): Observable<Role> {
    return this.http.post<Role>(this.API_URL, request);
  }

  updateRolePrivileges(id: number, privilegeIds: number[]): Observable<Role> {
    return this.http.put<Role>(`${this.API_URL}/${id}/privileges`, privilegeIds);
  }

  deleteRole(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${id}`);
  }
}
