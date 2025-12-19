import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddAsset } from './add-asset';

describe('AddAsset', () => {
  let component: AddAsset;
  let fixture: ComponentFixture<AddAsset>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddAsset]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddAsset);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
