import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ClinicService } from '../../services/clinic.service';
import { HospitalInfo } from '../../models/clinic.model';

@Component({
  selector: 'app-clinic-directory',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './clinic-directory.component.html',
})
export class ClinicDirectoryComponent implements OnInit {
  private readonly clinicService = inject(ClinicService);
  private readonly router = inject(Router);

  readonly clinics = signal<HospitalInfo[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.clinicService.getAllClinics().subscribe({
      next: (res) => {
        this.isLoading.set(false);
        const list = res.data || [];
        this.clinics.set(list);

        // If city-care-hospital is active or only 1 clinic, direct immediately
        const primary = list.find((c) => c.urlPath === 'city-care-hospital') || list[0];
        if (primary && primary.urlPath) {
          this.router.navigate(['/', primary.urlPath]);
        }
      },
      error: () => {
        this.isLoading.set(false);
        // Fallback directly to city-care-hospital
        this.router.navigate(['/city-care-hospital']);
      },
    });
  }
}
