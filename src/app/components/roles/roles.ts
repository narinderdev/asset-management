import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { SpinnerComponent } from '../spinner/spinner';
import { Loader } from '../loader/loader';
import { RoleService, CreateRolePayload } from '../../services/role.service';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { Router } from '@angular/router';

interface PermissionRow {
  label: string;
  securityClass: string;
  permissions: {
    view?: string;
    create?: string;
    update?: string;
    delete?: string;
    export?: string;
    approve?: string;
  };
  isSubRow?: boolean;
}

@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SpinnerComponent, Loader],
  templateUrl: './roles.html',
  styleUrls: ['./roles.css']
})
export class RolesComponent implements OnInit {
  roles: any[] = [];
  isModalOpen = false;
  isLoading = false;
  isSaving = false;
  submitted = false;
  isEditMode = false;
  editingRoleId?: string | number;

  /** prevents empty message flash before API returns */
  hasLoaded = false;

  addRoleForm: FormGroup;
  permissionRows: PermissionRow[] = [];
  canCreateRoles = true;

  Math = Math;
  pagination = { pageSize: 10, currentPage: 0, totalPages: 0, totalItems: 0 };
  requiredViewCode = '';
  assignAllChecked = false;
  selectedSecurityClass = '';
  selectedModule = '';
  companyCode = '';

  constructor(
    private fb: FormBuilder,
    private roleService: RoleService,
    private cdr: ChangeDetectorRef,
    private toastr: ToastrService,
    private router: Router
  ) {
    this.addRoleForm = this.fb.group({
      name: [''],
      description: [''],
      permissions: [[]],
      technicianRole: [false]
    });
  }

  ngOnInit() {
    this.companyCode = this.getCompanyCode();
    this.fetchRoles();
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
    this.isEditMode = false;
    this.editingRoleId = undefined;
    this.addRoleForm.reset({
      name: '',
      description: '',
      permissions: [],
      technicianRole: false
    });
    this.assignAllChecked = false;
    this.initializeSecuritySelection();
    this.isModalOpen = true;
  }

  openCreateRolePage(): void {
    this.router.navigate(['/roles/create']);
  }

  openEdit(role: any) {
    const roleId = role?.id ?? role?.roleId ?? role?.role_id ?? role?.code ?? role?.name;
    if (!roleId) {
      this.toastr.warning('Role id missing');
      return;
    }
    this.isEditMode = true;
    this.editingRoleId = roleId;
    this.isModalOpen = true;
    this.isSaving = false;
    this.submitted = false;
    this.cdr.detectChanges();

    this.roleService.getRoleById(roleId).subscribe({
      next: res => {
        const data: any = res?.data || {};
        const permissionCodes: string[] = data.permissionCodes || data.permissions || [];
        this.addRoleForm.setValue({
          name: data.name || '',
          description: data.description || '',
          permissions: Array.isArray(permissionCodes) ? permissionCodes : [],
          technicianRole: !!data.technicianRole
        });
        this.assignAllChecked = this.isAllSelected();
        this.cdr.detectChanges();
      },
      error: () => {
        this.toastr.error('Unable to load role details');
        this.closeModal();
      }
    });
  }

  private fetchRoles() {
    this.isLoading = true;
    this.hasLoaded = false;

    this.roleService
      .getRoles()
      .subscribe({
        next: res => {
          const data: any = res?.data;
          const content = Array.isArray(data) ? data : data?.content;

          this.roles = Array.isArray(content) ? content : [];

          this.pagination.totalItems = this.roles.length;
          this.pagination.totalPages = this.roles.length
            ? Math.ceil(this.roles.length / this.pagination.pageSize)
            : 0;

          this.pagination.currentPage = this.pagination.totalItems
            ? Math.min(
                this.pagination.currentPage || 0,
                this.pagination.totalPages ? this.pagination.totalPages - 1 : 0
              )
            : 0;

          this.isLoading = false;
          this.hasLoaded = true;
          this.cdr.detectChanges();
        },
        error: () => {
          this.roles = [];
          this.pagination.totalItems = 0;
          this.pagination.totalPages = 0;
          this.pagination.currentPage = 0;
          this.isLoading = false;
          this.hasLoaded = true;
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
          const data = this.normalizePermissionsPayload(res);
          this.permissionRows = this.mapPermissionRows(data);

          // reset assign-all checkbox whenever permissions refreshed
          this.assignAllChecked = false;
          this.initializeSecuritySelection();

          this.cdr.detectChanges();
        },
        error: () => {
          this.permissionRows = [];
          this.cdr.detectChanges();
        }
      });
  }

  private normalizePermissionsPayload(response: any): any {
    let current: any = response;
    let depth = 0;

    while (current && depth < 5) {
      if (Array.isArray(current) || Array.isArray(current?.classes)) {
        return this.parseIfJsonString(current);
      }

      if (current?.data !== undefined) {
        current = current.data;
        depth += 1;
        continue;
      }

      break;
    }

    const parsed = this.parseIfJsonString(current);

    if (Array.isArray(parsed) || Array.isArray(parsed?.classes)) {
      return parsed;
    }

    const classes = this.findClassesArray(parsed);
    if (classes) {
      return { classes };
    }

    const modules = this.findModulesArray(parsed);
    if (modules) {
      return modules;
    }

    return parsed;
  }

  private parseIfJsonString(value: any): any {
    if (typeof value !== 'string') {
      return value;
    }

    const trimmed = value.trim();
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
      return value;
    }

    try {
      return JSON.parse(trimmed);
    } catch {
      return value;
    }
  }

  private findClassesArray(value: any, depth = 0): any[] | null {
    if (!value || depth > 6) {
      return null;
    }

    if (Array.isArray(value?.classes)) {
      return value.classes;
    }

    if (Array.isArray(value)) {
      return null;
    }

    for (const nested of Object.values(value)) {
      const candidate = this.parseIfJsonString(nested);
      if (Array.isArray((candidate as any)?.classes)) {
        return (candidate as any).classes;
      }
      const found = this.findClassesArray(candidate, depth + 1);
      if (found) {
        return found;
      }
    }

    return null;
  }

  private findModulesArray(value: any, depth = 0): any[] | null {
    if (!value || depth > 6) {
      return null;
    }

    if (Array.isArray(value)) {
      return value.some(item => item?.module || item?.permissions) ? value : null;
    }

    for (const nested of Object.values(value)) {
      const candidate = this.parseIfJsonString(nested);
      const found = this.findModulesArray(candidate, depth + 1);
      if (found) {
        return found;
      }
    }

    return null;
  }

  private mapPermissionRows(data: any): PermissionRow[] {
    if (data && Array.isArray(data.classes)) {
      return data.classes.flatMap((securityClass: any) => {
        const objects = Array.isArray(securityClass?.objects) ? securityClass.objects : [];
        return objects.map((objectItem: any) => ({
          label: objectItem?.name || 'Object',
          securityClass: securityClass?.name || 'Security Class',
          permissions: this.mapActions(objectItem?.permissions || [], objectItem?.name)
        }));
      });
    }

    const modules = Array.isArray(data) ? data : [];
    return modules.map((mod: any) => {
      const moduleName = mod?.module || 'Module';
      return {
        label: moduleName,
        securityClass: this.resolveSecurityClass(moduleName),
        permissions: this.mapActions(mod?.permissions || [], moduleName)
      };
    });
  }

  private mapActions(perms: any[], moduleName?: string): {
    view?: string;
    create?: string;
    update?: string;
    delete?: string;
    export?: string;
    approve?: string;
  } {
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
      } else if (action === 'EXPORT') {
        out.export = p.code;
      } else if (action === 'APPROVE') {
        out.approve = p.code;
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
      permissionCodes: Array.isArray(formValue.permissions) ? formValue.permissions : [],
      technicianRole: !!formValue.technicianRole
    };

    this.isSaving = true;

    const request$ = this.isEditMode && this.editingRoleId
      ? this.roleService.updateRole(this.editingRoleId, payload)
      : this.roleService.createRoles(payload);

    request$
      .pipe(
        finalize(() => {
          this.isSaving = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: res => {
          this.toastr.success(res?.message || (this.isEditMode ? 'Role updated successfully' : 'Role created successfully'));
          this.isModalOpen = false;
          this.fetchRoles();
          this.cdr.detectChanges();
        },
        error: err => {
          const msg = err?.error?.message || err?.message || 'Failed to save role';
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

  onPermissionToggle(
    row: PermissionRow,
    action: 'view' | 'create' | 'update' | 'delete' | 'export' | 'approve'
  ) {
    const code = row.permissions[action];
    if (!code) return;

    const control = this.addRoleForm.get('permissions');
    const current = Array.isArray(control?.value) ? control?.value : [];

    if (current.includes(code)) {
      if (action === 'view' && code === this.requiredViewCode) {
        return;
      }

      const updated = current.filter((c: string) => c !== code);

      if (action === 'view') {
        const deps = [
          row.permissions.create,
          row.permissions.update,
          row.permissions.delete,
          row.permissions.export,
          row.permissions.approve
        ].filter(Boolean);
        control?.setValue(updated.filter(val => !deps.includes(val)));
      } else {
        control?.setValue(updated);
      }
    } else {
      const updated = [...current, code];

      if (action !== 'view' && row.permissions.view && !updated.includes(row.permissions.view)) {
        updated.push(row.permissions.view);
      }

      control?.setValue(updated);
    }

    // keep assign-all checkbox in sync
    this.assignAllChecked = this.isAllSelected();
  }

  isViewDisabled(row: PermissionRow): boolean {
    if (!!this.requiredViewCode && row.permissions.view === this.requiredViewCode) {
      return true;
    }

    const control = this.addRoleForm.get('permissions');
    const current = Array.isArray(control?.value) ? control?.value : [];
    const deps = [
      row.permissions.create,
      row.permissions.update,
      row.permissions.delete,
      row.permissions.export,
      row.permissions.approve
    ].filter(Boolean);

    return !!row.permissions.view && deps.some(code => current.includes(code as string));
  }

  viewRole(role: any) {
    const roleId = role?.id ?? role?.roleId ?? role?.role_id ?? role?.code ?? role?.name;
    if (!roleId) {
      this.toastr.warning('Role id missing');
      return;
    }
    this.router.navigate(['/roles/view', roleId]);
  }

  editRole(role: any) {
    this.router.navigate(['/roles/create']);
  }

  /** keeps table rows stable */
  trackByRole(_: number, role: any): any {
    return role?.id ?? role?.code ?? role?.name;
  }

  get pagedRoles(): any[] {
    const start = this.pagination.currentPage * this.pagination.pageSize;
    return this.roles.slice(start, start + this.pagination.pageSize);
  }

  get displayStart(): number {
    if (!this.pagination.totalItems) {
      return 0;
    }
    return this.pagination.currentPage * this.pagination.pageSize + 1;
  }

  get displayEnd(): number {
    if (!this.pagination.totalItems) {
      return 0;
    }
    const end = (this.pagination.currentPage + 1) * this.pagination.pageSize;
    return Math.min(end, this.pagination.totalItems);
  }

  previousPage(): void {
    if (this.pagination.currentPage > 0 && !this.isLoading) {
      this.pagination.currentPage -= 1;
      this.cdr.detectChanges();
    }
  }

  nextPage(): void {
    if (this.pagination.currentPage < this.totalPages - 1 && !this.isLoading) {
      this.pagination.currentPage += 1;
      this.cdr.detectChanges();
    }
  }

  get totalPages(): number {
    return Math.max(1, this.pagination.totalPages || 0);
  }

  onToggleAssignAll(checked: boolean): void {
    this.assignAllChecked = checked;
    const control = this.addRoleForm.get('permissions');
    if (!control) {
      return;
    }

    if (checked) {
      control.setValue(this.getAllPermissionCodes());
    } else {
      control.setValue([]);
    }
  }

  private getAllPermissionCodes(): string[] {
    const codes: string[] = [];
    this.permissionRows.forEach(row => {
      Object.values(row.permissions)
        .filter(Boolean)
        .forEach(code => {
          if (!codes.includes(code as string)) {
            codes.push(code as string);
          }
        });
    });
    return codes;
  }

  private isAllSelected(): boolean {
    const selected = this.addRoleForm.get('permissions')?.value;
    if (!Array.isArray(selected) || !selected.length) {
      return false;
    }
    const all = this.getAllPermissionCodes();
    return all.every(code => selected.includes(code));
  }

  onSecurityClassSelect(securityClass: string): void {
    this.selectedSecurityClass = securityClass;
    const firstRow = this.modulesForSelectedClass[0];
    this.selectedModule = firstRow ? firstRow.label : '';
  }

  onModuleSelect(module: string): void {
    this.selectedModule = module;
  }

  get securityClasses(): string[] {
    const classes: string[] = [];
    this.permissionRows.forEach(row => {
      if (row.securityClass && !classes.includes(row.securityClass)) {
        classes.push(row.securityClass);
      }
    });
    return classes;
  }

  get modulesForSelectedClass(): PermissionRow[] {
    return this.permissionRows.filter(row => row.securityClass === this.selectedSecurityClass);
  }

  get selectedRow(): PermissionRow | undefined {
    return this.modulesForSelectedClass.find(row => row.label === this.selectedModule);
  }

  get objectPermissionRows(): PermissionRow[] {
    return this.modulesForSelectedClass;
  }

  private initializeSecuritySelection(): void {
    const classes = this.securityClasses;
    if (!classes.length) {
      this.selectedSecurityClass = '';
      this.selectedModule = '';
      return;
    }

    if (!this.selectedSecurityClass || !classes.includes(this.selectedSecurityClass)) {
      this.selectedSecurityClass = classes[0];
    }

    const rows = this.modulesForSelectedClass;
    if (!rows.length) {
      this.selectedModule = '';
      return;
    }

    if (!this.selectedModule || !rows.some(row => row.label === this.selectedModule)) {
      this.selectedModule = rows[0].label;
    }
  }

  private resolveSecurityClass(moduleName: string): string {
    const normalized = String(moduleName || '')
      .trim()
      .toUpperCase();

    const inventoryModules = ['INVENTORY', 'WAREHOUSE', 'STOCK', 'GOODS_RECEIPT_NOTE', 'GRN'];
    const maintenanceModules = [
      'WORK_ORDER',
      'WORK_ORDER_TYPE',
      'PREVENTIVE_MAINTENANCE',
      'PREDICTIVE_MAINTENANCE',
      'SERVICE_REQUEST',
      'TECHNICIAN',
      'FAILURE_CODE',
      'MAINTENANCE'
    ];
    const securityAdminModules = ['MANAGE_ROLES', 'MANAGE_USERS', 'INVITE_USER', 'USERS', 'ROLES'];

    if (securityAdminModules.some(name => normalized.includes(name))) {
      return 'Security Administration';
    }
    if (inventoryModules.some(name => normalized.includes(name))) {
      return 'Inventory';
    }
    if (maintenanceModules.some(name => normalized.includes(name))) {
      return 'Maintenance';
    }
    return 'Asset Management';
  }

  private getCompanyCode(): string {
    if (typeof localStorage === 'undefined') {
      return '800';
    }
    const stored = localStorage.getItem('companyCode');
    return stored && stored.trim() ? stored.trim() : '800';
  }
}
