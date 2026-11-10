import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SidebarService {
  private collapsedSubject = new BehaviorSubject<boolean>(
    typeof localStorage !== 'undefined' && localStorage.getItem('torque_sidebar_collapsed') === 'true'
  );

  collapsed$ = this.collapsedSubject.asObservable();

  get isCollapsed(): boolean {
    return this.collapsedSubject.value;
  }

  toggle(): void {
    const next = !this.collapsedSubject.value;
    this.collapsedSubject.next(next);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('torque_sidebar_collapsed', String(next));
    }
  }

  setCollapsed(collapsed: boolean): void {
    this.collapsedSubject.next(collapsed);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('torque_sidebar_collapsed', String(collapsed));
    }
  }
}
