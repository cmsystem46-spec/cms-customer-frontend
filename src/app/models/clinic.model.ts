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
  maxTokensPerDay?: number;
  availableTime?: string;
  tokensIssuedToday?: number;
  tokensRemainingToday?: number;
  isTokenFull?: boolean;
  isWorkingHoursEnded?: boolean;
  consultationStatus?: 'online' | 'offline' | 'break';
  currentVisiting?: {
    patientName: string;
    tokenNumber?: number;
    appointmentTime?: string;
  } | null;
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
  hospitalId: string;
  hospitalName?: string;
  department: string;
  departmentId?: string;
  doctorId?: any;
  doctorName?: string;
  tokenNumber?: number;
  appointmentDate: string;
  appointmentTime: string;
  status: AppointmentStatus;
  reason?: string;
  strDeviceId?: string;
  queueAheadCount?: number;
  currentVisitingToken?: number;
  currentVisitingPatient?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DoctorLiveStatus {
  doctor: {
    _id: string;
    name: string;
    department: string;
    specialization?: string;
    imageUrl?: string | null;
    availableTime: string;
    consultationStatus?: 'online' | 'offline' | 'break';
    maxTokensPerDay: number;
    tokensIssuedToday: number;
    tokensRemainingToday: number;
    isTokenFull: boolean;
  };
  hospital: {
    _id: string;
    name: string;
    urlPath: string;
  };
  currentPatient: {
    patientName: string;
    tokenNumber?: number;
    appointmentTime?: string;
    status?: AppointmentStatus;
  } | null;
  totalInQueue: number;
  completedToday: number;
  upcomingPatients: {
    position: number;
    tokenNumber: number;
    patientName: string;
    appointmentTime?: string;
    status?: AppointmentStatus;
  }[];
  yourStatus?: {
    position: number | null;
    tokenNumber?: number;
    totalInQueue: number;
    appointment?: any;
    message: string;
  };
}

export interface DoctorTokenSlot {
  tokenNumber: number;
  allottedTime: string;
  timeRange: string;
  isBooked: boolean;
  isPast?: boolean;
  status: string;
}

export interface DoctorTokenScheduleResponse {
  doctor: {
    _id: string;
    name: string;
    availableTime: string;
    maxTokensPerDay: number;
  };
  date: string;
  isToday?: boolean;
  workingHoursEnded?: boolean;
  message?: string;
  totalTokens: number;
  bookedTokensCount: number;
  availableTokensCount: number;
  tokens: DoctorTokenSlot[];
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
  tokenNumber?: number;
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
