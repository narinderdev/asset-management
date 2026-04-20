import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export interface UserCoordinates {
  latitude: number;
  longitude: number;
  capturedAt: number;
}

@Injectable({ providedIn: 'root' })
export class UserLocationService {
  private readonly isBrowser: boolean;
  private readonly storageKey = 'userCoordinates';

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  hasSavedCoordinates(): boolean {
    return this.getSavedCoordinates() !== null;
  }

  getSavedCoordinates(): UserCoordinates | null {
    if (!this.isBrowser) {
      return null;
    }

    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw) as Partial<UserCoordinates>;
      if (
        typeof parsed.latitude !== 'number' ||
        typeof parsed.longitude !== 'number' ||
        !Number.isFinite(parsed.latitude) ||
        !Number.isFinite(parsed.longitude)
      ) {
        return null;
      }

      return {
        latitude: parsed.latitude,
        longitude: parsed.longitude,
        capturedAt: typeof parsed.capturedAt === 'number' ? parsed.capturedAt : Date.now()
      };
    } catch {
      return null;
    }
  }

  async captureAndStoreCoordinates(): Promise<UserCoordinates | null> {
    if (!this.isBrowser || typeof navigator === 'undefined' || !navigator.geolocation) {
      return null;
    }

    try {
      const coords = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
      });

      const payload: UserCoordinates = {
        latitude: coords.coords.latitude,
        longitude: coords.coords.longitude,
        capturedAt: Date.now()
      };

      localStorage.setItem(this.storageKey, JSON.stringify(payload));
      return payload;
    } catch {
      return null;
    }
  }
}
