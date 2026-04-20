import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { vi } from 'vitest';

import { CreateIotDeviceComponent } from './create-iot-device';
import { IotDeviceService } from '../../services/iot-device.service';
import { AssetsService } from '../../services/assets.service';

async function setup(routeParams: Record<string, string> = {}) {
  const iotDeviceServiceStub = {
    fetchDeviceById: vi.fn().mockReturnValue(
      of({
        data: {
          id: 22,
          deviceUid: 'EX-001',
          deviceName: 'Existing Device',
          assetId: 1,
          location: 'Plant A',
          enabled: true
        }
      })
    ),
    createDevice: vi.fn().mockReturnValue(of({})),
    updateDevice: vi.fn().mockReturnValue(of({}))
  };

  const assetsServiceStub = {
    fetchAssets: vi.fn().mockReturnValue(
      of({
        data: {
          content: [
            { id: 1, assetName: 'Boiler', location: { primaryLocation: 'Plant A' } },
            { id: 2, assetName: 'Chiller', location: 'Plant B' }
          ]
        }
      })
    )
  };

  const toastrStub = {
    success: vi.fn(),
    error: vi.fn()
  };

  await TestBed.configureTestingModule({
    imports: [CreateIotDeviceComponent, RouterTestingModule],
    providers: [
      { provide: IotDeviceService, useValue: iotDeviceServiceStub },
      { provide: AssetsService, useValue: assetsServiceStub },
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: convertToParamMap(routeParams) } }
      },
      { provide: ToastrService, useValue: toastrStub }
    ]
  }).compileComponents();

  const fixture = TestBed.createComponent(CreateIotDeviceComponent);
  const component = fixture.componentInstance;
  const router = TestBed.inject(Router);
  fixture.detectChanges();

  return { component, fixture, router, iotDeviceServiceStub, assetsServiceStub, toastrStub };
}

describe('CreateIotDeviceComponent', () => {
  it('should create in create mode and load assets', async () => {
    const { component, assetsServiceStub, iotDeviceServiceStub } = await setup();

    expect(component).toBeTruthy();
    expect(component.isEditMode).toBe(false);
    expect(component.hasLoadedDetails).toBe(true);
    expect(assetsServiceStub.fetchAssets).toHaveBeenCalledWith(0, 500);
    expect(iotDeviceServiceStub.fetchDeviceById).not.toHaveBeenCalled();
    expect(component.assetOptions.length).toBe(2);
  });

  it('should navigate back on cancel', async () => {
    const { component, router } = await setup();
    const navigateSpy = vi.spyOn(router, 'navigate');

    component.onCancel();

    expect(navigateSpy).toHaveBeenCalledWith(['/iot/devices']);
  });

  it('should set location from selected asset', async () => {
    const { component } = await setup();

    component.onAssetChange('2');

    expect(component.device.assetId).toBe('2');
    expect(component.device.location).toBe('Plant B');
  });

  it('should validate required name and block submit', async () => {
    const { component, iotDeviceServiceStub } = await setup();
    component.device.deviceUid = 'DEV-1';
    component.device.deviceName = '   ';

    component.onSubmit();

    expect(component.errorMessage).toBe('Device name is required.');
    expect(iotDeviceServiceStub.createDevice).not.toHaveBeenCalled();
  });

  it('should validate required uid in create mode and block submit', async () => {
    const { component, iotDeviceServiceStub } = await setup();
    component.device.deviceUid = ' ';
    component.device.deviceName = 'Sensor';

    component.onSubmit();

    expect(component.errorMessage).toBe('Device UID is required.');
    expect(iotDeviceServiceStub.createDevice).not.toHaveBeenCalled();
  });

  it('should create device with trimmed payload and navigate', async () => {
    const { component, router, iotDeviceServiceStub, toastrStub } = await setup();
    const navigateSpy = vi.spyOn(router, 'navigate');

    component.device.deviceUid = ' DEV-100 ';
    component.device.deviceName = '  Pump Sensor  ';
    component.device.assetId = '2';
    component.device.location = '  Plant B  ';
    component.device.enabled = true;

    component.onSubmit();

    expect(iotDeviceServiceStub.createDevice).toHaveBeenCalledWith({
      deviceUid: 'DEV-100',
      deviceName: 'Pump Sensor',
      assetId: 2,
      location: 'Plant B',
      enabled: true
    });
    expect(toastrStub.success).toHaveBeenCalledWith('Device created successfully.');
    expect(navigateSpy).toHaveBeenCalledWith(['/iot/devices']);
  });

  it('should enter edit mode, load device, and submit update without uid', async () => {
    const { component, router, iotDeviceServiceStub, toastrStub } = await setup({ id: '22' });
    const navigateSpy = vi.spyOn(router, 'navigate');

    expect(component.isEditMode).toBe(true);
    expect(component.deviceId).toBe('22');
    expect(iotDeviceServiceStub.fetchDeviceById).toHaveBeenCalledWith('22');
    expect(component.device.deviceUid).toBe('EX-001');

    component.device.deviceName = 'Updated Device';
    component.device.assetId = '1';
    component.device.location = 'Plant A';
    component.device.enabled = false;

    component.onSubmit();

    expect(iotDeviceServiceStub.updateDevice).toHaveBeenCalledWith('22', {
      deviceName: 'Updated Device',
      assetId: 1,
      location: 'Plant A',
      enabled: false
    });
    expect(toastrStub.success).toHaveBeenCalledWith('Device updated successfully.');
    expect(navigateSpy).toHaveBeenCalledWith(['/iot/devices']);
  });

  it('should handle submit api failure', async () => {
    const { component, iotDeviceServiceStub, toastrStub } = await setup();
    iotDeviceServiceStub.createDevice.mockReturnValueOnce(
      throwError(() => new Error('api failed'))
    );

    component.device.deviceUid = 'DEV-500';
    component.device.deviceName = 'Temp Sensor';
    component.onSubmit();

    expect(component.errorMessage).toBe('Unable to create device. Please try again.');
    expect(toastrStub.error).toHaveBeenCalledWith('Unable to create device. Please try again.');
    expect(component.isSubmitting).toBe(false);
  });
});
