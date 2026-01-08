import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { ToastrService } from 'ngx-toastr';
import { vi } from 'vitest';
import { of } from 'rxjs';

import { AddAssetComponent } from './add-asset';

@Component({
  standalone: true,
  template: ''
})
class DummyComponent {}

describe('AddAssetComponent', () => {
  let component: AddAssetComponent;
  let fixture: ComponentFixture<AddAssetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        AddAssetComponent,
        RouterTestingModule.withRoutes([
          { path: 'assets/add-asset', component: DummyComponent },
          { path: 'assets/add-asset/:tab', component: DummyComponent },
          { path: '**', component: DummyComponent }
        ])
      ],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({}),
              queryParamMap: convertToParamMap({}),
              queryParams: {}
            },
            paramMap: of(convertToParamMap({})),
            queryParamMap: of(convertToParamMap({}))
          }
        },
        { provide: ToastrService, useValue: { success: vi.fn(), error: vi.fn() } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AddAssetComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
