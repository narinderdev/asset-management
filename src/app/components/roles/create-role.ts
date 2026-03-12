import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { Router } from '@angular/router';
import { SpinnerComponent } from '../spinner/spinner';
import { Loader } from '../loader/loader';
import { RoleService, CreateRolePayload } from '../../services/role.service';

interface PermissionRow {
  label: string;
  securityClass: string;
  permissions: {
    view?: PermissionSelection;
    create?: PermissionSelection;
    update?: PermissionSelection;
    delete?: PermissionSelection;
    export?: PermissionSelection;
    approve?: PermissionSelection;
  };
}

interface PermissionSelection {
  token: string;
  code: string;
}

@Component({
  selector: 'app-create-role',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SpinnerComponent, Loader],
  templateUrl: './create-role.html',
  styleUrl: './create-role.css'
})
export class CreateRoleComponent implements OnInit {
  addRoleForm: FormGroup;
  permissionRows: PermissionRow[] = [];

  isLoading = false;
  isSaving = false;
  submitted = false;
  assignAllChecked = false;
  requiredViewToken = '';
  selectedSecurityClass = '';
  selectedModule = '';

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

  ngOnInit(): void {
    this.fetchPermissions();
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

  closePage(): void {
    this.router.navigate(['/roles-permissions']);
  }

  saveRole(): void {
    this.submitted = true;
    if (this.addRoleForm.invalid) {
      return;
    }

    const formValue = this.addRoleForm.value;
    const payload: CreateRolePayload = {
      name: formValue.name || '',
      description: formValue.description || '',
      permissionCodes: this.getSelectedPermissionCodes(),
      technicianRole: !!formValue.technicianRole
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
          this.closePage();
        },
        error: err => {
          const msg = err?.error?.message || err?.message || 'Failed to create role';
          this.toastr.error(msg);
        }
      });
  }

  getSelectedCount(): number {
    return this.getSelectedPermissionCodes().length;
  }

  isPermissionSelected(permission: PermissionSelection | undefined): boolean {
    if (!permission) return false;
    const val = this.addRoleForm.get('permissions')?.value;
    return Array.isArray(val) ? val.includes(permission.token) : false;
  }

  onPermissionToggle(
    row: PermissionRow,
    action: 'view' | 'create' | 'update' | 'delete' | 'export' | 'approve'
  ): void {
    const permission = row.permissions[action];
    if (!permission) return;

    const control = this.addRoleForm.get('permissions');
    const current = Array.isArray(control?.value) ? control.value : [];
    const token = permission.token;

    if (current.includes(token)) {
      if (action === 'view' && token === this.requiredViewToken) {
        return;
      }

      const updated = current.filter((c: string) => c !== token);
      if (action === 'view') {
        const deps = [
          row.permissions.create?.token,
          row.permissions.update?.token,
          row.permissions.delete?.token,
          row.permissions.export?.token,
          row.permissions.approve?.token
        ].filter((val): val is string => !!val);
        control?.setValue(updated.filter(val => !deps.includes(val)));
      } else {
        control?.setValue(updated);
      }
    } else {
      const updated = [...current, token];
      const viewToken = row.permissions.view?.token;
      if (action !== 'view' && viewToken && !updated.includes(viewToken)) {
        updated.push(viewToken);
      }
      control?.setValue(updated);
    }

    this.assignAllChecked = this.isAllSelected();
  }

  isViewDisabled(row: PermissionRow): boolean {
    if (!!this.requiredViewToken && row.permissions.view?.token === this.requiredViewToken) {
      return true;
    }

    const control = this.addRoleForm.get('permissions');
    const current = Array.isArray(control?.value) ? control.value : [];
    const deps = [
      row.permissions.create?.token,
      row.permissions.update?.token,
      row.permissions.delete?.token,
      row.permissions.export?.token,
      row.permissions.approve?.token
    ].filter((val): val is string => !!val);

    return !!row.permissions.view?.token && deps.some(code => current.includes(code));
  }

  onToggleAssignAll(checked: boolean): void {
    this.assignAllChecked = checked;
    const control = this.addRoleForm.get('permissions');
    if (!control) {
      return;
    }
    control.setValue(checked ? this.getAllPermissionTokens() : []);
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

  private fetchPermissions(): void {
    this.isLoading = true;
    this.roleService
      .getPermissions()
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: res => {
          const data = this.normalizePermissionsPayload(res);
          this.permissionRows = this.mapPermissionRows(data);
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
        const securityClassName = securityClass?.name || 'Security Class';
        const objects = Array.isArray(securityClass?.objects) ? securityClass.objects : [];
        return objects.map((objectItem: any) => ({
          label: objectItem?.name || 'Object',
          securityClass: securityClassName,
          permissions: this.mapActions(objectItem?.permissions || [], objectItem?.name, securityClassName)
        }));
      });
    }

    const modules = Array.isArray(data) ? data : [];
    return modules.map((mod: any) => {
      const moduleName = mod?.module || 'Module';
      return {
        label: moduleName,
        securityClass: this.resolveSecurityClass(moduleName),
        permissions: this.mapActions(mod?.permissions || [], moduleName, this.resolveSecurityClass(moduleName))
      };
    });
  }

  private mapActions(perms: any[], moduleName?: string, securityClass?: string): PermissionRow['permissions'] {
    const out: PermissionRow['permissions'] = {};

    perms.forEach(p => {
      const action = String(p?.action || '').toUpperCase();
      if (action === 'VIEW' || action === 'ACCESS') {
        out.view = this.toPermissionSelection(p, action, moduleName, securityClass);
      } else if (action === 'CREATE' || action === 'INVITE') {
        out.create = this.toPermissionSelection(p, action, moduleName, securityClass);
      } else if (action === 'UPDATE') {
        out.update = this.toPermissionSelection(p, action, moduleName, securityClass);
      } else if (action === 'DELETE') {
        out.delete = this.toPermissionSelection(p, action, moduleName, securityClass);
      } else if (action === 'EXPORT') {
        out.export = this.toPermissionSelection(p, action, moduleName, securityClass);
      } else if (action === 'APPROVE') {
        out.approve = this.toPermissionSelection(p, action, moduleName, securityClass);
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

  private toPermissionSelection(
    permission: any,
    action: string,
    moduleName?: string,
    securityClass?: string
  ): PermissionSelection {
    const code = String(permission?.code || '');
    const idPart = permission?.id !== undefined && permission?.id !== null ? String(permission.id) : 'no-id';
    const classPart = String(securityClass || 'class').trim().toLowerCase().replace(/\s+/g, '_');
    const modulePart = String(moduleName || 'module').trim().toLowerCase().replace(/\s+/g, '_');
    const fallback = `${classPart}:${modulePart}:${action.toLowerCase()}:${code || 'no-code'}`;
    const token = `${fallback}:${idPart}`;

    return { token, code };
  }

  private getAllPermissionTokens(): string[] {
    const tokens: string[] = [];
    this.permissionRows.forEach(row => {
      Object.values(row.permissions)
        .filter(Boolean)
        .forEach(permission => {
          const token = (permission as PermissionSelection).token;
          if (token && !tokens.includes(token)) {
            tokens.push(token);
          }
        });
    });
    return tokens;
  }

  private getSelectedPermissionCodes(): string[] {
    const selected = this.addRoleForm.get('permissions')?.value;
    const selectedTokens = Array.isArray(selected) ? selected : [];
    const tokenToCode = new Map<string, string>();

    this.permissionRows.forEach(row => {
      Object.values(row.permissions)
        .filter(Boolean)
        .forEach(permission => {
          const current = permission as PermissionSelection;
          tokenToCode.set(current.token, current.code);
        });
    });

    const codes: string[] = [];
    selectedTokens.forEach((token: string) => {
      const code = tokenToCode.get(token);
      if (code && !codes.includes(code)) {
        codes.push(code);
      }
    });

    return codes;
  }

  private isAllSelected(): boolean {
    const selected = this.addRoleForm.get('permissions')?.value;
    if (!Array.isArray(selected) || !selected.length) {
      return false;
    }
    const all = this.getAllPermissionTokens();
    return all.every(code => selected.includes(code));
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
}
