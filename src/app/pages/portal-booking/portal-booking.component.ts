import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ClinicService } from '../../services/clinic.service';
import { AppointmentService } from '../../services/appointment.service';
import { AuthService } from '../../services/auth.service';
import { DeviceService } from '../../services/device.service';
import { HospitalInfo, Department, Doctor, Appointment } from '../../models/clinic.model';
import { AuthModalComponent } from '../../components/auth-modal/auth-modal.component';
import { AppointmentHistoryComponent } from '../../components/appointment-history/appointment-history.component';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-portal-booking',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    AuthModalComponent,
    AppointmentHistoryComponent,
  ],
  templateUrl: './portal-booking.component.html',
  styleUrl: './portal-booking.component.css',
})
export class PortalBookingComponent implements OnInit {
  readonly apiUrl = environment.apiUrl;
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly clinicService = inject(ClinicService);
  private readonly appointmentService = inject(AppointmentService);
  readonly authService = inject(AuthService);
  readonly deviceService = inject(DeviceService);

  // Clinic & Routing
  readonly urlPath = signal<string>('');
  readonly hospital = signal<HospitalInfo | null>(null);
  readonly isLoadingHospital = signal<boolean>(true);
  readonly hospitalError = signal<string | null>(null);

  // Active View Tab: 'BOOK' or 'HISTORY'
  readonly activeTab = signal<'BOOK' | 'HISTORY'>('BOOK');

  // Step 1: Departments
  readonly departments = signal<Department[]>([]);
  readonly selectedDepartment = signal<Department | null>(null);
  readonly isLoadingDepartments = signal<boolean>(false);

  // Step 2: Doctors
  readonly doctors = signal<Doctor[]>([]);
  readonly selectedDoctor = signal<Doctor | null>(null);
  readonly isLoadingDoctors = signal<boolean>(false);

  // Step 3: Booking Form & Slots
  bookingForm!: FormGroup;
  readonly availableTimeSlots: string[] = [
    '09:00 AM',
    '09:30 AM',
    '10:00 AM',
    '10:30 AM',
    '11:00 AM',
    '11:30 AM',
    '02:00 PM',
    '02:30 PM',
    '03:00 PM',
    '03:30 PM',
    '04:30 PM',
    '05:00 PM',
  ];

  readonly quickDates = signal<{ label: string; dateStr: string; dayName: string }[]>([]);
  readonly selectedDateStr = signal<string>('');
  readonly selectedTimeSlot = signal<string>('10:00 AM');

  // Submission State
  readonly isSubmitting = signal<boolean>(false);
  readonly bookingError = signal<string | null>(null);
  readonly confirmedAppointment = signal<Appointment | null>(null);
  readonly showSuccessModal = signal<boolean>(false);

  // Auth Modal State
  readonly showAuthModal = signal<boolean>(false);

  ngOnInit(): void {
    this.initQuickDates();
    this.initForm();

    // Listen to URL path parameter
    this.route.params.subscribe((params) => {
      const path = params['urlPath'];
      if (path) {
        this.urlPath.set(path);
        this.loadClinicData(path);
      } else {
        this.urlPath.set('city-care-hospital');
        this.loadClinicData('city-care-hospital');
      }
    });
  }

  private initForm(): void {
    const defaultDate = this.quickDates().length > 0 ? this.quickDates()[0].dateStr : '';
    this.selectedDateStr.set(defaultDate);

    const currentUser = this.authService.user();

    this.bookingForm = this.fb.group({
      patientName: ['', [Validators.required, Validators.minLength(2)]],
      phoneNumber: [
        currentUser?.phoneNumber || '',
        [Validators.required, Validators.pattern(/^[0-9+ ]{8,15}$/)],
      ],
      email: [
        currentUser?.email || '',
        [Validators.required, Validators.email],
      ],
      appointmentDate: [defaultDate, Validators.required],
      appointmentTime: [this.selectedTimeSlot(), Validators.required],
      reason: [''],
    });

    if (currentUser?.email) {
      this.bookingForm.patchValue({ email: currentUser.email });
    }
  }

  private initQuickDates(): void {
    const dates = [];
    const today = new Date();

    for (let i = 0; i < 6; i++) {
      const d = new Date();
      d.setDate(today.getDate() + i);

      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      let label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      let dayName = d.toLocaleDateString('en-US', { weekday: 'short' });

      if (i === 0) dayName = 'Today';
      if (i === 1) dayName = 'Tomorrow';

      dates.push({ label, dateStr, dayName });
    }

    this.quickDates.set(dates);
  }

  loadClinicData(path: string): void {
    this.isLoadingHospital.set(true);
    this.hospitalError.set(null);

    this.clinicService.getClinicByUrlPath(path).subscribe({
      next: (res) => {
        this.isLoadingHospital.set(false);
        if (res.data) {
          this.hospital.set(res.data);
          // Load departments for this hospital
          this.loadDepartments(path);
          // Load all doctors initially
          this.loadDoctors(path);
        } else {
          this.hospitalError.set('Clinic details could not be found.');
        }
      },
      error: (err) => {
        this.isLoadingHospital.set(false);
        this.hospitalError.set(
          err.error?.message ||
            `Clinic "${path}" was not found or is currently inactive. Please check the URL.`
        );
      },
    });
  }

  loadDepartments(path: string): void {
    this.isLoadingDepartments.set(true);
    this.clinicService.getDepartments(path).subscribe({
      next: (res) => {
        this.isLoadingDepartments.set(false);
        this.departments.set(res.data || []);
      },
      error: () => {
        this.isLoadingDepartments.set(false);
      },
    });
  }

  loadDoctors(path: string, departmentId?: string, departmentName?: string): void {
    this.isLoadingDoctors.set(true);
    this.clinicService.getDoctors(path, departmentId, departmentName).subscribe({
      next: (res) => {
        this.isLoadingDoctors.set(false);
        this.doctors.set(res.data || []);
      },
      error: () => {
        this.isLoadingDoctors.set(false);
      },
    });
  }

  // User actions
  selectDepartment(dept: Department | null): void {
    this.selectedDepartment.set(dept);
    this.selectedDoctor.set(null); // Reset doctor selection
    const path = this.urlPath();

    if (dept) {
      this.loadDoctors(path, dept._id, dept.name);
    } else {
      // All departments
      this.loadDoctors(path);
    }
  }

  selectDoctor(doc: Doctor | null): void {
    this.selectedDoctor.set(doc);
    if (doc && !this.selectedDepartment()) {
      // Find and select department if doc has one
      const deptName = typeof doc.department === 'string' ? doc.department : '';
      const matched = this.departments().find((d) => d.name.toLowerCase() === deptName.toLowerCase());
      if (matched) {
        this.selectedDepartment.set(matched);
      }
    }
  }

  selectDate(dateStr: string): void {
    this.selectedDateStr.set(dateStr);
    this.bookingForm.patchValue({ appointmentDate: dateStr });
  }

  selectSlot(slot: string): void {
    this.selectedTimeSlot.set(slot);
    this.bookingForm.patchValue({ appointmentTime: slot });
  }

  openAuthModal(): void {
    this.showAuthModal.set(true);
  }

  closeAuthModal(): void {
    this.showAuthModal.set(false);
  }

  onUserAuthenticated(): void {
    const user = this.authService.user();
    if (user?.email && this.bookingForm) {
      this.bookingForm.patchValue({ email: user.email });
    }
  }

  bookAppointment(): void {
    if (this.bookingForm.invalid) {
      this.bookingForm.markAllAsTouched();
      this.bookingError.set('Please fill in all required fields (Name, Mobile Number, and Email).');
      return;
    }

    const hospitalData = this.hospital();
    if (!hospitalData) {
      this.bookingError.set('Clinic information is not loaded.');
      return;
    }

    const formValues = this.bookingForm.value;
    const doc = this.selectedDoctor();
    const dept = this.selectedDepartment();
    const deviceId = this.deviceService.getDeviceId();

    this.isSubmitting.set(true);
    this.bookingError.set(null);

    const payload = {
      patientName: formValues.patientName.trim(),
      phoneNumber: formValues.phoneNumber.trim(),
      email: formValues.email.trim().toLowerCase(),
      urlPath: this.urlPath(),
      hospitalId: hospitalData._id,
      department: dept ? dept.name : doc?.department || 'General Medicine',
      departmentId: dept ? dept._id : typeof doc?.departmentId === 'string' ? doc.departmentId : doc?.departmentId?._id,
      doctorId: doc ? doc._id : undefined,
      strDeviceId: deviceId,
      appointmentDate: formValues.appointmentDate,
      appointmentTime: formValues.appointmentTime || this.selectedTimeSlot(),
      reason: formValues.reason ? formValues.reason.trim() : undefined,
    };

    this.appointmentService.createAppointment(payload).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        if (res.data) {
          this.confirmedAppointment.set(res.data);
          this.showSuccessModal.set(true);
        }
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.bookingError.set(
          err.error?.message ||
            'Could not complete appointment booking. Please verify the information and try again.'
        );
      },
    });
  }

  viewInHistory(): void {
    this.showSuccessModal.set(false);
    this.activeTab.set('HISTORY');
  }

  bookAnother(): void {
    this.showSuccessModal.set(false);
    this.confirmedAppointment.set(null);
    this.bookingForm.reset({
      appointmentDate: this.selectedDateStr(),
      appointmentTime: this.selectedTimeSlot(),
      email: this.authService.user()?.email || '',
    });
  }

  getDepartmentIcon(iconName?: string): string {
    const map: Record<string, string> = {
      heart: '❤️',
      cardiology: '🫀',
      stethoscope: '🩺',
      pediatrics: '👶',
      neurology: '🧠',
      orthopedics: '🦴',
      dermatology: '🧴',
      general: '🏥',
      dental: '🦷',
      eye: '👁️',
    };
    if (!iconName) return '🩺';
    return map[iconName.toLowerCase()] || '🩺';
  }
}
