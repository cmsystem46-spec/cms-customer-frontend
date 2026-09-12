import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ClinicService } from '../../services/clinic.service';
import { HospitalInfo, Department } from '../../models/clinic.model';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-department-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './department-list.component.html',
})
export class DepartmentListComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  readonly router = inject(Router);
  private readonly clinicService = inject(ClinicService);
  readonly apiUrl = environment.apiUrl;

  readonly urlPath = signal<string>('');
  readonly hospital = signal<HospitalInfo | null>(null);
  readonly departments = signal<Department[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.route.parent?.params.subscribe((parentParams) => {
      const path = parentParams['urlPath'] || this.route.snapshot.params['urlPath'];
      if (path) {
        this.urlPath.set(path);
        this.loadData(path);
      }
    });

    this.route.params.subscribe((params) => {
      const path = params['urlPath'];
      if (path && path !== this.urlPath()) {
        this.urlPath.set(path);
        this.loadData(path);
      }
    });
  }

  loadData(path: string): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.clinicService.getClinicByUrlPath(path).subscribe({
      next: (res) => {
        if (res.data) {
          this.hospital.set(res.data);
          this.clinicService.getDepartments(path).subscribe({
            next: (depRes) => {
              this.isLoading.set(false);
              this.departments.set(depRes.data || []);
            },
            error: () => {
              this.isLoading.set(false);
            },
          });
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Could not load departments.');
      },
    });
  }

  selectDepartment(dept: Department): void {
    this.router.navigate(['/', this.urlPath(), 'doctors'], {
      queryParams: {
        departmentId: dept._id,
        department: dept.name,
      },
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
