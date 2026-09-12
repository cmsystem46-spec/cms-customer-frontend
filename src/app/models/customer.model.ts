export interface LoginPayload {
  phone: string;
  password: string;
  clinicId: string;
  rememberMe?: boolean;
}

export interface RegisterPayload {
  name: string;
  phone: string;
  password: string;
  clinicId: string;
}

/**
 * Customizable Additional Customer Data Model.
 * You can easily add, remove, or change fields in this interface.
 */
export interface AdditionalCustomerData {
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  alternatePhone?: string;
  notes?: string;
}
