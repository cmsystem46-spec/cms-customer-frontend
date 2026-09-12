import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ClinicService } from '../../services/clinic.service';
import { AuthService } from '../../services/auth.service';
import { HospitalInfo } from '../../models/clinic.model';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-clinic-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './clinic-home.component.html',
})
export class ClinicHomeComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly clinicService = inject(ClinicService);
  readonly authService = inject(AuthService);
  readonly apiUrl = environment.apiUrl;

  readonly urlPath = signal<string>('');
  readonly hospital = signal<HospitalInfo | null>(null);
  readonly isLoading = signal<boolean>(true);
  readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      const path = params['urlPath'];
      if (path) {
        this.urlPath.set(path);
        this.loadHospital(path);
      } else {
        this.router.navigate(['/city-care-hospital']);
      }
    });
  }

  loadHospital(path: string): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.clinicService.getClinicByUrlPath(path).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.data) {
          this.hospital.set(res.data);
        } else {
          this.errorMessage.set('Clinic details not found.');
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || `Clinic "${path}" was not found or is currently inactive.`);
      },
    });
  }
}
