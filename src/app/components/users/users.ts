import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Loader } from '../loader/loader';
import { finalize } from 'rxjs';
import { RoleService } from '../../services/role.service';
import { UserService, UserListItem } from '../../services/user.service';
import { ToastrService } from 'ngx-toastr';
import { PermissionService } from '../../services/permission.service';

interface UserRow {
  name: string;
  email: string;
  role: string;
  status: 'Active' | 'Inactive' | 'INVITED' | string;
}

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule, Loader],
  templateUrl: './users.html',
  styleUrls: ['./users.css']
})
export class UsersComponent {
  loadingRoles = false;
  loadingUsers = false;
  sendingInvite = false;
  users: UserRow[] = [];
  totalUsers = 0;
  currentPage = 0;
  itemsPerPage = 10;

  showInviteModal = false;
  inviteForm = {
    firstName: '',
    lastName: '',
    email: '',
    roleId: ''
  };

  roleOptions: { id: number; name: string }[] = [];
  canInviteUsers = false;

  constructor(
    private roleService: RoleService,
    private userService: UserService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
    private permissionService: PermissionService
  ) {}

  openInvite(): void {
    if (!this.canInviteUsers) {
      return;
    }
    if (!this.roleOptions.length) {
      this.fetchRoles();
    }
    this.showInviteModal = true;
  }

  ngOnInit() {
    this.canInviteUsers = this.permissionService.hasPermission('INVITE_USER', 'CREATE') ||
      this.permissionService.hasPermission('INVITE_USER', 'ACCESS') ||
      this.permissionService.hasPermission('MANAGE_USERS', 'INVITE');
    this.fetchUsers();
  }

  closeInvite(): void {
    this.showInviteModal = false;
    this.inviteForm = { firstName: '', lastName: '', email: '', roleId: '' };
  }

  sendInvite(): void {
    const { firstName, lastName, email, roleId } = this.inviteForm;
    if (!firstName || !lastName || !email || !roleId) {
      this.toastr.error('Please fill all fields and select a role.');
      return;
    }

    const payload = {
      firstName,
      lastName,
      email,
      roleIds: [Number(roleId)]
    };

    this.sendingInvite = true;
    this.userService
      .inviteUser(payload)
      .pipe(
        finalize(() => {
          this.sendingInvite = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: res => {
          const message = res?.message || 'Invite sent successfully';
          this.toastr.success(message);
          this.closeInvite();
        },
        error: err => {
          const message = err?.error?.message || 'Failed to send invite';
          this.toastr.error(message);
        }
      });
  }

  private fetchRoles(): void {
    this.loadingRoles = true;
    this.roleService
      .getRoles()
      .pipe(
        finalize(() => {
          this.loadingRoles = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: res => {
          const data: any = res?.data;
          const roles = Array.isArray(data) ? data : data?.content;
          this.roleOptions = Array.isArray(roles)
            ? roles
                .map((r: any) => ({
                  id: Number(r.id),
                  name: String(r.name ?? '').trim()
                }))
                .filter(r => !!r.id && !!r.name)
            : [];
          this.cdr.detectChanges();
        },
        error: () => {
          this.roleOptions = [];
          this.cdr.detectChanges();
        }
      });
  }

  private fetchUsers(): void {
    this.loadingUsers = true;
    this.userService.fetchUsers().subscribe({
      next: res => {
        const rawData: any = res?.data;
        const list: UserListItem[] | any[] = Array.isArray(rawData)
          ? rawData
          : Array.isArray(rawData?.users)
            ? rawData.users
            : Array.isArray(rawData?.content)
              ? rawData.content
              : [];
        this.users = list.map((u: UserListItem | any) => ({
          name: u?.name || 'N/A',
          email: u?.email || 'N/A',
          role: Array.isArray(u?.roles) && u.roles.length ? u.roles.join(', ') : 'N/A',
          status: this.formatStatus(u?.status)
        }));
        this.totalUsers = this.users.length;
        this.loadingUsers = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.users = [];
        this.totalUsers = 0;
        this.loadingUsers = false;
        this.cdr.detectChanges();
      }
    });
  }

  get pagedUsers(): UserRow[] {
    const start = this.currentPage * this.itemsPerPage;
    return this.users.slice(start, start + this.itemsPerPage);
  }

  previousPage(): void {
    if (this.currentPage > 0 && !this.loadingUsers) {
      this.currentPage -= 1;
      this.cdr.detectChanges();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1 && !this.loadingUsers) {
      this.currentPage += 1;
      this.cdr.detectChanges();
    }
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalUsers / this.itemsPerPage));
  }

  get displayStart(): number {
    if (!this.totalUsers) {
      return 0;
    }
    return this.currentPage * this.itemsPerPage + 1;
  }

  get displayEnd(): number {
    if (!this.totalUsers) {
      return 0;
    }
    return Math.min((this.currentPage + 1) * this.itemsPerPage, this.totalUsers);
  }

  private formatStatus(status?: string): string {
    const normalized = (status || '').toUpperCase();
    if (normalized === 'ACTIVE') {
      return 'Active';
    }
    if (normalized === 'INACTIVE') {
      return 'Inactive';
    }
    if (normalized === 'INVITED') {
      return 'Invited';
    }
    return status || 'Active';
  }
}
