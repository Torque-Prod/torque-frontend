import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { TooltipModule } from 'primeng/tooltip';
import { UserManagementService, SystemUser, CreateUserRequest } from '../../../shared/services/user-management.service';
import { RoleService, Role } from '../../../shared/services/role.service';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule, ToastModule, DialogModule, ButtonModule, InputTextModule, DropdownModule, TooltipModule],
  providers: [MessageService],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.css']
})
export class UsersComponent implements OnInit {
  users: SystemUser[] = [];
  filteredUsers: SystemUser[] = [];
  roles: Role[] = [];
  loading = false;
  saving = false;

  // Filter
  filterText = '';

  // Create / Edit dialog
  dialogVisible = false;
  editMode = false;
  selectedUserId: number | null = null;

  form: CreateUserRequest = { username: '', password: '', roleId: 0, branchLocation: '' };
  formError = '';

  // Reset password dialog
  resetDialogVisible = false;
  resetUserId: number | null = null;
  newPassword = '';
  confirmPassword = '';
  resetError = '';
  resetSaving = false;

  roleOptions: { label: string; value: number }[] = [];

  constructor(
    private userService: UserManagementService,
    private roleService: RoleService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.userService.getAllUsers().subscribe({
      next: (data) => {
        this.users = data;
        this.applyFilter();
        this.loading = false;
      },
      error: () => { this.loading = false; this.toast('error', 'Failed to load users.'); }
    });

    this.roleService.getAllRoles().subscribe({
      next: (roles) => {
        this.roles = roles;
        this.roleOptions = roles.map(r => ({ label: r.name, value: r.id }));
      }
    });
  }

  applyFilter(): void {
    const q = this.filterText.toLowerCase().trim();
    this.filteredUsers = !q ? [...this.users] : this.users.filter(u =>
      u.username.toLowerCase().includes(q) ||
      (u.roleName || '').toLowerCase().includes(q) ||
      (u.branchLocation || '').toLowerCase().includes(q)
    );
  }

  openCreate(): void {
    this.editMode = false;
    this.selectedUserId = null;
    this.form = { username: '', password: '', roleId: 0, branchLocation: '' };
    this.formError = '';
    this.dialogVisible = true;
  }

  openEdit(user: SystemUser): void {
    this.editMode = true;
    this.selectedUserId = user.id;
    this.form = { username: user.username, password: '', roleId: user.roleId, branchLocation: user.branchLocation };
    this.formError = '';
    this.dialogVisible = true;
  }

  saveUser(): void {
    if (!this.form.username?.trim()) { this.formError = 'Username is required.'; return; }
    if (!this.editMode && !this.form.password?.trim()) { this.formError = 'Password is required.'; return; }
    if (!this.form.roleId) { this.formError = 'Please select a role.'; return; }

    this.saving = true;
    this.formError = '';

    if (this.editMode && this.selectedUserId) {
      this.userService.updateUser(this.selectedUserId, { roleId: this.form.roleId, branchLocation: this.form.branchLocation }).subscribe({
        next: () => { this.saving = false; this.dialogVisible = false; this.loadData(); this.toast('success', 'User updated.'); },
        error: (err) => { this.saving = false; this.formError = err?.error?.message || 'Update failed.'; }
      });
    } else {
      this.userService.createUser(this.form).subscribe({
        next: () => { this.saving = false; this.dialogVisible = false; this.loadData(); this.toast('success', 'User created successfully.'); },
        error: (err) => { this.saving = false; this.formError = err?.error?.message || 'Create failed.'; }
      });
    }
  }

  openResetPassword(user: SystemUser): void {
    this.resetUserId = user.id;
    this.newPassword = '';
    this.confirmPassword = '';
    this.resetError = '';
    this.resetDialogVisible = true;
  }

  saveResetPassword(): void {
    if (!this.newPassword || this.newPassword.length < 6) { this.resetError = 'Password must be at least 6 characters.'; return; }
    if (this.newPassword !== this.confirmPassword) { this.resetError = 'Passwords do not match.'; return; }
    this.resetSaving = true;
    this.resetError = '';
    this.userService.resetPassword(this.resetUserId!, this.newPassword).subscribe({
      next: () => { this.resetSaving = false; this.resetDialogVisible = false; this.toast('success', 'Password reset successfully.'); },
      error: (err) => { this.resetSaving = false; this.resetError = err?.error?.message || 'Reset failed.'; }
    });
  }

  deleteUser(user: SystemUser): void {
    if (!confirm(`Delete user "${user.username}"? This cannot be undone.`)) return;
    this.userService.deleteUser(user.id).subscribe({
      next: () => { this.loadData(); this.toast('success', `User "${user.username}" deleted.`); },
      error: (err) => this.toast('error', err?.error?.message || 'Delete failed.')
    });
  }

  getRoleBadgeClass(roleName: string): string {
    if (roleName === 'ADMIN') return 'role-badge role-badge--admin';
    return 'role-badge';
  }

  getInitials(username: string): string {
    return username.substring(0, 2).toUpperCase();
  }

  private toast(severity: string, detail: string): void {
    this.messageService.add({ severity, summary: severity === 'success' ? 'Success' : 'Error', detail });
  }
}
