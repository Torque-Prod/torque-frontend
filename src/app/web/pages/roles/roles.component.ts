import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RoleService, Role, Privilege } from '../../../shared/services/role.service';
import { MessageService } from 'primeng/api';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { CheckboxModule } from 'primeng/checkbox';
import { ToastModule } from 'primeng/toast';
import { PickListModule } from 'primeng/picklist';

@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    TableModule, ButtonModule, InputTextModule,
    DialogModule, CheckboxModule, ToastModule, PickListModule
  ],
  providers: [MessageService],
  templateUrl: './roles.component.html',
  styleUrls: ['./roles.component.css']
})
export class RolesComponent implements OnInit {

  roles: Role[] = [];
  privileges: Privilege[] = [];
  loading = false;
  
  displayDialog = false;
  saving = false;

  selectedRole: Partial<Role> = {};
  selectedPrivilegeIds: number[] = [];

  constructor(
    private roleService: RoleService,
    private messageService: MessageService
  ) { }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.roleService.getAllRoles().subscribe({
      next: (data) => {
        this.roles = data;
        this.loading = false;
      },
      error: () => this.loading = false
    });

    this.roleService.getAllPrivileges().subscribe({
      next: (data) => this.privileges = data,
      error: (err) => console.error('Failed to load privileges', err)
    });
  }

  openNew(): void {
    this.selectedRole = { name: '', description: '' };
    this.selectedPrivilegeIds = [];
    this.displayDialog = true;
  }

  editRole(role: Role): void {
    this.selectedRole = { ...role };
    this.selectedPrivilegeIds = role.privileges ? role.privileges.map(p => p.id) : [];
    this.displayDialog = true;
  }

  saveRole(): void {
    if (!this.selectedRole.name) return;
    this.saving = true;

    if (this.selectedRole.id) {
      this.roleService.updateRolePrivileges(this.selectedRole.id, this.selectedPrivilegeIds).subscribe({
        next: () => this.onSaveSuccess('Role Privileges Updated'),
        error: (err) => this.onSaveError(err)
      });
    } else {
      const request = {
        name: this.selectedRole.name,
        description: this.selectedRole.description || '',
        privilegeIds: this.selectedPrivilegeIds
      };
      this.roleService.createRole(request).subscribe({
        next: () => this.onSaveSuccess('Role Created'),
        error: (err) => this.onSaveError(err)
      });
    }
  }

  deleteRole(role: Role): void {
    if (role.name === 'ADMIN') {
        this.messageService.add({ severity: 'warn', summary: 'Warning', detail: 'Cannot delete ADMIN role.' });
        return;
    }
    if (!confirm(`Are you sure you want to delete role "${role.name}"?`)) return;

    this.roleService.deleteRole(role.id).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'Role deleted successfully' });
        this.loadData();
      },
      error: (err) => this.onSaveError(err)
    });
  }

  togglePrivilege(privilegeId: number): void {
    const index = this.selectedPrivilegeIds.indexOf(privilegeId);
    if (index === -1) {
      this.selectedPrivilegeIds.push(privilegeId);
    } else {
      this.selectedPrivilegeIds.splice(index, 1);
    }
  }

  hasSelectedPrivilege(privilegeId: number): boolean {
    return this.selectedPrivilegeIds.includes(privilegeId);
  }

  private onSaveSuccess(msg: string): void {
    this.saving = false;
    this.displayDialog = false;
    this.messageService.add({ severity: 'success', summary: 'Success', detail: msg });
    this.loadData();
  }

  private onSaveError(err: any): void {
    this.saving = false;
    this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.message || 'Operation failed' });
  }
}
