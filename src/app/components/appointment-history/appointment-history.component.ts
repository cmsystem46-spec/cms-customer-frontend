import { Component, OnInit, inject, signal, computed, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppointmentService } from '../../services/appointment.service';
import { AuthService } from '../../services/auth.service';
import { DeviceService } from '../../services/device.service';
import { Appointment, AppointmentStatus } from '../../models/clinic.model';

@Component({
  selector: 'app-appointment-history',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './appointment-history.component.html',
})
export class AppointmentHistoryComponent implements OnInit {
  private readonly appointmentService = inject(AppointmentService);
  readonly authService = inject(AuthService);
  readonly deviceService = inject(DeviceService);

  @Input() hospitalId?: string;
  @Output() bookNew = new EventEmitter<void>();
  @Output() requestLogin = new EventEmitter<void>();

  // State
  readonly appointments = signal<Appointment[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly activeFilter = signal<'ALL' | 'UPCOMING' | 'VISITED' | 'CANCELLED'>('ALL');

  // Filtered appointments
  readonly filteredAppointments = computed(() => {
    const list = this.appointments();
    const filter = this.activeFilter();

    if (filter === 'ALL') return list;
    if (filter === 'UPCOMING') {
      return list.filter((a) => a.status === 'Pending' || a.status === 'Confirmed' || a.status === 'Scheduled' || a.status === 'Visiting');
    }
    if (filter === 'VISITED') {
      return list.filter((a) => a.status === 'Visited' || a.status === 'Completed');
    }
    if (filter === 'CANCELLED') {
      return list.filter((a) => a.status === 'Cancelled');
    }
    return list;
  });

  ngOnInit(): void {
    this.loadAppointments();
  }

  loadAppointments(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    const currentUser = this.authService.user();
    const strDeviceId = this.deviceService.getDeviceId();

    const queryFilters: {
      strDeviceId?: string;
      email?: string;
      phoneNumber?: string;
      hospitalId?: string;
    } = {
      hospitalId: this.hospitalId,
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
        this.isLoading.set(false);
        this.appointments.set(res.data || []);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Failed to load appointments.');
      },
    });
  }

  getStatusBadgeClass(status: AppointmentStatus | string): string {
    switch (status) {
      case 'Confirmed':
      case 'Scheduled':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200/60';
      case 'Visiting':
        return 'bg-blue-50 text-blue-700 border-blue-200/60 animate-pulse';
      case 'Visited':
      case 'Completed':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'Cancelled':
        return 'bg-rose-50 text-rose-700 border-rose-200/60';
      case 'Pending':
      default:
        return 'bg-amber-50 text-amber-700 border-amber-200/60';
    }
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  }
}
