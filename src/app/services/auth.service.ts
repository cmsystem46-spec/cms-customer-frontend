import { Injectable, signal, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import { Observable, throwError } from 'rxjs';
import { AuthUser } from '../models/clinic.model';
import { LoginPayload, RegisterPayload, AdditionalCustomerData } from '../models/customer.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  readonly apiUrl = environment.apiUrl;
  private defaultClinicId = 'clinic_123';

  // Reactive state signals
  readonly user = signal<AuthUser | null>(null);
  readonly token = signal<string | null>(null);
  readonly isAuthenticated = signal<boolean>(false);

  constructor() {
    this.loadStoredSession();
  }

  private loadStoredSession(): void {
    const savedToken = localStorage.getItem('cms_auth_token') || localStorage.getItem('auth_token');
    const savedUser = localStorage.getItem('cms_auth_user') || localStorage.getItem('auth_user');
    if (savedToken && savedUser) {
      try {
        this.token.set(savedToken);
        this.user.set(JSON.parse(savedUser));
        this.isAuthenticated.set(true);
      } catch {
        this.logout();
      }
    }
  }

  saveSession(token: string, user: AuthUser): void {
    localStorage.setItem('cms_auth_token', token);
    localStorage.setItem('cms_auth_user', JSON.stringify(user));
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(user));
    this.token.set(token);
    this.user.set(user);
    this.isAuthenticated.set(true);
  }

  /**
   * Log out and clear authenticated patient state
   */
  logout(): void {
    localStorage.removeItem('cms_auth_token');
    localStorage.removeItem('cms_auth_user');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    this.token.set(null);
    this.user.set(null);
    this.isAuthenticated.set(false);
  }

  /**
   * 6A. Send OTP to Patient Email
   * POST /api/auth/send-otp
   */
  sendOtp(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/api/auth/send-otp`, {
      email: email.trim().toLowerCase(),
    });
  }

  /**
   * 6B. Verify OTP
   * POST /api/auth/verify-otp
   */
  verifyOtp(email: string, otp: string): Observable<{ message: string; token: string; user: AuthUser }> {
    return this.http
      .post<{ message: string; token: string; user: AuthUser }>(
        `${this.apiUrl}/api/auth/verify-otp`,
        {
          email: email.trim().toLowerCase(),
          otp: otp.trim(),
        }
      )
      .pipe(
        tap((res) => {
          if (res.token && res.user) {
            this.saveSession(res.token, res.user);
          }
        })
      );
  }

  /**
   * Legacy / Auxiliary compatibility methods for direct login/register
   */
  getClinics(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/api/clinics`);
  }

  register(payload: RegisterPayload): Observable<any> {
    const clinicId = payload.clinicId || this.defaultClinicId;
    const body = {
      name: payload.name,
      phoneNumber: payload.phone,
      password: payload.password,
    };
    return this.http.post<any>(`${this.apiUrl}/${clinicId}/register`, body).pipe(
      tap((res) => {
        if (res.token) {
          this.saveSession(res.token, {
            email: res.data?.email || '',
            phoneNumber: res.data?.phoneNumber || payload.phone,
            name: res.data?.name || payload.name,
          });
        }
      })
    );
  }

  login(payload: LoginPayload): Observable<any> {
    const clinicId = payload.clinicId || this.defaultClinicId;
    const body = {
      phoneNumber: payload.phone,
      password: payload.password,
    };
    return this.http.post<any>(`${this.apiUrl}/${clinicId}/login`, body).pipe(
      tap((res) => {
        if (res.data && res.data.token) {
          this.saveSession(res.data.token, {
            email: res.data?.email || '',
            phoneNumber: res.data?.phoneNumber || payload.phone,
            name: res.data?.name,
          });
        }
      })
    );
  }

  updateProfile(data: AdditionalCustomerData): Observable<any> {
    const currentUser = this.user() as any;
    if (!currentUser || !this.token()) {
      return throwError(() => new Error('Not authenticated'));
    }

    const headers = new HttpHeaders({
      Authorization: `Bearer ${this.token()}`,
    });

    const body = {
      address: data.address,
    };

    const userId = currentUser._id || currentUser.id || 'me';
    return this.http.patch<any>(`${this.apiUrl}/user/${userId}`, body, { headers });
  }

  setQuickAuthenticated(email?: string, phoneNumber?: string, name?: string): void {
    const user: AuthUser = {
      email: email ? email.trim().toLowerCase() : '',
      phoneNumber: phoneNumber ? phoneNumber.trim() : undefined,
      name: name ? name.trim() : undefined,
    };
    this.saveSession('local-session-' + Date.now(), user);
  }
}
