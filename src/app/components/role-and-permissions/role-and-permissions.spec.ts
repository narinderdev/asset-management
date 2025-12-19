import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RoleAndPermissions } from './role-and-permissions';

describe('RoleAndPermissions', () => {
  let component: RoleAndPermissions;
  let fixture: ComponentFixture<RoleAndPermissions>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoleAndPermissions]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RoleAndPermissions);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
