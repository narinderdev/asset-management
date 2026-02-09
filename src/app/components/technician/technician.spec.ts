import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { TechnicianComponent } from './technician';
import { TechnicianService } from '../../services/technician.service';
import { PermissionService } from '../../services/permission.service';
import { ToastrService } from 'ngx-toastr';

describe('TechnicianComponent (TM technician list)', () => {
  const technicianServiceMock = {
    fetchTechnicians: vi.fn().mockReturnValue(
      of({
        data: {
          technicians: [
            { id: 1, technicianId: 'TEC-0001', firstName: 'John', lastName: 'Doe', role: 'Tech', team: 'A', status: 'AVAILABLE' }
          ],
          totalElements: 1,
          size: 10,
          page: 0
        }
      })
    ),
    deleteTechnician: vi.fn().mockReturnValue(of({}))
  };

  const permissionServiceMock = {
    hasPermission: vi.fn().mockReturnValue(true)
  };

  const toastrMock = {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn()
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TechnicianComponent],
      providers: [
        { provide: TechnicianService, useValue: technicianServiceMock },
        { provide: PermissionService, useValue: permissionServiceMock },
        { provide: ToastrService, useValue: toastrMock }
      ]
    }).compileComponents();
  });

  it('should create and load technicians', () => {
    const fixture = TestBed.createComponent(TechnicianComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance;

    expect(comp).toBeTruthy();
    expect(technicianServiceMock.fetchTechnicians).toHaveBeenCalled();
    expect(comp.technicians.length).toBe(1);
    expect(comp.technicians[0].id).toBe(1);
    expect(comp.technicians[0].name).toBe('John Doe');
  });
});
