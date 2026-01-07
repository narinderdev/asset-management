import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';

import { ViewAssetComponent } from './view-asset';
import { AssetsService } from '../../services/assets.service';

class AssetsServiceStub {
  fetchAssetById = vi.fn().mockReturnValue(of({
    data: {
      id: 1,
      assetId: 'A-1',
      assetName: 'Pump',
      location: { location: 'Plant', department: 'Ops' }
    }
  }));
}

describe('ViewAssetComponent', () => {
  let component: ViewAssetComponent;
  let fixture: ComponentFixture<ViewAssetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ViewAssetComponent, RouterTestingModule],
      providers: [
        { provide: AssetsService, useClass: AssetsServiceStub },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '1' }) } } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ViewAssetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load asset on init', () => {
    expect(component.asset?.assetName).toBe('Pump');
    expect(component.locationDetails?.location).toBe('Plant');
  });

  it('should format fields safely', () => {
    expect(component.formatBoolean(undefined)).toBe('-');
    expect(component.formatField(null)).toBe('-');
    expect(component.formatDate('invalid')).toBe('invalid');
  });
});
