
export type AttendanceStatus = string;

export type Gender = 'male' | 'female';

export interface Student {
  id: number;
  name: string;
  gender: Gender;
}

export interface Class {
  id: number;
  name: string;
  students: Student[];
}

export interface Grade {
    id: number;
    name: string;
    classes: Class[];
}

export interface AttendanceDetail {
    status: AttendanceStatus;
    note?: string;
}

export type AttendanceRecord = Record<number, AttendanceDetail>;

export interface SubmissionLog {
    submittedAt: string; // ISO String
    submittedByUserId: number;
}

// Map: DateString -> ClassId -> SubmissionLog
export type SubmissionRecord = Record<string, Record<number, SubmissionLog>>;

export type UserRole = 'admin' | 'teacher' | 'viewer';

export interface User {
    id: number;
    name: string;
    role: UserRole;
    classIds: number[];
    password?: string;
}

export interface StatusOption {
    value: string;
    label: string;
}
