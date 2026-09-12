import { Routes } from '@angular/router';
import { ClinicDirectoryComponent } from './pages/clinic-directory/clinic-directory.component';
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
    component: ClinicHomeComponent,
    title: 'Welcome | Healthcare Portal',
  },
  {
    path: ':urlPath/departments',
    component: DepartmentListComponent,
    title: 'Departments | Healthcare Portal',
  },
  {
    path: ':urlPath/doctors',
    component: DoctorListComponent,
    title: 'Doctors & Booking | Healthcare Portal',
  },
  {
    path: ':urlPath/appointments',
    component: PatientAppointmentsComponent,
    title: 'My Appointments | Healthcare Portal',
  },
  {
    path: '**',
    redirectTo: '',
  },
];
