import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ToastrService } from 'ngx-toastr';

import { RolesComponent } from './roles';

describe('Roles', () => {
  let component: RolesComponent;
  let fixture: ComponentFixture<RolesComponent>;
  const toastrMock = {
    success: () => {},
    error: () => {}
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RolesComponent, HttpClientTestingModule],
      providers: [{ provide: ToastrService, useValue: toastrMock }]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RolesComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
