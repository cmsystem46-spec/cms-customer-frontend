import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class DeviceService {
  private readonly STORAGE_KEY = 'cms_patient_device_id';

  /**
   * Retrieves the persistent unique device ID, or generates one if absent.
   */
  getDeviceId(): string {
    let deviceId = localStorage.getItem(this.STORAGE_KEY);
    if (!deviceId) {
      deviceId = this.generateDeviceId();
      localStorage.setItem(this.STORAGE_KEY, deviceId);
    }
    return deviceId;
  }

  private generateDeviceId(): string {
    // Generate a reliable pseudo-UUID v4 format
    const randomPart = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
    return `DEV-${randomPart}`;
  }
}
