import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ClinicService } from '../../services/clinic.service';
import { HospitalInfo, Doctor, Department, Appointment } from '../../models/clinic.model';
import { BookingSheetComponent } from '../../components/booking-sheet/booking-sheet.component';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-doctor-list',
  standalone: true,
  imports: [CommonModule, RouterLink, BookingSheetComponent],
  templateUrl: './doctor-list.component.html',
})
export class DoctorListComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly clinicService = inject(ClinicService);
  readonly apiUrl = environment.apiUrl;

  readonly urlPath = signal<string>('');
  readonly hospital = signal<HospitalInfo | null>(null);
  readonly doctors = signal<Doctor[]>([]);
  readonly activeDepartmentId = signal<string | null>(null);
  readonly activeDepartmentName = signal<string | null>(null);
  readonly isLoading = signal<boolean>(true);
  readonly errorMessage = signal<string | null>(null);

  // Bottom Sheet Booking Trigger
  readonly isSheetOpen = signal<boolean>(false);
  readonly selectedDoctor = signal<Doctor | null>(null);
  readonly selectedDepartment = signal<Department | null>(null);

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      const path = params['urlPath'];
      if (path) {
        this.urlPath.set(path);

        this.route.queryParams.subscribe((qParams) => {
          this.activeDepartmentId.set(qParams['departmentId'] || null);
          this.activeDepartmentName.set(qParams['department'] || null);
          this.loadData(path, this.activeDepartmentId(), this.activeDepartmentName());
        });
      }
    });
  }

  loadData(path: string, deptId: string | null, deptName: string | null): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.clinicService.getClinicByUrlPath(path).subscribe({
      next: (res) => {
        if (res.data) {
          this.hospital.set(res.data);
          this.clinicService.getDoctors(path, deptId || undefined, deptName || undefined).subscribe({
            next: (docRes) => {
              this.isLoading.set(false);
              this.doctors.set(docRes.data || []);
            },
            error: () => {
              this.isLoading.set(false);
            },
          });
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Could not load doctors.');
      },
    });
  }

  clearDepartmentFilter(): void {
    this.router.navigate(['/', this.urlPath(), 'doctors']);
  }

  openBooking(doc: Doctor | null): void {
    this.selectedDoctor.set(doc);

    if (doc && doc.department) {
      this.selectedDepartment.set({
        _id: typeof doc.departmentId === 'string' ? doc.departmentId : (doc.departmentId?._id || ''),
        name: doc.department,
        hospitalId: this.hospital()?._id || '',
      });
    } else if (this.activeDepartmentName()) {
      this.selectedDepartment.set({
        _id: this.activeDepartmentId() || '',
        name: this.activeDepartmentName()!,
        hospitalId: this.hospital()?._id || '',
      });
    } else {
      this.selectedDepartment.set(null);
    }

    this.isSheetOpen.set(true);
  }

  closeBooking(): void {
    this.isSheetOpen.set(false);
    this.selectedDoctor.set(null);
  }

  onAppointmentBooked(apt: Appointment): void {
    // Kept in sheet for confirmation receipt
  }
}
