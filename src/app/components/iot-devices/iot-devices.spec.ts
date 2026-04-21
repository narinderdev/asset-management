import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { vi } from 'vitest';

import { IotDevicesComponent } from './iot-devices';
import { IotDeviceService } from '../../services/iot-device.service';
import { CompanyContextService } from '../../services/company-context.service';

describe('IotDevicesComponent', () => {
  let component: IotDevicesComponent;
  let fixture: ComponentFixture<IotDevicesComponent>;
  let router: Router;
  let iotDeviceServiceStub: {
    fetchDevices: ReturnType<typeof vi.fn>;
    sendDummyReadings: ReturnType<typeof vi.fn>;
  };
  let companyContextStub: {
    getSelectedCompanyId: ReturnType<typeof vi.fn>;
  };
  let toastrStub: {
    error: ReturnType<typeof vi.fn>;
    info: ReturnType<typeof vi.fn>;
    success: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    iotDeviceServiceStub = {
      sendDummyReadings: vi.fn(),
      fetchDevices: vi.fn().mockReturnValue(
        of({
          data: {
            content: [
              {
                id: 11,
                deviceUid: '435435',
                deviceName: 'cvbcvbsss',
                assetName: 'dfg',
                location: 'VALLEJO',
                enabled: true
              }
            ],
            page: 0,
            size: 10,
            totalElements: 1
          }
        })
      )
    };

    companyContextStub = {
      getSelectedCompanyId: vi.fn().mockReturnValue(1)
    };

    toastrStub = {
      error: vi.fn(),
      info: vi.fn(),
      success: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [IotDevicesComponent, RouterTestingModule],
      providers: [
        { provide: IotDeviceService, useValue: iotDeviceServiceStub },
        { provide: CompanyContextService, useValue: companyContextStub },
        { provide: ToastrService, useValue: toastrStub }
      ]
    }).compileComponents();

    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(IotDevicesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load devices on init', () => {
    expect(component).toBeTruthy();
    expect(iotDeviceServiceStub.fetchDevices).toHaveBeenCalledWith(0, 10);
    expect(component.devices.length).toBe(1);
    expect(component.totalDevices).toBe(1);
    expect(component.hasLoaded).toBe(true);
    expect(component.isLoading).toBe(false);
  });

  it('should navigate to create route on add device', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');

    component.createDevice();

    expect(navigateSpy).toHaveBeenCalledWith(['/iot/devices/create']);
  });

  it('should navigate to view and edit only when id exists', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');

    component.viewDevice({ id: 99 });
    component.editDevice({ id: 99 });
    component.viewDevice({});
    component.editDevice({});

    expect(navigateSpy).toHaveBeenCalledWith(['/iot/devices/view', 99]);
    expect(navigateSpy).toHaveBeenCalledWith(['/iot/devices/edit', 99]);
    expect(navigateSpy).toHaveBeenCalledTimes(2);
  });

  it('should reset page and reload on refresh', () => {
    const loadSpy = vi.spyOn(component, 'loadDevices');
    component.currentPage = 4;

    component.refresh();

    expect(component.currentPage).toBe(0);
    expect(loadSpy).toHaveBeenCalled();
  });

  it('should move to next and previous page when allowed', () => {
    const loadSpy = vi.spyOn(component, 'loadDevices');
    component.totalDevices = 30;
    component.itemsPerPage = 10;
    component.currentPage = 0;
    component.isLoading = false;
    loadSpy.mockClear();

    component.nextPage();
    expect(component.currentPage).toBe(1);
    expect(loadSpy).toHaveBeenCalledTimes(1);

    component.previousPage();
    expect(component.currentPage).toBe(0);
    expect(loadSpy).toHaveBeenCalledTimes(2);
  });

  it('should not paginate when loading or at boundaries', () => {
    const loadSpy = vi.spyOn(component, 'loadDevices');
    component.totalDevices = 10;
    component.itemsPerPage = 10;
    component.currentPage = 0;
    component.isLoading = true;

    component.previousPage();
    component.nextPage();

    expect(component.currentPage).toBe(0);
    expect(loadSpy).not.toHaveBeenCalled();
  });

  it('should handle api error while loading devices', () => {
    iotDeviceServiceStub.fetchDevices.mockReturnValueOnce(
      throwError(() => new Error('network'))
    );

    component.loadDevices();

    expect(component.devices).toEqual([]);
    expect(component.totalDevices).toBe(0);
    expect(component.errorMessage).toBe('Unable to load IoT devices.');
    expect(toastrStub.error).toHaveBeenCalledWith('Unable to load IoT devices. Please try again.');
    expect(component.hasLoaded).toBe(true);
    expect(component.isLoading).toBe(false);
  });

  it('should render loaded table values', () => {
    const native = fixture.nativeElement as HTMLElement;

    expect(native.textContent).toContain('IoT Device Management');
    expect(native.textContent).toContain('Stimulate');
    expect(native.textContent).toContain('435435');
    expect(native.textContent).toContain('cvbcvbsss');
    expect(native.textContent).toContain('Authorized');
  });
});
