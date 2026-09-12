import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse, Department, Doctor, DoctorLiveStatus, HospitalInfo, DoctorTokenScheduleResponse } from '../models/clinic.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ClinicService {
  private readonly http = inject(HttpClient);
  readonly apiUrl = environment.apiUrl;

  /**
   * 1. Load Clinic Profile by URL Path
   * GET /api/clinic/:urlPath
   */
  getClinicByUrlPath(urlPath: string): Observable<ApiResponse<HospitalInfo>> {
    return this.http.get<ApiResponse<HospitalInfo>>(`${this.apiUrl}/api/clinic/${encodeURIComponent(urlPath)}`);
  }

  /**
   * Load list of active clinics for discovery / fallback
   * GET /api/clinics
   */
  getAllClinics(): Observable<ApiResponse<HospitalInfo[]>> {
    return this.http.get<ApiResponse<HospitalInfo[]>>(`${this.apiUrl}/api/clinics`);
  }

  /**
   * 2. Fetch Departments for Clinic
   * GET /api/clinic/:urlPath/departments
   */
  getDepartments(urlPath: string): Observable<ApiResponse<Department[]>> {
    return this.http.get<ApiResponse<Department[]>>(
      `${this.apiUrl}/api/clinic/${encodeURIComponent(urlPath)}/departments`
    );
  }

  /**
   * 3. Fetch Doctors by Clinic and optional Department
   * GET /api/clinic/:urlPath/doctors?departmentId=...
   */
  getDoctors(
    urlPath: string,
    departmentId?: string,
    departmentName?: string
  ): Observable<ApiResponse<Doctor[]>> {
    let params = new HttpParams();
    if (departmentId) {
      params = params.set('departmentId', departmentId);
    } else if (departmentName) {
      params = params.set('department', departmentName);
    }

    return this.http.get<ApiResponse<Doctor[]>>(
      `${this.apiUrl}/api/clinic/${encodeURIComponent(urlPath)}/doctors`,
      { params }
    );
  }

  /**
   * 4. Fetch real-time Doctor Live Consultation & Queue Status
   * GET /api/clinic/:urlPath/doctors/:doctorId/live-status
   */
  getDoctorLiveStatus(
    urlPath: string,
    doctorId: string,
    identifiers?: { email?: string; phoneNumber?: string; strDeviceId?: string }
  ): Observable<DoctorLiveStatus> {
    let params = new HttpParams();
    if (identifiers?.email) {
      params = params.set('email', identifiers.email);
    }
    if (identifiers?.phoneNumber) {
      params = params.set('phoneNumber', identifiers.phoneNumber);
    }
    if (identifiers?.strDeviceId) {
      params = params.set('strDeviceId', identifiers.strDeviceId);
    }

    return this.http.get<DoctorLiveStatus>(
      `${this.apiUrl}/api/clinic/${encodeURIComponent(urlPath)}/doctors/${encodeURIComponent(doctorId)}/live-status`,
      { params }
    );
  }

  /**
   * 5. Fetch doctor's token schedule with allotted times for a specific date
   * GET /api/clinic/:urlPath/doctors/:doctorId/tokens?date=YYYY-MM-DD
   */
  getDoctorTokenSchedule(
    urlPath: string,
    doctorId: string,
    date?: string
  ): Observable<DoctorTokenScheduleResponse> {
    let params = new HttpParams();
    if (date) {
      params = params.set('date', date);
    }

    return this.http.get<DoctorTokenScheduleResponse>(
      `${this.apiUrl}/api/clinic/${encodeURIComponent(urlPath)}/doctors/${encodeURIComponent(doctorId)}/tokens`,
      { params }
    );
  }
}

