import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, shareReplay, catchError } from 'rxjs/operators';
import { API_BASE_URL } from '../config/api.config';

export type BusinessType = 'REPAIR_CENTER' | 'RESTAURANT';

export interface TenantInfo {
  type: BusinessType;
  shopName?: string;
  shopAddress?: string;
  shopPhone?: string;
}

@Injectable({
  providedIn: 'root'
})
export class BusinessTypeService {
  private apiUrl = `${API_BASE_URL}/api/business-type`;
  
  // Cache the result for the duration of the session
  private tenantInfo$: Observable<TenantInfo> | null = null;

  constructor(private http: HttpClient) {}

  getTenantInfo(): Observable<TenantInfo> {
    if (!this.tenantInfo$) {
      this.tenantInfo$ = this.http.get<TenantInfo>(this.apiUrl).pipe(
        catchError(() => of({ type: 'REPAIR_CENTER' as BusinessType, shopName: 'Torque Auto Care' })),
        shareReplay(1)
      );
    }
    return this.tenantInfo$;
  }

  getBusinessType(): Observable<BusinessType> {
    return this.getTenantInfo().pipe(map(info => info.type));
  }

  isRestaurant(): Observable<boolean> {
    return this.getBusinessType().pipe(map(t => t === 'RESTAURANT'));
  }

  isRepairCenter(): Observable<boolean> {
    return this.getBusinessType().pipe(map(t => t === 'REPAIR_CENTER'));
  }
}
