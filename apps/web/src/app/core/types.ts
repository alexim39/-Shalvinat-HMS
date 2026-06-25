export type Role =
  | 'reception'
  | 'nurse'
  | 'doctor'
  | 'pharmacy'
  | 'laboratory'
  | 'radiology'
  | 'manager'
  | 'director';

export type User = {
  id: string;
  email: string;
  fullName: string;
  roles: Role[];
  department?: string;
  mustChangePassword?: boolean;
};

export type ApiResponse<T> = {
  data: T;
  unreadCount?: number;
  pagination?: Pagination;
};

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type Patient = {
  _id: string;
  patientNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  phone: string;
  residentialAddress?: string;
  allergies?: string[];
  age?: number;
};

export type Visit = {
  _id: string;
  visitNumber: string;
  patient: Patient | string;
  visitType: string;
  department: string;
  queueNumber: number;
  triageLevel?: string;
  status: string;
  paymentStatus: string;
};
