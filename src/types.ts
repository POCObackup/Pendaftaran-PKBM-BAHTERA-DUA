/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface RegistrationProgram {
  paket: string;
  jurusan: string;
  peminatan: string[];
}

export interface RegistrationBiodata {
  namaLengkap: string;
  nik: string;
  nisn: string;
  tempatTanggalLahir: string;
  jenisKelamin: string;
  email: string;
  phone: string;
  street: string;
  rtRw: string;
  village: string;
  district: string;
  city: string;
}

export interface RegistrationGuardian {
  fatherName: string;
  fatherJob: string;
  motherName: string;
  motherJob: string;
  guardianName?: string;
  guardianPhone?: string;
  guardianAddress?: string;
}

export interface RegistrationDocuments {
  kk: string;       // URL or file name/path
  ijazah: string;   // URL or file name/path
  akta: string;     // URL or file name/path
  photo: string;    // URL or file name/path
}

export interface StudentRegistration {
  id: string;
  program: RegistrationProgram;
  biodata: RegistrationBiodata;
  guardian: RegistrationGuardian;
  documents: RegistrationDocuments;
  date: string;
  status: string;
}

export interface CloudSyncStatus {
  sheetConnected: boolean;
  driveConnected: boolean;
  spreadsheetId: string | null;
  driveFolderId: string | null;
  errorMessage: string | null;
}

export interface PaymentRecord {
  id: string;
  registrationCode: string;
  studentName: string;
  description: string;
  fileUrl: string;
  date: string;
  status: string; // Pending, Verified, Rejected
}
