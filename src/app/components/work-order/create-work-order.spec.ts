import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { vi } from 'vitest';

import { CreateWorkOrderComponent } from './create-work-order';

describe('CreateWorkOrderComponent', () => {
  let component: CreateWorkOrderComponent;
  let fixture: ComponentFixture<CreateWorkOrderComponent>;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateWorkOrderComponent, RouterTestingModule]
    }).compileComponents();

    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(CreateWorkOrderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should clear wo id when auto-generate toggled on', () => {
    component.workOrder.woId = 'WO-TEST';
    component.autoGenerateWoId = true;

    component.onAutoGenerateWoIdChange();

    expect(component.workOrder.woId).toBe('');
  });

  it('should navigate back on cancel', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');
    component.onCancel();
    expect(navigateSpy).toHaveBeenCalledWith(['/work-orders']);
  });

  it('should navigate after create', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');
    component.onCreate();
    expect(navigateSpy).toHaveBeenCalledWith(['/work-orders']);
  });
});
