import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { SpinnerComponent } from '../spinner/spinner';
import { RoleService } from '../../services/role.service';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { CreateRolePayload } from '../../services/role.service';

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
    private cdr: ChangeDetectorRef,
    private toastr: ToastrService
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
    if (this.addRoleForm.invalid) {
      return;
    }
    const formValue = this.addRoleForm.value;
    const payload: CreateRolePayload = {
      name: formValue.name || '',
      description: formValue.description || '',
      permissionCodes: Array.isArray(formValue.permissions) ? formValue.permissions : []
    };
    this.isSaving = true;
    this.roleService
      .createRoles(payload)
      .pipe(
        finalize(() => {
          this.isSaving = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: res => {
          this.toastr.success(res?.message || 'Role created successfully');
          this.isModalOpen = false;
          this.fetchRoles();
          this.cdr.detectChanges();
        },
        error: err => {
          const msg = err?.error?.message || err?.message || 'Failed to create role';
          this.toastr.error(msg);
        }
      });
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
      const updated = current.filter((c: string) => c !== code);
      // If removing view, also remove dependent actions
      if (action === 'view') {
        const deps = [row.permissions.create, row.permissions.update, row.permissions.delete].filter(Boolean);
        control?.setValue(updated.filter(val => !deps.includes(val)));
      } else {
        control?.setValue(updated);
      }
    } else {
      const updated = [...current];
      updated.push(code);
      if (action !== 'view' && row.permissions.view && !updated.includes(row.permissions.view)) {
        updated.push(row.permissions.view);
      }
      control?.setValue(updated);
    }
  }

  isViewDisabled(row: PermissionRow): boolean {
    if (!!this.requiredViewCode && row.permissions.view === this.requiredViewCode) {
      return true;
    }
    const control = this.addRoleForm.get('permissions');
    const current = Array.isArray(control?.value) ? control?.value : [];
    const deps = [row.permissions.create, row.permissions.update, row.permissions.delete].filter(Boolean);
    return !!row.permissions.view && deps.some(code => current.includes(code as string));
  }

  viewRole(_: any) {}
}
