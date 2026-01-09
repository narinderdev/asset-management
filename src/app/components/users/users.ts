import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { RoleService } from '../../services/role.service';
import { UserService } from '../../services/user.service';
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
  imports: [CommonModule, FormsModule],
  templateUrl: './users.html',
  styleUrls: ['./users.css']
})
export class UsersComponent {
  loadingRoles = false;
  loadingUsers = false;
  sendingInvite = false;
  users: UserRow[] = [];

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
    this.userService
      .fetchUsers()
      .pipe(
        finalize(() => {
          this.loadingUsers = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: res => {
          const list = Array.isArray(res?.data) ? res.data : [];
          this.users = list.map(u => ({
            name: u.name || '—',
            email: u.email || '—',
            role: Array.isArray(u.roles) && u.roles.length ? u.roles.join(', ') : '—',
            status: u.status || 'Active'
          }));
          this.cdr.detectChanges();
        },
        error: () => {
          this.users = [];
          this.cdr.detectChanges();
        }
      });
  }
}
