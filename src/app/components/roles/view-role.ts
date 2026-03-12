import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Loader } from '../loader/loader';
import {
  RoleService,
  PermissionModule,
  Permission,
  PermissionCatalog,
  PermissionClass
} from '../../services/role.service';
import { Role } from '../../models/company-users.model';

interface PermissionRowView {
  moduleLabel: string;
  view: boolean;
  create: boolean;
  update: boolean;
  delete: boolean;
}

@Component({
  selector: 'app-view-role',
  standalone: true,
  imports: [CommonModule, RouterModule, Loader],
  templateUrl: './view-role.html',
  styleUrls: ['./view-role.css']
})
export class ViewRoleComponent implements OnInit {
  role?: Role | null;
  permissionRows: PermissionRowView[] = [];
  accessibleTabs: string[] = [];
  isLoading = false;

  private selectedCodes: string[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private roleService: RoleService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.goBack();
      return;
    }
    this.loadData(id);
  }

  get totalPermissions(): number {
    return this.selectedCodes.length;
  }

  goBack(): void {
    this.router.navigate(['/roles-permissions']);
  }

  private loadData(id: string): void {
    this.isLoading = true;
    this.roleService.getRoleById(id).subscribe({
      next: res => {
        this.role = res?.data as Role;
        this.selectedCodes =
          (this.role?.permissionCodes as string[]) ||
          (this.role?.permissions as string[]) ||
          [];
        this.fetchPermissionCatalog();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.detectChanges();
        this.goBack();
      }
    });
  }

  private fetchPermissionCatalog(): void {
    this.roleService.getPermissions().subscribe({
      next: res => {
        const data: any = Array.isArray(res) ? res : res?.data;
        const modules = this.normalizeModules(data);
        this.permissionRows = modules.map(mod => this.mapModule(mod));
        this.accessibleTabs = modules
          .filter(mod => this.moduleHasView(mod.permissions))
          .map(mod => this.formatLabel(mod.module));
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.permissionRows = [];
        this.accessibleTabs = [];
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private normalizeModules(data: PermissionModule[] | PermissionCatalog | undefined): PermissionModule[] {
    if (Array.isArray(data)) {
      return data;
    }

    if (data && Array.isArray(data.classes)) {
      return data.classes.flatMap((securityClass: PermissionClass) => {
        const objects = Array.isArray(securityClass?.objects) ? securityClass.objects : [];
        return objects.map(objectItem => ({
          module: objectItem?.name || 'Object',
          permissions: objectItem?.permissions || []
        }));
      });
    }

    return [];
  }

  private mapModule(mod: PermissionModule): PermissionRowView {
    const flags = { view: false, create: false, update: false, delete: false };
    (mod.permissions || []).forEach((p: Permission) => {
      const code = p.code;
      const has = this.selectedCodes.includes(code);
      const action = (p.action || '').toUpperCase();
      if (action === 'VIEW' || action === 'ACCESS') flags.view = flags.view || has;
      if (action === 'CREATE' || action === 'INVITE') flags.create = flags.create || has;
      if (action === 'UPDATE') flags.update = flags.update || has;
      if (action === 'DELETE') flags.delete = flags.delete || has;
    });
    return {
      moduleLabel: this.formatLabel(mod.module),
      ...flags
    };
  }

  private moduleHasView(perms: Permission[]): boolean {
    return (perms || []).some(
      p =>
        this.selectedCodes.includes(p.code) &&
        ['VIEW', 'ACCESS'].includes((p.action || '').toUpperCase())
    );
  }

  private formatLabel(raw?: string): string {
    if (!raw) return '';
    return raw
      .replace(/_/g, ' ')
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}
