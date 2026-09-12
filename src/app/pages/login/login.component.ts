import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { LoginPayload } from '../../models/customer.model';
import { AuthService } from '../../services/auth.service';
import { inject, OnInit } from '@angular/core';
import { getMediaUrl } from '../../utils/media.util';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit {
  readonly getImageUrl = getMediaUrl;
  showPassword = signal(false);
  isSubmitting = signal(false);
  clinicId = signal('default');
  clinics = signal<any[]>([]);
  isLoadingClinics = signal(false);

  loginData: LoginPayload = {
    phone: '',
    password: '',
    clinicId: '',
    rememberMe: false
  };

  toast = signal<{ show: boolean; message: string; type: 'success' | 'error' | 'info' }>({
    show: false,
    message: '',
    type: 'success'
  });

  togglePassword() {
    this.showPassword.update(v => !v);
  }

  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('clinicId') || 'default';
      this.clinicId.set(id);
      this.loginData.clinicId = id;

      if (id === 'default') {
        this.fetchClinics();
      }
    });
  }

  fetchClinics() {
    this.isLoadingClinics.set(true);
    this.authService.getClinics().subscribe({
      next: (res) => {
        this.clinics.set(res.data || []);
        this.isLoadingClinics.set(false);
      },
      error: (err) => {
        console.error('Failed to fetch clinics:', err);
        this.isLoadingClinics.set(false);
      }
    });
  }

  selectClinic(clinicId: string) {
    this.router.navigate(['/login', clinicId]);
  }

  onLogin() {
    if (!this.loginData.phone.trim() || !this.loginData.password.trim()) {
      this.triggerToast('Please enter your phone number and password.', 'error');
      return;
    }

    this.isSubmitting.set(true);

    this.authService.login(this.loginData).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.triggerToast('Welcome back! Successfully signed in.', 'success');
        console.log('User Logged In:', res.data);
        setTimeout(() => {
          this.router.navigate(['/']); // or dashboard
        }, 900);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.triggerToast(err.error?.error || err.error?.message || err.error || 'Login failed', 'error');
        console.error('Login Error:', err);
      }
    });
  }

  triggerToast(message: string, type: 'success' | 'error' | 'info' = 'success') {
    this.toast.set({ show: true, message, type });
    setTimeout(() => {
      this.toast.set({ show: false, message: '', type: 'success' });
    }, 3500);
  }
}
