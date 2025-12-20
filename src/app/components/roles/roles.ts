import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CreateRolePayload, Permission, PermissionModule, RoleService } from '../../services/role.service';
import { SpinnerComponent } from '../spinner/spinner';
import { Role } from '../../models/company-users.model';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SpinnerComponent],
  templateUrl: './roles.html',
  styleUrls: ['./roles.css'],
})
export class RolesComponent implements OnInit {
  roles: Role[] = [];
  permissionModules: PermissionModule[] = [];
  permissionMap: Record<string, Permission> = {};
  isLoading = false;
  isModalOpen = false;
  isSaving = false;
  submitted = false;
  addRoleForm!: FormGroup;
  activePermissionTab = 'dashboard';
  tabPermissions: Record<string, Permission[]> = {};

  permissionTabs: { key: string; label: string }[] = [];

  constructor(
    private fb: FormBuilder,
    private roleService: RoleService,
    private cdr: ChangeDetectorRef,
    private toastr: ToastrService
  ) {}

  ngOnInit() {
    this.addRoleForm = this.fb.group({
      name: ['', Validators.required],
      description: ['', Validators.required],
      permissions: [[]],
    });

    this.loadRoles();
  }

  loadRoles() {
    this.isLoading = true;

    this.roleService.getRoles().subscribe({
      next: (res) => {
        const payload = res?.data;
        const content = Array.isArray(payload)
          ? payload
          : (payload as any)?.content;
        this.roles = Array.isArray(content) ? content : [];
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load roles', err);
        this.roles = [];
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  loadPermissions() {
    if (this.permissionModules.length) return;

    this.roleService.getPermissions().subscribe({
      next: (res) => {
        const permissionData = Array.isArray(res) ? res : res?.data ?? [];
        this.permissionModules = permissionData || [];
        this.buildTabPermissions();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load permissions', err);
        this.permissionModules = [];
        this.cdr.detectChanges();
      },
    });
  }

  permissionLabel(perm: Permission | string) {
    if (typeof perm === 'string') {
      return this.permissionMap[perm]?.label || this.toTitleCase(perm);
    }
    return perm.label || this.toTitleCase(perm.code);
  }

  openModal() {
    this.addRoleForm.reset({
      name: '',
      description: '',
      permissions: [],
    });

    this.submitted = false;
    this.isModalOpen = true;
    const fallbackTab = this.permissionTabs.find((tab) => this.getPermissionsForTab(tab.key).length);
    this.activePermissionTab = fallbackTab?.key || this.permissionTabs[0]?.key || '';
    this.loadPermissions();
    this.cdr.detectChanges();
  }

  closeModal() {
    this.isModalOpen = false;
    this.cdr.detectChanges();
  }

  saveRole() {
    this.submitted = true;
    if (this.addRoleForm.invalid) return;

    this.isSaving = true;
    const formValue = this.addRoleForm.value;

    const payload: CreateRolePayload = {
      name: formValue.name,
      description: formValue.description,
      permissionCodes: formValue.permissions || [],
    };

    this.roleService.createRoles(payload).subscribe({
      next: (res) => {
        this.toastr.success(res?.message || 'Role created successfully');
        this.isSaving = false;
        this.isModalOpen = false;
        this.loadRoles();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to create role', err);
        this.toastr.error('Failed to create role');
        this.isSaving = false;
        this.cdr.detectChanges();
      },
    });
  }

  isPermissionSelected(id: string) {
    const selected = this.addRoleForm.get('permissions')?.value || [];
    return selected.includes(id);
  }

  togglePermissionSelection(id: string) {
    const control = this.addRoleForm.get('permissions');
    if (!control) return;

    const current = control.value || [];
    if (current.includes(id)) {
      control.setValue(current.filter((val: any) => val !== id));
    } else {
      control.setValue([...current, id]);
    }
  }

  selectedPermissionLabels(): string[] {
    const selected = this.addRoleForm.get('permissions')?.value || [];
    return selected.map((code: string) => this.permissionLabel(code));
  }

  getPermissionsForTab(tabKey: string): Permission[] {
    return this.tabPermissions[tabKey] || [];
  }

  setActiveTab(tabKey: string) {
    if (!this.tabPermissions[tabKey]) {
      return;
    }
    this.activePermissionTab = tabKey;
    this.cdr.detectChanges();
  }

  private buildTabPermissions() {
    this.permissionMap = {};
    this.tabPermissions = {};
    this.permissionTabs = this.permissionModules.map((mod) => ({
      key: this.normalizeKey(mod.module),
      label: this.toTitleCase(mod.module),
    }));

    this.permissionModules.forEach((mod) => {
      const key = this.normalizeKey(mod.module);
      const perms = mod.permissions || [];
      this.tabPermissions[key] = perms;
      perms.forEach((perm) => {
        this.permissionMap[perm.code] = perm;
      });
    });

    const hasCurrent = (this.tabPermissions[this.activePermissionTab] || []).length > 0;
    if (!hasCurrent) {
      const fallback = this.permissionTabs.find((tab) => (this.tabPermissions[tab.key] || []).length > 0);
      this.activePermissionTab = fallback?.key || this.permissionTabs[0]?.key || '';
    }
  }

  private normalizeKey(value: string): string {
    return value?.toLowerCase();
  }

  private toTitleCase(raw: string): string {
    if (!raw) return '';
    return raw
      .toLowerCase()
      .split(/[_\s]+/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }
}
