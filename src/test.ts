// This file is loaded by the Angular test runner to set up the testing environment.
import 'zone.js/testing';
import { getTestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';
import { vi } from 'vitest';

getTestBed().initTestEnvironment(
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting()
);

// Provide jasmine-like globals for specs that rely on jasmine.createSpy/spyOn.
const globalAny: any = globalThis as any;
if (!globalAny.jasmine) {
  globalAny.jasmine = {
    createSpy: (_name?: string) => vi.fn()
  };
}
if (!globalAny.spyOn) {
  globalAny.spyOn = vi.spyOn;
}
