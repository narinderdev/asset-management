import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { UsersComponent } from './users';
import { RoleService } from '../../services/role.service';
import { UserService } from '../../services/user.service';
import { ToastrService } from 'ngx-toastr';
import { PermissionService } from '../../services/permission.service';

class RoleServiceStub {
  getRoles = vi.fn().mockReturnValue(of({ data: { content: [{ id: 1, name: 'Admin' }] } }));
}

class UserServiceStub {
  fetchUsers = vi.fn().mockReturnValue(of({ data: [{ name: 'Alice', email: 'a@a.com', roles: ['Admin'], status: 'ACTIVE' }] }));
  inviteUser = vi.fn().mockReturnValue(of({ message: 'sent' }));
}

describe('UsersComponent', () => {
  let fixture: ComponentFixture<UsersComponent>;
  let component: UsersComponent;
  let userService: UserServiceStub;
  let roleService: RoleServiceStub;
  const toastr = {
    success: vi.fn(),
    error: vi.fn()
  };
  const permission = {
    hasPermission: vi.fn(() => true),
    getAllowedModules: vi.fn(() => []),
    getCurrentUserName: vi.fn(() => 'Tester'),
    clear: vi.fn()
  } as unknown as PermissionService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UsersComponent],
      providers: [
        { provide: UserService, useClass: UserServiceStub },
        { provide: RoleService, useClass: RoleServiceStub },
        { provide: ToastrService, useValue: toastr },
        { provide: PermissionService, useValue: permission }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UsersComponent);
    component = fixture.componentInstance;
    userService = TestBed.inject(UserService) as unknown as UserServiceStub;
    roleService = TestBed.inject(RoleService) as unknown as RoleServiceStub;
    fixture.detectChanges();
  });

  it('creates and loads users on init', () => {
    expect(component).toBeTruthy();
    expect(userService.fetchUsers).toHaveBeenCalled();
    expect(component.users.length).toBe(1);
    expect(component.users[0].name).toBe('Alice');
  });

  it('fetches roles when opening invite', () => {
    component.roleOptions = [];
    component.openInvite();
    expect(roleService.getRoles).toHaveBeenCalled();
    expect(component.showInviteModal).toBe(true);
  });

  it('validates invite form before sending', () => {
    component.inviteForm = { firstName: '', lastName: '', email: '', roleId: '' };
    component.sendInvite();
    expect(toastr.error).toHaveBeenCalled();
    expect(userService.inviteUser).not.toHaveBeenCalled();
  });

  it('sends invite and resets modal', () => {
    component.inviteForm = { firstName: 'Bob', lastName: 'Smith', email: 'bob@test.com', roleId: '1' };
    component.showInviteModal = true;

    component.sendInvite();

    expect(userService.inviteUser).toHaveBeenCalledWith({
      firstName: 'Bob',
      lastName: 'Smith',
      email: 'bob@test.com',
      roleIds: [1]
    });
    expect(toastr.success).toHaveBeenCalled();
    expect(component.showInviteModal).toBe(false);
  });

  it('handles invite error', () => {
    userService.inviteUser = vi.fn().mockReturnValue(throwError(() => new Error('fail')));
    component.inviteForm = { firstName: 'Err', lastName: 'Case', email: 'e@e.com', roleId: '1' };

    component.sendInvite();

    expect(toastr.error).toHaveBeenCalled();
  });
});
