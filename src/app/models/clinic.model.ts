export interface HospitalInfo {
  _id: string;
  name: string;
  urlPath: string;
  phoneNumber: string;
  email: string;
  logoUrl?: string | null;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  services?: string[];
  specialties?: string[];
  operatingHours?: string;
  description?: string;
  isActive?: boolean;
}

export interface Department {
  _id: string;
  name: string;
  description?: string;
  icon?: string;
  imageUrl?: string | null;
  hospitalId: string;
  doctorCount?: number;
  isActive?: boolean;
}

export interface Doctor {
  _id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  department: string;
  departmentId?: {
    _id: string;
    name: string;
    icon?: string;
  } | string;
  specialization?: string;
  hospitalId: string;
  imageUrl?: string | null;
}

export type AppointmentStatus =
  | 'Pending'
  | 'Confirmed'
  | 'Visiting'
  | 'Visited'
  | 'Cancelled'
  | 'Scheduled'
  | 'Completed';

export interface Appointment {
  _id: string;
  patientName: string;
  phoneNumber: string;
  email: string;
  strDeviceId?: string;
  hospitalId?: string;
  hospitalName: string;
  department?: string;
  departmentId?: string;
  doctorId?: string;
  doctorName?: string;
  appointmentDate: string;
  appointmentTime: string;
  status: AppointmentStatus;
  reason?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateAppointmentPayload {
  patientName: string;
  phoneNumber: string;
  email: string;
  urlPath: string;
  hospitalId?: string;
  department?: string;
  departmentId?: string;
  doctorId?: string;
  strDeviceId?: string;
  appointmentDate: string;
  appointmentTime: string;
  reason?: string;
}

export interface ApiResponse<T> {
  message?: string;
  count?: number;
  data?: T;
  records?: T;
  userType?: 'guest' | 'authenticated';
  hospital?: {
    _id: string;
    name: string;
    urlPath: string;
  };
}

export interface AuthUser {
  email: string;
  name?: string;
  phoneNumber?: string;
}
