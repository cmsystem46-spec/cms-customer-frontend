import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ClinicService } from '../../services/clinic.service';
import { AuthService } from '../../services/auth.service';
import { DeviceService } from '../../services/device.service';
import { HospitalInfo, Doctor, Department, Appointment, DoctorLiveStatus } from '../../models/clinic.model';
import { BookingSheetComponent } from '../../components/booking-sheet/booking-sheet.component';
import { environment } from '../../../environments/environment';
import { getMediaUrl } from '../../utils/media.util';

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
  private readonly authService = inject(AuthService);
  private readonly deviceService = inject(DeviceService);
  readonly apiUrl = environment.apiUrl;
  readonly getImageUrl = getMediaUrl;

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

  // Live Consultation Queue Modal
  readonly isQueueModalOpen = signal<boolean>(false);
  readonly liveDoctor = signal<Doctor | null>(null);
  readonly liveStatus = signal<DoctorLiveStatus | null>(null);
  readonly isLiveLoading = signal<boolean>(false);

  ngOnInit(): void {
    this.route.parent?.params.subscribe((parentParams) => {
      const path = parentParams['urlPath'] || this.route.snapshot.params['urlPath'];
      if (path) {
        this.urlPath.set(path);
        this.route.queryParams.subscribe((qParams) => {
          this.activeDepartmentId.set(qParams['departmentId'] || null);
          this.activeDepartmentName.set(qParams['department'] || null);
          this.loadData(path, this.activeDepartmentId(), this.activeDepartmentName());
        });
      }
    });

    // Also fallback check direct params
    this.route.params.subscribe((params) => {
      const path = params['urlPath'];
      if (path && path !== this.urlPath()) {
        this.urlPath.set(path);
        this.loadData(path, this.activeDepartmentId(), this.activeDepartmentName());
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
    // Re-fetch doctor status to update token counts
    this.loadData(this.urlPath(), this.activeDepartmentId(), this.activeDepartmentName());
  }

  // Live Consultation Queue Viewer
  openLiveQueue(doc: Doctor): void {
    this.liveDoctor.set(doc);
    this.isQueueModalOpen.set(true);
    this.isLiveLoading.set(true);

    const identifiers = {
      email: this.authService.user()?.email,
      strDeviceId: this.deviceService.getDeviceId(),
    };

    this.clinicService.getDoctorLiveStatus(this.urlPath(), doc._id, identifiers).subscribe({
      next: (status) => {
        this.isLiveLoading.set(false);
        this.liveStatus.set(status);
      },
      error: () => {
        this.isLiveLoading.set(false);
      },
    });
  }

  closeLiveQueue(): void {
    this.isQueueModalOpen.set(false);
    this.liveDoctor.set(null);
    this.liveStatus.set(null);
  }
}
