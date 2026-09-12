import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../shared/services/auth.service';
import { RoleService, Role } from '../../../shared/services/role.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  username = '';
  password = '';
  roleId: number | null = null;
  roles: Role[] = [];
  branchLocation = '';
  loading = false;
  errorMessage = '';
  showPassword = false;

  constructor(
    private authService: AuthService, 
    private roleService: RoleService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.roleService.getAllRoles().subscribe({
      next: (data) => {
        this.roles = data;
        if (this.roles.length > 0) {
          this.roleId = this.roles[0].id;
        }
      },
      error: (err) => console.error('Failed to load roles', err)
    });
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  onRegister(): void {
    if (!this.username || !this.password || !this.roleId || !this.branchLocation) {
      this.errorMessage = 'Please fill out all fields.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.authService.register({
      username: this.username,
      password: this.password,
      roleId: this.roleId,
      branchLocation: this.branchLocation
    }).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/web/dashboard']);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err?.error?.message || 'Registration failed. Username may already exist.';
      }
    });
  }
}
