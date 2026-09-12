import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse, Department, Doctor, HospitalInfo } from '../models/clinic.model';
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
}
