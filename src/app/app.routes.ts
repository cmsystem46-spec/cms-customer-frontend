import { Routes } from '@angular/router';
import { ClinicDirectoryComponent } from './pages/clinic-directory/clinic-directory.component';
import { CustomerLayoutComponent } from './layouts/customer-layout/customer-layout.component';
import { ClinicHomeComponent } from './pages/clinic-home/clinic-home.component';
import { DepartmentListComponent } from './pages/department-list/department-list.component';
import { DoctorListComponent } from './pages/doctor-list/doctor-list.component';
import { PatientAppointmentsComponent } from './pages/patient-appointments/patient-appointments.component';

export const routes: Routes = [
  {
    path: '',
    component: ClinicDirectoryComponent,
    pathMatch: 'full',
    title: 'Select Hospital | Healthcare Portal',
  },
  {
    path: ':urlPath',
    component: CustomerLayoutComponent,
    children: [
      {
        path: '',
        component: ClinicHomeComponent,
        title: 'Facility Overview | Healthcare Portal',
      },
      {
        path: 'departments',
        component: DepartmentListComponent,
        title: 'Departments | Healthcare Portal',
      },
      {
        path: 'doctors',
        component: DoctorListComponent,
        title: 'Doctors & Live Queue | Healthcare Portal',
      },
      {
        path: 'appointments',
        component: PatientAppointmentsComponent,
        title: 'My Appointments & Tokens | Healthcare Portal',
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];

