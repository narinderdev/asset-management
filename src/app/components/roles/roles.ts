import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { SpinnerComponent } from '../spinner/spinner';
import { RoleService } from '../../services/role.service';
import { finalize } from 'rxjs';

interface PermissionRow {
  label: string;
  permissions: { view?: string; create?: string; update?: string; delete?: string };
  isSubRow?: boolean;
}

@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SpinnerComponent],
  templateUrl: './roles.html',
  styleUrls: ['./roles.css']
})
export class RolesComponent implements OnInit {
  roles: any[] = [];
  isModalOpen = false;
  isLoading = false;
  isSaving = false;
  submitted = false;
  addRoleForm: FormGroup;
  permissionRows: PermissionRow[] = [];
  canCreateRoles = true;
  Math = Math;
  pagination = { pageSize: 10, currentPage: 0, totalPages: 0, totalItems: 0 };
  requiredViewCode = '';

  constructor(
    private fb: FormBuilder,
    private roleService: RoleService,
    private cdr: ChangeDetectorRef
  ) {
    this.addRoleForm = this.fb.group({
      name: [''],
      description: [''],
      permissions: [[]]
    });
  }

  formatRoleId(id: any): string {
    if (!id && id !== 0) {
      return '—';
    }
    return `ROL-${id}`;
  }

  formatModuleLabel(raw: string | undefined): string {
    if (!raw) {
      return '';
    }
    return raw
      .toString()
      .replace(/_/g, ' ')
      .toLowerCase()
      .split(' ')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  openModal() {
    this.isModalOpen = true;
  }

  ngOnInit() {
    this.fetchRoles();
    this.fetchPermissions();
  }

  private fetchRoles() {
    this.isLoading = true;
    this.roleService
      .getRoles()
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: res => {
          const data: any = res?.data;
          const content = Array.isArray(data) ? data : data?.content;
          this.roles = Array.isArray(content) ? content : [];
          this.pagination.totalItems = this.roles.length;
          this.pagination.totalPages = this.roles.length
            ? Math.ceil(this.roles.length / this.pagination.pageSize)
            : 0;
          this.cdr.detectChanges();
        },
        error: () => {
          this.roles = [];
          this.pagination.totalItems = 0;
          this.pagination.totalPages = 0;
          this.cdr.detectChanges();
        }
      });
  }

  private fetchPermissions() {
    this.roleService
      .getPermissions()
      .pipe(
        finalize(() => {
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: res => {
          const data: any = Array.isArray(res) ? res : res?.data;
          const modules = Array.isArray(data) ? data : [];
          this.permissionRows = modules.map((mod: any) => ({
            label: mod.module || 'Module',
            permissions: this.mapActions(mod.permissions || [], mod.module)
          }));
          this.cdr.detectChanges();
        },
        error: () => {
          this.permissionRows = [];
          this.cdr.detectChanges();
        }
      });
  }

  private mapActions(perms: any[], moduleName?: string): { view?: string; create?: string; update?: string; delete?: string } {
    const out: any = {};
    perms.forEach(p => {
      const action = String(p?.action || '').toUpperCase();
      if (action === 'VIEW' || action === 'ACCESS') {
        out.view = p.code;
      } else if (action === 'CREATE' || action === 'INVITE') {
        out.create = p.code;
      } else if (action === 'UPDATE') {
        out.update = p.code;
      } else if (action === 'DELETE') {
        out.delete = p.code;
      }
    });
    const moduleUpper = (moduleName || '').toUpperCase();
    if (['INVITE_USER', 'MANAGE_ROLES', 'MANAGE_USERS'].includes(moduleUpper)) {
      if (out.view && !out.create) {
        out.create = out.view;
      }
    }
    return out;
  }

  closeModal() {
    this.isModalOpen = false;
  }

  saveRole() {
    this.submitted = true;
    this.isSaving = false;
  }

  getSelectedCount(): number {
    const val = this.addRoleForm.get('permissions')?.value;
    return Array.isArray(val) ? val.length : 0;
  }

  isPermissionSelected(code: string | undefined): boolean {
    if (!code) return false;
    const val = this.addRoleForm.get('permissions')?.value;
    return Array.isArray(val) ? val.includes(code) : false;
  }

  onPermissionToggle(row: PermissionRow, action: 'view' | 'create' | 'update' | 'delete') {
    const code = row.permissions[action];
    if (!code) return;
    const control = this.addRoleForm.get('permissions');
    const current = Array.isArray(control?.value) ? control?.value : [];
    if (current.includes(code)) {
      if (action === 'view' && code === this.requiredViewCode) {
        return;
      }
      control?.setValue(current.filter((c: string) => c !== code));
    } else {
      control?.setValue([...current, code]);
    }
  }

  isViewDisabled(row: PermissionRow): boolean {
    return !!this.requiredViewCode && row.permissions.view === this.requiredViewCode;
  }

  viewRole(_: any) {}
}
