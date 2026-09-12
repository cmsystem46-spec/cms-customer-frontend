import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ClinicService } from '../../services/clinic.service';
import { AuthService } from '../../services/auth.service';
import { DeviceService } from '../../services/device.service';
import { HospitalInfo } from '../../models/clinic.model';
import { environment } from '../../../environments/environment';
import { getMediaUrl } from '../../utils/media.util';

@Component({
  selector: 'app-customer-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './customer-layout.component.html',
  styleUrl: './customer-layout.component.scss',
})
export class CustomerLayoutComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly clinicService = inject(ClinicService);
  readonly authService = inject(AuthService);
  readonly deviceService = inject(DeviceService);
  readonly apiUrl = environment.apiUrl;

  readonly urlPath = signal<string>('');
  readonly hospital = signal<HospitalInfo | null>(null);
  readonly isSidebarCollapsed = signal<boolean>(false);
  readonly isMobileMenuOpen = signal<boolean>(false);
  readonly logoFailed = signal<boolean>(false);
  readonly isLoading = signal<boolean>(true);

  readonly hospitalName = computed(() => this.hospital()?.name || 'Healthcare Clinic');
  readonly hospitalEmail = computed(() => this.hospital()?.email || 'contact@clinic.com');
  readonly hospitalCity = computed(() => this.hospital()?.city || 'Portal');

  readonly hospitalLogo = computed(() => {
    if (this.logoFailed()) return null;
    const raw = this.hospital()?.logoUrl;
    return raw ? getMediaUrl(raw) : null;
  });

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      const path = params['urlPath'];
      if (path && path !== this.urlPath()) {
        this.urlPath.set(path);
        this.loadClinic(path);
      }
    });
  }

  loadClinic(path: string): void {
    this.isLoading.set(true);
    this.clinicService.getClinicByUrlPath(path).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.data) {
          this.hospital.set(res.data);
        }
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  toggleCollapse(): void {
    this.isSidebarCollapsed.update((v) => !v);
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen.update((v) => !v);
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen.set(false);
  }
}
