import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ClinicService } from '../../services/clinic.service';
import { AuthService } from '../../services/auth.service';
import { AppointmentService } from '../../services/appointment.service';
import { DeviceService } from '../../services/device.service';
import { HospitalInfo, Appointment, DoctorLiveStatus, Doctor } from '../../models/clinic.model';
import { environment } from '../../../environments/environment';
import { getMediaUrl } from '../../utils/media.util';

export interface ActiveAppointmentQueueStatus {
  appointment: Appointment;
  liveStatus: DoctorLiveStatus | null;
  isDoctorVisiting: boolean;
  doctorConsultationStatus?: 'online' | 'offline' | 'break';
  currentVisitingToken?: number | null;
  currentVisitingPatient?: string | null;
  queueAheadCount?: number;
  isUserNext: boolean;
  isUserVisitingNow: boolean;
}

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
  private readonly appointmentService = inject(AppointmentService);
  readonly authService = inject(AuthService);
  private readonly deviceService = inject(DeviceService);
  readonly apiUrl = environment.apiUrl;
  readonly getImageUrl = getMediaUrl;

  readonly urlPath = signal<string>('');
  readonly hospital = signal<HospitalInfo | null>(null);
  readonly isLoading = signal<boolean>(true);
  readonly errorMessage = signal<string | null>(null);

  // Active User Consultations & Doctor Live Status
  readonly userAppointments = signal<Appointment[]>([]);
  readonly activeConsultations = signal<ActiveAppointmentQueueStatus[]>([]);
  readonly isCheckingAppointments = signal<boolean>(false);

  // Modal Tracker for Selected Consultation
  readonly isQueueModalOpen = signal<boolean>(false);
  readonly trackingAppointment = signal<Appointment | null>(null);
  readonly trackingLiveStatus = signal<DoctorLiveStatus | null>(null);
  readonly isLiveLoading = signal<boolean>(false);

  ngOnInit(): void {
    this.route.parent?.params.subscribe((parentParams) => {
      const path = parentParams['urlPath'] || this.route.snapshot.params['urlPath'];
      if (path) {
        this.urlPath.set(path);
        this.loadHospital(path);
      }
    });

    this.route.params.subscribe((params) => {
      const path = params['urlPath'];
      if (path && path !== this.urlPath()) {
        this.urlPath.set(path);
        this.loadHospital(path);
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
          this.checkUserAppointments(res.data._id);
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

  /**
   * Checks if current visitor (guest or authenticated) has an active upcoming appointment
   * with this clinic, and fetches real-time doctor live queue & in-room status.
   */
  checkUserAppointments(hospitalId: string): void {
    this.isCheckingAppointments.set(true);

    const currentUser = this.authService.user();
    const strDeviceId = this.deviceService.getDeviceId();

    const queryFilters: {
      strDeviceId?: string;
      email?: string;
      phoneNumber?: string;
      hospitalId?: string;
    } = {
      hospitalId,
    };

    if (currentUser && currentUser.email) {
      queryFilters.email = currentUser.email;
    } else if (currentUser && currentUser.phoneNumber) {
      queryFilters.phoneNumber = currentUser.phoneNumber;
    } else {
      queryFilters.strDeviceId = strDeviceId;
    }

    this.appointmentService.getAppointments(queryFilters).subscribe({
      next: (res) => {
        this.isCheckingAppointments.set(false);
        const allList: Appointment[] = res.data || [];
        this.userAppointments.set(allList);

        // Filter active upcoming appointments for today or scheduled
        const activeUpcoming = allList.filter((a) =>
          a.status === 'Pending' || a.status === 'Confirmed' || a.status === 'Scheduled' || a.status === 'Visiting'
        );

        if (activeUpcoming.length === 0) {
          this.activeConsultations.set([]);
          return;
        }

        // For each active appointment with a doctorId, fetch doctor live status
        this.enrichWithDoctorLiveStatus(activeUpcoming);
      },
      error: () => {
        this.isCheckingAppointments.set(false);
        this.activeConsultations.set([]);
      },
    });
  }

  private enrichWithDoctorLiveStatus(appointments: Appointment[]): void {
    const enrichedList: ActiveAppointmentQueueStatus[] = [];

    const identifiers = {
      email: this.authService.user()?.email,
      phoneNumber: this.authService.user()?.phoneNumber,
      strDeviceId: this.deviceService.getDeviceId(),
    };

    let completedFetches = 0;

    appointments.forEach((apt) => {
      const doctorId = typeof apt.doctorId === 'object' && apt.doctorId ? (apt.doctorId as any)._id : apt.doctorId;

      if (!doctorId) {
        // General appointment without doctor
        enrichedList.push({
          appointment: apt,
          liveStatus: null,
          isDoctorVisiting: false,
          currentVisitingToken: apt.currentVisitingToken || null,
          currentVisitingPatient: apt.currentVisitingPatient || null,
          queueAheadCount: apt.queueAheadCount || 0,
          isUserNext: (apt.queueAheadCount || 0) === 0 && apt.status !== 'Visiting',
          isUserVisitingNow: apt.status === 'Visiting',
        });
        completedFetches++;
        if (completedFetches === appointments.length) {
          this.activeConsultations.set(enrichedList);
        }
        return;
      }

      this.clinicService.getDoctorLiveStatus(this.urlPath(), doctorId, identifiers).subscribe({
        next: (live) => {
          completedFetches++;
          const currentPat = live?.currentPatient;
          const isVisiting = !!currentPat;
          const visitingToken = currentPat?.tokenNumber || apt.currentVisitingToken || null;
          const visitingPatient = currentPat?.patientName || apt.currentVisitingPatient || null;

          const isUserVisitingNow = apt.status === 'Visiting' ||
            (!!visitingToken && !!apt.tokenNumber && visitingToken === apt.tokenNumber);

          const queueAhead = apt.queueAheadCount !== undefined ? apt.queueAheadCount : (live?.totalInQueue || 0);
          const isUserNext = !isUserVisitingNow && (queueAhead === 0 || (visitingToken && apt.tokenNumber && apt.tokenNumber === visitingToken + 1));

          const docStatus = live?.doctor?.consultationStatus || 'offline';

          enrichedList.push({
            appointment: apt,
            liveStatus: live,
            isDoctorVisiting: isVisiting,
            doctorConsultationStatus: docStatus,
            currentVisitingToken: visitingToken,
            currentVisitingPatient: visitingPatient,
            queueAheadCount: queueAhead,
            isUserNext: !!isUserNext,
            isUserVisitingNow: !!isUserVisitingNow,
          });

          if (completedFetches === appointments.length) {
            this.activeConsultations.set(enrichedList);
          }
        },
        error: () => {
          completedFetches++;
          enrichedList.push({
            appointment: apt,
            liveStatus: null,
            isDoctorVisiting: !!apt.currentVisitingToken,
            doctorConsultationStatus: 'offline',
            currentVisitingToken: apt.currentVisitingToken || null,
            currentVisitingPatient: apt.currentVisitingPatient || null,
            queueAheadCount: apt.queueAheadCount || 0,
            isUserNext: (apt.queueAheadCount || 0) === 0 && apt.status !== 'Visiting',
            isUserVisitingNow: apt.status === 'Visiting',
          });

          if (completedFetches === appointments.length) {
            this.activeConsultations.set(enrichedList);
          }
        },
      });
    });
  }

  // Open live tracker modal for appointment
  openLiveTracker(item: ActiveAppointmentQueueStatus): void {
    this.trackingAppointment.set(item.appointment);
    this.trackingLiveStatus.set(item.liveStatus);
    this.isQueueModalOpen.set(true);

    const docId = typeof item.appointment.doctorId === 'object' && item.appointment.doctorId
      ? (item.appointment.doctorId as any)._id
      : item.appointment.doctorId;

    if (docId) {
      this.isLiveLoading.set(true);
      const identifiers = {
        email: this.authService.user()?.email,
        phoneNumber: this.authService.user()?.phoneNumber,
        strDeviceId: this.deviceService.getDeviceId(),
      };
      this.clinicService.getDoctorLiveStatus(this.urlPath(), docId, identifiers).subscribe({
        next: (status) => {
          this.isLiveLoading.set(false);
          this.trackingLiveStatus.set(status);
        },
        error: () => {
          this.isLiveLoading.set(false);
        },
      });
    }
  }

  closeLiveTracker(): void {
    this.isQueueModalOpen.set(false);
    this.trackingAppointment.set(null);
    this.trackingLiveStatus.set(null);
  }

  refreshQueue(): void {
    if (this.hospital()) {
      this.checkUserAppointments(this.hospital()!._id);
    }
  }
}
