import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AppointmentService } from '../../services/appointment.service';
import { AuthService } from '../../services/auth.service';
import { DeviceService } from '../../services/device.service';
import { ClinicService } from '../../services/clinic.service';
import { HospitalInfo, Department, Doctor, Appointment, DoctorTokenSlot } from '../../models/clinic.model';
import { getMediaUrl } from '../../utils/media.util';

@Component({
  selector: 'app-booking-sheet',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './booking-sheet.component.html',
  styleUrl: './booking-sheet.component.css',
})
export class BookingSheetComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly appointmentService = inject(AppointmentService);
  private readonly clinicService = inject(ClinicService);
  readonly authService = inject(AuthService);
  private readonly deviceService = inject(DeviceService);
  readonly getImageUrl = getMediaUrl;

  @Input({ required: true }) hospital!: HospitalInfo;
  @Input() doctor: Doctor | null = null;
  @Input() department: Department | null = null;
  @Input() urlPath: string = '';

  @Output() close = new EventEmitter<void>();
  @Output() appointmentBooked = new EventEmitter<Appointment>();

  // State
  bookingForm!: FormGroup;
  readonly isSubmitting = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly confirmedAppointment = signal<Appointment | null>(null);

  // Sign-in / OTP Flow within sheet
  readonly authChoice = signal<'UNDECIDED' | 'WANTS_AUTH' | 'GUEST'>('UNDECIDED');
  readonly otpStep = signal<'NONE' | 'INPUT_EMAIL' | 'INPUT_OTP' | 'VERIFIED'>('NONE');
  readonly otpCode = signal<string>('');
  readonly isSendingOtp = signal<boolean>(false);
  readonly isVerifyingOtp = signal<boolean>(false);
  readonly otpMessage = signal<string | null>(null);
  readonly otpError = signal<string | null>(null);

  // Doctor Token Schedule (Tokens allotted with times)
  readonly tokenSlots = signal<DoctorTokenSlot[]>([]);
  readonly isLoadingTokens = signal<boolean>(false);
  readonly selectedTokenNumber = signal<number | null>(null);

  // Fallback Time slots for General Consultation (when no specific doctor is selected)
  readonly generalTimeSlots: string[] = [
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
  readonly selectedTimeSlot = signal<string>('09:00 AM');

  readonly isWorkingHoursEndedToday = signal<boolean>(false);
  readonly tokenScheduleMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.initQuickDates();
    this.initForm();

    // Check if already authenticated
    if (this.authService.isAuthenticated()) {
      this.authChoice.set('WANTS_AUTH');
      this.otpStep.set('VERIFIED');
    }

    // Load initial tokens if doctor is chosen
    if (this.doctor) {
      this.loadDoctorTokens(this.selectedDateStr());
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

      dates.push({ label, dateStr, dayName, isPast: false });
    }

    this.quickDates.set(dates);

    // If doctor's working hours ended today, automatically default selection to Tomorrow
    if (this.doctor?.isWorkingHoursEnded && dates.length > 1) {
      this.selectedDateStr.set(dates[1].dateStr);
      this.isWorkingHoursEndedToday.set(true);
    } else if (dates.length > 0) {
      this.selectedDateStr.set(dates[0].dateStr);
    }
  }

  private initForm(): void {
    const currentUser = this.authService.user();
    const defaultDate = this.selectedDateStr();

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
      tokenNumber: [null],
      reason: [''],
    });
  }

  loadDoctorTokens(dateStr: string): void {
    if (!this.doctor?._id) return;

    this.isLoadingTokens.set(true);
    this.tokenScheduleMessage.set(null);
    const path = this.urlPath || this.hospital.urlPath;

    this.clinicService.getDoctorTokenSchedule(path, this.doctor._id, dateStr).subscribe({
      next: (res) => {
        this.isLoadingTokens.set(false);
        const slots = res.tokens || [];
        this.tokenSlots.set(slots);

        if (res.workingHoursEnded) {
          this.isWorkingHoursEndedToday.set(true);
          this.tokenScheduleMessage.set(res.message || 'Doctor working hours have ended for today. Please choose tomorrow or another date.');
          this.selectedTokenNumber.set(null);

          // If currently selected date is today and doctor hours ended, prompt or auto-switch to tomorrow
          const dates = this.quickDates();
          if (dates.length > 1 && this.selectedDateStr() === dates[0].dateStr) {
            // Automatically switch to tomorrow to show available booking slots
            this.selectDate(dates[1].dateStr);
          }
          return;
        }

        // Auto-select first available token
        const firstAvailable = slots.find((s: DoctorTokenSlot) => !s.isBooked && !s.isPast);
        if (firstAvailable) {
          this.selectToken(firstAvailable);
        } else {
          this.selectedTokenNumber.set(null);
        }
      },
      error: () => {
        this.isLoadingTokens.set(false);
        this.tokenSlots.set([]);
        this.selectedTokenNumber.set(null);
      },
    });
  }

  selectDate(dateStr: string): void {
    this.selectedDateStr.set(dateStr);
    this.bookingForm.patchValue({ appointmentDate: dateStr });
    if (this.doctor) {
      this.loadDoctorTokens(dateStr);
    }
  }

  selectToken(slot: DoctorTokenSlot): void {
    if (slot.isBooked || slot.isPast) return;
    this.selectedTokenNumber.set(slot.tokenNumber);
    this.selectedTimeSlot.set(slot.allottedTime);
    this.bookingForm.patchValue({
      tokenNumber: slot.tokenNumber,
      appointmentTime: slot.allottedTime,
    });
  }

  selectGeneralSlot(slot: string): void {
    this.selectedTimeSlot.set(slot);
    this.bookingForm.patchValue({ appointmentTime: slot });
  }

  // Auth Choice Handlers
  chooseSignIn(): void {
    this.authChoice.set('WANTS_AUTH');
    const emailVal = this.bookingForm.get('email')?.value;
    if (emailVal && emailVal.includes('@')) {
      this.requestOtp(emailVal);
    } else {
      this.otpStep.set('INPUT_EMAIL');
    }
  }

  chooseGuest(): void {
    this.authChoice.set('GUEST');
    this.otpStep.set('NONE');
  }

  requestOtp(emailToSend?: string): void {
    const emailVal = (emailToSend || this.bookingForm.get('email')?.value || '').trim();
    if (!emailVal || !emailVal.includes('@')) {
      this.otpError.set('Please enter a valid email address first.');
      return;
    }

    this.isSendingOtp.set(true);
    this.otpError.set(null);
    this.otpMessage.set(null);

    this.authService.sendOtp(emailVal).subscribe({
      next: (res) => {
        this.isSendingOtp.set(false);
        this.otpStep.set('INPUT_OTP');
        this.otpMessage.set(res.message || '6-digit verification code sent to your email.');
      },
      error: (err) => {
        this.isSendingOtp.set(false);
        this.otpError.set(err.error?.message || 'Failed to send verification email. Please check email address.');
      },
    });
  }

  verifyOtpCode(): void {
    const emailVal = (this.bookingForm.get('email')?.value || '').trim();
    const code = this.otpCode().trim();

    if (!code || code.length < 4) {
      this.otpError.set('Please enter the 6-digit verification code.');
      return;
    }

    this.isVerifyingOtp.set(true);
    this.otpError.set(null);

    this.authService.verifyOtp(emailVal, code).subscribe({
      next: () => {
        this.isVerifyingOtp.set(false);
        this.otpStep.set('VERIFIED');
        this.otpMessage.set('Email verified! Your full appointment history will be linked.');
      },
      error: (err) => {
        this.isVerifyingOtp.set(false);
        this.otpError.set(err.error?.message || 'Invalid or expired code. Please try again.');
      },
    });
  }

  // Final Booking Submission
  confirmBooking(): void {
    if (this.bookingForm.invalid) {
      this.bookingForm.markAllAsTouched();
      this.errorMessage.set('Please complete all required fields (Name, Phone Number, and Email).');
      return;
    }

    const formValues = this.bookingForm.value;
    const deviceId = this.deviceService.getDeviceId();

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const doc = this.doctor;
    const dept = this.department;

    const payload = {
      patientName: formValues.patientName.trim(),
      phoneNumber: formValues.phoneNumber.trim(),
      email: formValues.email.trim().toLowerCase(),
      urlPath: this.urlPath || this.hospital.urlPath,
      hospitalId: this.hospital._id,
      department: dept ? dept.name : doc?.department || 'General Medicine',
      departmentId: dept ? dept._id : typeof doc?.departmentId === 'string' ? doc.departmentId : doc?.departmentId?._id,
      doctorId: doc ? doc._id : undefined,
      tokenNumber: this.selectedTokenNumber() || undefined,
      strDeviceId: deviceId,
      appointmentDate: formValues.appointmentDate || this.selectedDateStr(),
      appointmentTime: formValues.appointmentTime || this.selectedTimeSlot(),
      reason: formValues.reason ? formValues.reason.trim() : undefined,
    };

    this.appointmentService.createAppointment(payload).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        if (res.data) {
          this.confirmedAppointment.set(res.data);
          this.appointmentBooked.emit(res.data);
        }
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(
          err.error?.message || 'Failed to schedule appointment. Please review your details.'
        );
      },
    });
  }

  goToAppointments(): void {
    this.close.emit();
    this.router.navigate(['/', this.urlPath || this.hospital.urlPath, 'appointments']);
  }
}
