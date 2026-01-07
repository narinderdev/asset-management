import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { vi } from 'vitest';

import { CreateFailureCodeComponent } from './create-failure-code';

describe('CreateFailureCodeComponent', () => {
  let component: CreateFailureCodeComponent;
  let fixture: ComponentFixture<CreateFailureCodeComponent>;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateFailureCodeComponent, RouterTestingModule]
    }).compileComponents();

    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(CreateFailureCodeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should navigate back on cancel', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');

    component.onCancel();

    expect(navigateSpy).toHaveBeenCalledWith(['/failure-codes']);
  });

  it('should navigate after create', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');

    component.onCreate();

    expect(navigateSpy).toHaveBeenCalledWith(['/failure-codes']);
  });
});
