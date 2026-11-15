import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';

export interface SystemUser {
  id: number;
  username: string;
  roleId: number;
  roleName: string;
  branchLocation: string;
  createdAt?: string;
  active?: boolean;
}

export interface CreateUserRequest {
  username: string;
  password: string;
  roleId: number;
  branchLocation: string;
}

export interface UpdateUserRequest {
  roleId: number;
  branchLocation: string;
}

export interface ResetPasswordRequest {
  newPassword: string;
}

@Injectable({ providedIn: 'root' })
export class UserManagementService {
  private readonly API_URL = `${API_BASE_URL}/api/v1/users`;

  constructor(private http: HttpClient) {}

  getAllUsers(): Observable<SystemUser[]> {
    return this.http.get<SystemUser[]>(this.API_URL);
  }

  createUser(request: CreateUserRequest): Observable<SystemUser> {
    return this.http.post<SystemUser>(this.API_URL, request);
  }

  updateUser(id: number, request: UpdateUserRequest): Observable<SystemUser> {
    return this.http.put<SystemUser>(`${this.API_URL}/${id}`, request);
  }

  resetPassword(id: number, newPassword: string): Observable<void> {
    return this.http.put<void>(`${this.API_URL}/${id}/reset-password`, { newPassword });
  }

  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${id}`);
  }
}
