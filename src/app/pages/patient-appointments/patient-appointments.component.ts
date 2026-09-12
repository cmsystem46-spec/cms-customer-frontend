import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ClinicService } from '../../services/clinic.service';
import { HospitalInfo } from '../../models/clinic.model';
import { AppointmentHistoryComponent } from '../../components/appointment-history/appointment-history.component';
import { AuthModalComponent } from '../../components/auth-modal/auth-modal.component';

@Component({
  selector: 'app-patient-appointments',
  standalone: true,
  imports: [CommonModule, RouterLink, AppointmentHistoryComponent, AuthModalComponent],
  templateUrl: './patient-appointments.component.html',
})
export class PatientAppointmentsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly clinicService = inject(ClinicService);

  readonly urlPath = signal<string>('');
  readonly hospital = signal<HospitalInfo | null>(null);
  readonly showAuthModal = signal<boolean>(false);

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      const path = params['urlPath'];
      if (path) {
        this.urlPath.set(path);
        this.clinicService.getClinicByUrlPath(path).subscribe({
          next: (res) => {
            if (res.data) {
              this.hospital.set(res.data);
            }
          },
        });
      }
    });
  }

  goToBooking(): void {
    this.router.navigate(['/', this.urlPath(), 'departments']);
  }
}
