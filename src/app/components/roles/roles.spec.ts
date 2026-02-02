import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToastrService } from 'ngx-toastr';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { RolesComponent } from './roles';
import { RoleService, CreateRolePayload } from '../../services/role.service';

class RoleServiceStub {
  getRoles = vi.fn().mockReturnValue(of({ data: [] }));
  getPermissions = vi.fn().mockReturnValue(
    of({
      data: [
        {
          module: 'MANAGE_USERS',
          permissions: [
            { code: 'MANAGE_USERS_VIEW', action: 'ACCESS' },
            { code: 'MANAGE_USERS_INVITE', action: 'INVITE' }
          ]
        }
      ]
    })
  );
  createRoles = vi.fn().mockReturnValue(of({ message: 'created' }));
}

describe('RolesComponent', () => {
  let component: RolesComponent;
  let fixture: ComponentFixture<RolesComponent>;
  const toastrMock = {
    success: vi.fn(),
    error: vi.fn()
  };
  let roleService: RoleServiceStub;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RolesComponent],
      providers: [
        { provide: RoleService, useClass: RoleServiceStub },
        { provide: ToastrService, useValue: toastrMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RolesComponent);
    component = fixture.componentInstance;
    roleService = TestBed.inject(RoleService) as unknown as RoleServiceStub;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('maps permissions from API into rows with view/create', () => {
    component['fetchPermissions']();
    expect(roleService.getPermissions).toHaveBeenCalled();
    expect(component.permissionRows.length).toBeGreaterThan(0);
    const row = component.permissionRows[0];
    expect(row.permissions.view).toBe('MANAGE_USERS_VIEW');
    expect(row.permissions.create).toBe('MANAGE_USERS_INVITE');
  });

  it('computes pagination after loading roles', () => {
    component['fetchRoles']();
    expect(roleService.getRoles).toHaveBeenCalled();
    expect(component.pagination.totalItems).toBe(component.roles.length);
    const expectedPages = component.roles.length
      ? Math.ceil(component.roles.length / component.pagination.pageSize)
      : 0;
    expect(component.pagination.totalPages).toBe(expectedPages);
  });

  it('auto-selects view when a dependent permission is toggled on', () => {
    const row = {
      label: 'Test',
      permissions: { view: 'VIEW_TEST', create: 'CREATE_TEST' }
    };
    component.onPermissionToggle(row, 'create');
    const perms = component.addRoleForm.get('permissions')?.value;
    expect(perms).toEqual(['CREATE_TEST', 'VIEW_TEST']);
  });

  it('disables view when dependents are selected', () => {
    const row = {
      label: 'Test',
      permissions: { view: 'VIEW_TEST', create: 'CREATE_TEST' }
    };
    component.addRoleForm.get('permissions')?.setValue(['VIEW_TEST']);
    component.addRoleForm.get('permissions')?.setValue(['CREATE_TEST']);
    expect(component.isViewDisabled(row as any)).toBe(true);
  });

  it('calls createRoles and closes modal on successful save', () => {
    component.isModalOpen = true;
    component.addRoleForm.patchValue({
      name: 'Role A',
      description: 'Desc',
      permissions: ['P1', 'P2']
    });

    component.saveRole();

    expect(roleService.createRoles).toHaveBeenCalledWith({
      name: 'Role A',
      description: 'Desc',
      permissionCodes: ['P1', 'P2'],
      technicianRole: false
    } as CreateRolePayload);
    expect(toastrMock.success).toHaveBeenCalled();
    expect(component.isModalOpen).toBe(false);
  });
});
