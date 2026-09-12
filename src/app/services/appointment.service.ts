import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { ApiResponse, Appointment, CreateAppointmentPayload } from '../models/clinic.model';
import { DeviceService } from './device.service';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AppointmentService {
  private readonly http = inject(HttpClient);
  private readonly deviceService = inject(DeviceService);
  readonly apiUrl = environment.apiUrl;

  // Reactive signal holding recently confirmed appointment
  readonly lastBookedAppointment = signal<Appointment | null>(null);

  /**
   * 4. Book Appointment
   * POST /api/appointments
   */
  createAppointment(payload: CreateAppointmentPayload): Observable<ApiResponse<Appointment>> {
    // If not provided in payload, attach device ID
    if (!payload.strDeviceId) {
      payload.strDeviceId = this.deviceService.getDeviceId();
    }

    return this.http
      .post<ApiResponse<Appointment>>(`${this.apiUrl}/api/appointments`, payload, {
        headers: {
          'x-device-id': payload.strDeviceId,
        },
      })
      .pipe(
        tap((res) => {
          if (res.data) {
            this.lastBookedAppointment.set(res.data);
          }
        })
      );
  }

  /**
   * 5. View Appointments
   * GET /api/appointments?strDeviceId=... (Guest)
   * GET /api/appointments?email=... OR ?phoneNumber=... (Authenticated)
   */
  getAppointments(filters: {
    strDeviceId?: string;
    email?: string;
    phoneNumber?: string;
    hospitalId?: string;
  }): Observable<ApiResponse<Appointment[]>> {
    let params = new HttpParams();

    if (filters.email) {
      params = params.set('email', filters.email.trim().toLowerCase());
    } else if (filters.phoneNumber) {
      params = params.set('phoneNumber', filters.phoneNumber.trim());
    } else if (filters.strDeviceId) {
      params = params.set('strDeviceId', filters.strDeviceId.trim());
    } else {
      // Default to guest device ID
      params = params.set('strDeviceId', this.deviceService.getDeviceId());
    }

    if (filters.hospitalId) {
      params = params.set('hospitalId', filters.hospitalId);
    }

    return this.http.get<ApiResponse<Appointment[]>>(`${this.apiUrl}/api/appointments`, {
      params,
      headers: {
        'x-device-id': filters.strDeviceId || this.deviceService.getDeviceId(),
      },
    });
  }
}
