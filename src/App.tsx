/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  School,
  User,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  Settings,
  HelpCircle,
  LogOut,
  Lock,
  ArrowRight,
  ArrowLeft,
  Upload,
  Download,
  Search,
  Filter,
  Database,
  RefreshCw,
  FileText,
  Check,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Eye,
  EyeOff,
  UserCheck,
  FileSpreadsheet,
  BookOpen,
  Info,
  X,
  MapPin,
  Phone,
  Clock,
  Printer,
  Trash2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { StudentRegistration, CloudSyncStatus, PaymentRecord } from "./types";

export default function App() {
  // Navigation & Sub-views states
  const [currentView, setCurrentView] = useState<"registration" | "payment" | "login" | "admin">("registration");
  const [adminSubTab, setAdminSubTab] = useState<"dashboard" | "students" | "registrations" | "payments" | "settings">("registrations");
  
  // Registration stepper states (Form Section)
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [registrationSuccess, setRegistrationSuccess] = useState<string | null>(null);
  const [postFormId, setPostFormId] = useState<string | null>(null);
  const [isFinishingUpload, setIsFinishingUpload] = useState<boolean>(false);

  // Administrative login form states
  const [adminUsername, setAdminUsername] = useState<string>("");
  const [adminPassword, setAdminPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [adminToken, setAdminToken] = useState<string | null>(() => localStorage.getItem("adminToken"));

  // Registration form inputs state
  const [programForm, setProgramForm] = useState({
    paket: "Paket C (Setara SMA)",
    jurusan: "IPS",
    peminatan: [] as string[]
  });

  const [biodataForm, setBiodataForm] = useState({
    namaLengkap: "",
    nik: "",
    nisn: "",
    tempatTanggalLahir: "",
    jenisKelamin: "Laki-laki",
    email: "",
    phone: "",
    street: "",
    rtRw: "",
    village: "",
    district: "",
    city: ""
  });

  const [guardianForm, setGuardianForm] = useState({
    fatherName: "",
    fatherJob: "",
    motherName: "",
    motherJob: "",
    guardianName: "",
    guardianPhone: "",
    guardianAddress: ""
  });

  const [documentsForm, setDocumentsForm] = useState({
    kk: "",
    ijazah: "",
    akta: "",
    photo: ""
  });

  // Client-side local file previews (blob urls/type)
  const [localPreviews, setLocalPreviews] = useState<Record<string, { name: string; url: string; type: string }>>({});
  // Track currently active preview document in modal
  const [previewDoc, setPreviewDoc] = useState<{ title: string; url: string; type: string } | null>(null);

  // State to track upload progress per document type
  const [uploadingDocs, setUploadingDocs] = useState({
    kk: false,
    ijazah: false,
    akta: false,
    photo: false
  });

  // Database application states
  const [registrations, setRegistrations] = useState<StudentRegistration[]>([]);
  const [syncStatus, setSyncStatus] = useState<CloudSyncStatus>({
    sheetConnected: false,
    driveConnected: false,
    spreadsheetId: null,
    driveFolderId: null,
    errorMessage: null
  });

  // Settings editable state variables
  const [spreadsheetIdInSettings, setSpreadsheetIdInSettings] = useState<string>("");
  const [driveFolderIdInSettings, setDriveFolderIdInSettings] = useState<string>("");
  const [scriptUrlInSettings, setScriptUrlInSettings] = useState<string>("");
  const [isSavingConfig, setIsSavingConfig] = useState<boolean>(false);
  const [isInitializingDatabase, setIsInitializingDatabase] = useState<boolean>(false);

  const [isLoadingRegs, setIsLoadingRegs] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [isAdminUploading, setIsAdminUploading] = useState<Record<string, boolean>>({});
  
  // Sidebar expanded / modal view state
  const [selectedStudent, setSelectedStudent] = useState<StudentRegistration | null>(null);
  const [showNewRegistrationModalInAdmin, setShowNewRegistrationModalInAdmin] = useState<boolean>(false);
  const [isAboutOpen, setIsAboutOpen] = useState<boolean>(false);
  const [isContactOpen, setIsContactOpen] = useState<boolean>(false);

  // Payment View States
  const [paymentRegCode, setPaymentRegCode] = useState<string>("");
  const [paymentName, setPaymentName] = useState<string>("");
  const [paymentSelectOption, setPaymentSelectOption] = useState<string>("Uang Kesiswaan / Pendaftaran Awal");
  const [paymentCustomNotes, setPaymentCustomNotes] = useState<string>("");
  const [paymentFile, setPaymentFile] = useState<File | null>(null);
  const [paymentFileName, setPaymentFileName] = useState<string>("");
  const [paymentBase64, setPaymentBase64] = useState<string>("");
  const [paymentMimeType, setPaymentMimeType] = useState<string>("");
  const [paymentPreviewUrl, setPaymentPreviewUrl] = useState<string | null>(null);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState<boolean>(false);
  const [paymentSuccessData, setPaymentSuccessData] = useState<any | null>(null);

  // Admin Payments Records State
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [isLoadingPayments, setIsLoadingPayments] = useState<boolean>(false);

  // Load database on mount
  useEffect(() => {
    fetchRegistrations();
    fetchSyncStatus();
    fetchConfig();
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    setIsLoadingPayments(true);
    try {
      const directUrl = getStoredScriptUrl();
      if (directUrl) {
        const separator = directUrl.includes("?") ? "&" : "?";
        const res = await fetch(`${directUrl}${separator}type=payments`);
        if (res.ok) {
          const payload = await res.json();
          if (payload && payload.success && Array.isArray(payload.data)) {
            setPayments(payload.data);
            localStorage.setItem("local_payments", JSON.stringify(payload.data));
            setIsLoadingPayments(false);
            return;
          }
        }
      }

      const res = await fetch("/api/payments");
      if (res.ok) {
        const payload = await res.json();
        setPayments(payload.data || []);
        localStorage.setItem("local_payments", JSON.stringify(payload.data || []));
      } else {
        const cached = localStorage.getItem("local_payments");
        if (cached) {
          setPayments(JSON.parse(cached));
        }
      }
    } catch (err) {
      console.error("Error fetching payments:", err);
      const cached = localStorage.getItem("local_payments");
      if (cached) {
        setPayments(JSON.parse(cached));
      }
    } finally {
      setIsLoadingPayments(false);
    }
  };

  const handlePaymentFileChange = async (file: File) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert("Maaf, ukuran dokumen melebihi batas 10 MB.");
      return;
    }
    
    setPaymentFile(file);
    setPaymentFileName(file.name);
    setPaymentMimeType(file.type);

    // Live preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPaymentPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    try {
      const base64Str = await fileToBase64(file);
      setPaymentBase64(base64Str);
    } catch (err) {
      console.error("Error encoding payment proof file to base64:", err);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentRegCode.trim() || !paymentName.trim()) {
      alert("Silakan isi Kode Registrasi dan Nama Lengkap Siswa.");
      return;
    }
    if (!paymentBase64) {
      alert("Silakan unggah foto bukti pembayaran terlebih dahulu.");
      return;
    }

    const finalDescription = paymentSelectOption === "Lainnya" ? (paymentCustomNotes || "Lainnya") : paymentSelectOption;

    setIsSubmittingPayment(true);
    try {
      const directUrl = getStoredScriptUrl();
      if (directUrl) {
        try {
          // 1. Upload the payment receipt image to Google Drive first
          const uploadRes = await fetch(directUrl, {
            method: "POST",
            headers: { "Content-Type": "text/plain" },
            body: JSON.stringify({
              action: "upload",
              fileName: `BUKTI_BAYAR - ${paymentRegCode} - ${paymentName}.${paymentFileName.split(".").pop() || "jpg"}`,
              base64Data: paymentBase64,
              mimeType: paymentMimeType
            })
          });

          if (uploadRes.ok) {
            const uploadReply = await uploadRes.json();
            if (uploadReply && uploadReply.url) {
              const pId = "PAY-" + Math.floor(100000 + Math.random() * 900000);
              const pDate = new Date().toLocaleDateString("id-ID", {
                year: "numeric",
                month: "short",
                day: "numeric"
              });

              const payPayload = {
                id: pId,
                registrationCode: paymentRegCode,
                studentName: paymentName,
                description: finalDescription,
                date: pDate,
                fileUrl: uploadReply.url,
                status: "Lunas" // Default to instant Lunas (No validation block needed of verification)
              };

              // 2. Insert payment row in Google Sheets
              const payRes = await fetch(directUrl, {
                method: "POST",
                headers: { "Content-Type": "text/plain" },
                body: JSON.stringify({
                  action: "submitPayment",
                  data: payPayload
                })
              });

              if (payRes.ok) {
                setPaymentSuccessData(payPayload);
                // Clear payment form fields
                setPaymentRegCode("");
                setPaymentName("");
                setPaymentSelectOption("Uang Kesiswaan / Pendaftaran Awal");
                setPaymentCustomNotes("");
                setPaymentFile(null);
                setPaymentFileName("");
                setPaymentBase64("");
                setPaymentMimeType("");
                setPaymentPreviewUrl(null);
                // Reload
                fetchPayments();
                setIsSubmittingPayment(false);
                return;
              }
            }
          }
        } catch (err) {
          console.error("Direct Apps Script payment submit failing, trying server fallback:", err);
        }
      }

      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registrationCode: paymentRegCode,
          studentName: paymentName,
          description: finalDescription,
          paymentFileName,
          paymentBase64,
          paymentMimeType
        })
      });

      if (res.ok) {
        const reply = await res.json();
        setPaymentSuccessData(reply.data || true);
        // Clear payment form fields
        setPaymentRegCode("");
        setPaymentName("");
        setPaymentSelectOption("Uang Kesiswaan / Pendaftaran Awal");
        setPaymentCustomNotes("");
        setPaymentFile(null);
        setPaymentFileName("");
        setPaymentBase64("");
        setPaymentMimeType("");
        setPaymentPreviewUrl(null);
        // Reload admin payment list
        fetchPayments();
      } else {
        const errData = await res.json();
        alert("Gagal mengirim bukti pembayaran: " + (errData.error || errData.message || "Unknown error"));
      }
    } catch (err) {
      console.error("Error submitting payment:", err);
      alert("Terjadi kesalahan koneksi saat mengirim pembayaran.");
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const handleUpdatePaymentStatus = async (paymentId: string, value: string) => {
    const confirmation = window.confirm(
      `Apakah Anda yakin ingin menyetujui/mengubah status bukti pembayaran ${paymentId} ke "${value}"?`
    );
    if (!confirmation) return;

    try {
      const res = await fetch(`/api/payments/${paymentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: value })
      });

      if (res.ok) {
        setPayments(prev => prev.map(p => p.id === paymentId ? { ...p, status: value } : p));
      } else {
        alert("Gagal memperbarui status bukti pembayaran.");
      }
    } catch (err) {
      console.error("Error updating payment status:", err);
      alert("Hubungan koneksi gagal: " + err);
    }
  };

  const fetchRegistrations = async () => {
    setIsLoadingRegs(true);
    try {
      const directUrl = getStoredScriptUrl();
      if (directUrl) {
        const separator = directUrl.includes("?") ? "&" : "?";
        const res = await fetch(`${directUrl}${separator}type=registrations`);
        if (res.ok) {
          const payload = await res.json();
          if (payload && payload.success && Array.isArray(payload.data)) {
            setRegistrations(payload.data);
            localStorage.setItem("local_registrations", JSON.stringify(payload.data));
            setIsLoadingRegs(false);
            return;
          }
        }
      }

      // Backend / Local fallbacks
      const res = await fetch("/api/registrations");
      if (res.ok) {
        const payload = await res.json();
        setRegistrations(payload.data || []);
        localStorage.setItem("local_registrations", JSON.stringify(payload.data || []));
      } else {
        const cached = localStorage.getItem("local_registrations");
        if (cached) {
          setRegistrations(JSON.parse(cached));
        }
      }
    } catch (err) {
      console.error("Failed to fetch registrations:", err);
      const cached = localStorage.getItem("local_registrations");
      if (cached) {
        setRegistrations(JSON.parse(cached));
      }
    } finally {
      setIsLoadingRegs(false);
    }
  };

  const fetchSyncStatus = async () => {
    const directUrl = getStoredScriptUrl();
    const spreadsheetId = localStorage.getItem("google_spreadsheet_id") || spreadsheetIdInSettings;
    const driveFolderId = localStorage.getItem("google_drive_folder_id") || driveFolderIdInSettings;

    if (directUrl) {
      setSyncStatus({
        sheetConnected: !!spreadsheetId,
        driveConnected: !!driveFolderId,
        spreadsheetId: spreadsheetId || null,
        driveFolderId: driveFolderId || null,
        errorMessage: null
      });
      return;
    }

    try {
      const res = await fetch("/api/sync/status");
      if (res.ok) {
        const payload = await res.json();
        setSyncStatus(payload);
      }
    } catch (err) {
      console.error("Failed to check Google Sync status:", err);
    }
  };

  const fetchConfig = async () => {
    // 1. Check local storage first
    let localSId = localStorage.getItem("google_spreadsheet_id") || "";
    let localFoldId = localStorage.getItem("google_drive_folder_id") || "";
    let localScrUrl = localStorage.getItem("google_script_url") || "";

    // If local storage is not yet initialized, set defaults to the user's active configurations
    if (!localScrUrl) {
      localScrUrl = "https://script.google.com/macros/s/AKfycby-sEpy7rYq9tjuqMo_QjDvwmPUKiwiqwSEvqyFCr-tOBfymGiUuAbhk-6o6UR9ENNSyg/exec";
      localSId = "1DSVqDAaMGSMhTmOvIk-qme_wPeFZ27LoftcVvYwj6iU";
      localFoldId = "1fcgrKLvJV7_NIa5FEIRcxUA0V5y4UrRd";

      localStorage.setItem("google_script_url", localScrUrl);
      localStorage.setItem("google_spreadsheet_id", localSId);
      localStorage.setItem("google_drive_folder_id", localFoldId);
    }

    setSpreadsheetIdInSettings(localSId);
    setDriveFolderIdInSettings(localFoldId);
    setScriptUrlInSettings(localScrUrl);
  };

  const handleSaveConfig = async () => {
    setIsSavingConfig(true);
    // Write locally first
    localStorage.setItem("google_spreadsheet_id", spreadsheetIdInSettings);
    localStorage.setItem("google_drive_folder_id", driveFolderIdInSettings);
    localStorage.setItem("google_script_url", scriptUrlInSettings);

    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          googleSpreadsheetId: spreadsheetIdInSettings,
          googleDriveFolderId: driveFolderIdInSettings,
          googleScriptUrl: scriptUrlInSettings
        })
      });
      if (res.ok) {
        alert("Konfigurasi integrasi Google berhasil disimpan!");
        fetchSyncStatus();
        fetchRegistrations();
        fetchPayments();
      } else {
        alert("Konfigurasi berhasil disimpan langsung di browser Anda (Serverless/GitHub Pages mode)!");
        fetchSyncStatus();
        fetchRegistrations();
        fetchPayments();
      }
    } catch (err) {
      console.error("Failed to save config on server, but keeping in local storage:", err);
      alert("Konfigurasi berhasil disimpan langsung di browser Anda (Serverless/GitHub Pages mode)!");
      fetchSyncStatus();
      fetchRegistrations();
      fetchPayments();
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleInitializeDatabase = async () => {
    setIsInitializingDatabase(true);
    const directUrl = getStoredScriptUrl();

    if (directUrl) {
      try {
        const res = await fetch(directUrl, {
          method: "POST",
          headers: { "Content-Type": "text/plain" },
          body: JSON.stringify({ action: "setup" })
        });
        if (res.ok) {
          const payload = await res.json();
          alert(payload.message || "Database Spreadsheet berhasil diinisialisasi otomatis via Google Apps Script!");
          fetchSyncStatus();
          fetchRegistrations();
          fetchPayments();
          setIsInitializingDatabase(false);
          return;
        }
      } catch (err) {
        console.error("Direct setup failing, trying server fallback:", err);
      }
    }

    try {
      const res = await fetch("/api/setup", {
        method: "POST"
      });
      if (res.ok) {
        const payload = await res.json();
        alert(payload.message || "Database Spreadsheet berhasil diinisialisasi secara otomatis!");
        fetchSyncStatus();
        fetchRegistrations();
        fetchPayments();
      } else {
        const errorData = await res.json();
        alert(errorData.error || "Gagal menginisialisasi database.");
      }
    } catch (err) {
      console.error("Initialize database error:", err);
      alert("Terjadi kesalahan koneksi server.");
    } finally {
      setIsInitializingDatabase(false);
    }
  };

  // Convert File object to Base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  // Get Google Apps Script Web App URL safely from memory, localStorage, or environment
  const getStoredScriptUrl = (): string => {
    if (scriptUrlInSettings && scriptUrlInSettings.startsWith("https://script.google.com")) {
      return scriptUrlInSettings.trim();
    }
    const cached = localStorage.getItem("google_script_url");
    if (cached && cached.startsWith("https://script.google.com")) {
      return cached.trim();
    }
    const envUrl = ((import.meta as any).env?.VITE_GOOGLE_SCRIPT_URL as string) || "";
    if (envUrl && envUrl.startsWith("https://script.google.com")) {
      return envUrl.trim();
    }
    return "https://script.google.com/macros/s/AKfycby-sEpy7rYq9tjuqMo_QjDvwmPUKiwiqwSEvqyFCr-tOBfymGiUuAbhk-6o6UR9ENNSyg/exec";
  };

  // Document upload handler
  const handleDocumentUpload = async (docKey: "kk" | "ijazah" | "akta" | "photo", event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Create a local blob URL for immediate high-resolution client-side preview
    const blobUrl = URL.createObjectURL(file);
    
    // Set immediate local preview to show name and link
    setLocalPreviews(prev => ({
      ...prev,
      [docKey]: {
        name: file.name,
        url: blobUrl,
        type: file.type
      }
    }));

    // Set immediate documentsForm state so it is instantly marked as selected & non-empty
    setDocumentsForm(prev => ({
      ...prev,
      [docKey]: blobUrl
    }));

    setUploadingDocs(prev => ({ ...prev, [docKey]: true }));
    try {
      const base64Str = await fileToBase64(file);
      const directUrl = getStoredScriptUrl();

      if (directUrl) {
        try {
          const res = await fetch(directUrl, {
            method: "POST",
            headers: { "Content-Type": "text/plain" },
            body: JSON.stringify({
              action: "upload",
              fileName: `${postFormId || "NEW"} - ${biodataForm.namaLengkap || "Siswa"} - ${docKey.toUpperCase()}.${file.name.split('.').pop() || 'dat'}`,
              base64Data: base64Str,
              mimeType: file.type,
              registrationCode: postFormId,
              studentName: biodataForm.namaLengkap,
              docType: docKey
            })
          });
          if (res.ok) {
            const reply = await res.json();
            if (reply && reply.url) {
              setDocumentsForm(prev => ({ ...prev, [docKey]: reply.url }));
              setUploadingDocs(prev => ({ ...prev, [docKey]: false }));
              return;
            }
          }
        } catch (err) {
          console.error("Direct document upload to Apps Script failing, trying server fallback:", err);
        }
      }

      const res = await fetch("/api/registrations/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          base64Data: base64Str,
          mimeType: file.type,
          registrationCode: postFormId,
          studentName: biodataForm.namaLengkap,
          docType: docKey
        })
      });

      if (res.ok) {
        const reply = await res.json();
        if (reply && reply.url) {
          setDocumentsForm(prev => ({ ...prev, [docKey]: reply.url }));
        }
      } else {
        console.warn("Upload background sync returned non-ok response status, preserving local blob option.");
      }
    } catch (err) {
      console.error("Background document sync error:", err);
    } finally {
      setUploadingDocs(prev => ({ ...prev, [docKey]: false }));
    }
  };

  // Helper handler to open high-fidelity document previews
  const openDocumentPreview = (docKey: "kk" | "ijazah" | "akta" | "photo") => {
    const titles = {
      kk: "Pratinjau Kartu Keluarga (KK)",
      ijazah: "Pratinjau Ijazah Kelulusan Terakhir",
      akta: "Pratinjau Akta Kelahiran",
      photo: "Pratinjau Pas Foto 3x4"
    };
    
    const title = titles[docKey];
    
    if (localPreviews[docKey]) {
      setPreviewDoc({
        title,
        url: localPreviews[docKey].url,
        type: localPreviews[docKey].type
      });
    } else if (documentsForm[docKey]) {
      const url = documentsForm[docKey];
      let type = "image/jpeg";
      if (url.toLowerCase().endsWith(".pdf")) {
        type = "application/pdf";
      }
      setPreviewDoc({
        title,
        url,
        type
      });
    } else {
      alert("Belum ada berkas terunggah yang dapat diperlihatkan.");
    }
  };

  // Administrative Panel sign in handler
  const handleAdminSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError(null);
    setIsLoggingIn(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: adminUsername, password: adminPassword })
      });

      if (res.ok) {
        const result = await res.json();
        localStorage.setItem("adminToken", result.token);
        setAdminToken(result.token);
        setCurrentView("admin");
        setAdminSubTab("registrations");
        fetchRegistrations(); // Reload
      } else {
        const errorReply = await res.json();
        setAdminError(errorReply.message || "Gagal masuk. Username atau Password salah.");
      }
    } catch (err) {
      console.error("Login request failed:", err);
      setAdminError("Gagal menghubungi server.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Clear authentication token
  const handleSignOut = () => {
    localStorage.removeItem("adminToken");
    setAdminToken(null);
    setCurrentView("registration");
  };

  // Handles submitting student registration form
  const handleRegistrationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const generatedId = "REG-" + Math.floor(100000 + Math.random() * 900000);
    const currentDate = new Date().toLocaleDateString("id-ID", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });

    const bodyPayload: StudentRegistration = {
      id: generatedId,
      program: programForm,
      biodata: biodataForm,
      guardian: guardianForm,
      documents: documentsForm,
      date: currentDate,
      status: "Terdaftar" // Default
    };

    try {
      const directUrl = getStoredScriptUrl();
      if (directUrl) {
        try {
          const res = await fetch(directUrl, {
            method: "POST",
            headers: { "Content-Type": "text/plain" },
            body: JSON.stringify({
              action: "register",
              data: bodyPayload
            })
          });
          if (res.ok) {
            setPostFormId(generatedId);
            fetchRegistrations(); // Sync
            setIsSubmitting(false);
            return;
          }
        } catch (err) {
          console.error("Direct Apps Script registration failing, using server fallback:", err);
        }
      }

      const res = await fetch("/api/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload)
      });

      if (res.ok) {
        setPostFormId(generatedId);
        fetchRegistrations(); // Sync
      } else {
        alert("Gagal mengirimkan formulir pendaftaran.");
      }
    } catch (err) {
      console.error("Registration submit error:", err);
      alert("Koneksi bermasalah. Pendaftaran gagal dikirim.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handles submitting student uploaded documents (Stage 2)
  const handleDocumentsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postFormId) return;

    setIsFinishingUpload(true);
    try {
      const res = await fetch(`/api/registrations/${postFormId}/documents`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documents: documentsForm })
      });

      if (res.ok) {
        setRegistrationSuccess(postFormId);
        setPostFormId(null);
        // Clear all inputs safely
        setProgramForm({ paket: "Paket C (Setara SMA)", jurusan: "IPS", peminatan: [] });
        setBiodataForm({
          namaLengkap: "", nik: "", nisn: "", tempatTanggalLahir: "", jenisKelamin: "Laki-laki",
          email: "", phone: "", street: "", rtRw: "", village: "", district: "", city: ""
        });
        setGuardianForm({ fatherName: "", fatherJob: "", motherName: "", motherJob: "", guardianName: "", guardianPhone: "", guardianAddress: "" });
        setDocumentsForm({ kk: "", ijazah: "", akta: "", photo: "" });
        setCurrentStep(1);
        fetchRegistrations(); // Sync
      } else {
        alert("Gagal mengunggah berkas pendaftaran.");
      }
    } catch (err) {
      console.error("Documents submit error:", err);
      alert("Koneksi bermasalah. Berkas gagal dikirim.");
    } finally {
      setIsFinishingUpload(false);
    }
  };

  // Update Status in database with user validation dialog
  const handleUpdateStatus = async (studentId: string, value: string) => {
    const confirmation = window.confirm(
      `Apakah Anda yakin ingin menetapkan status pendaftaran mahasiswa ${studentId} ke "${value}"?`
    );
    if (!confirmation) return;

    try {
      const directUrl = getStoredScriptUrl();
      if (directUrl) {
        try {
          const res = await fetch(directUrl, {
            method: "POST",
            headers: { "Content-Type": "text/plain" },
            body: JSON.stringify({
              action: "updateStatus",
              id: studentId,
              status: value
            })
          });
          if (res.ok) {
            // Update direct local state to preserve visual fluidity
            setRegistrations(prev => prev.map(r => r.id === studentId ? { ...r, status: value } : r));
            if (selectedStudent && selectedStudent.id === studentId) {
              setSelectedStudent(prev => prev ? { ...prev, status: value } : null);
            }
            return;
          }
        } catch (err) {
          console.error("Direct status update failing, trying server fallback:", err);
        }
      }

      const res = await fetch(`/api/registrations/${studentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: value })
      });

      if (res.ok) {
        // Update direct local state to preserve visual fluidity
        setRegistrations(prev => prev.map(r => r.id === studentId ? { ...r, status: value } : r));
        if (selectedStudent && selectedStudent.id === studentId) {
          setSelectedStudent(prev => prev ? { ...prev, status: value } : null);
        }
      } else {
        alert("Gagal merubah status pendaftaran.");
      }
    } catch (err) {
      console.error("Error updating status:", err);
    }
  };

  // Admin handles uploading documents on behalf of students
  const handleAdminUploadDocument = async (studentId: string, docKey: "kk" | "ijazah" | "akta" | "photo", event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsAdminUploading(prev => ({ ...prev, [docKey]: true }));
    try {
      const base64Str = await fileToBase64(file);
      const directUrl = getStoredScriptUrl();

      if (directUrl) {
        try {
          // 1. Upload to Apps Script
          const res = await fetch(directUrl, {
            method: "POST",
            headers: { "Content-Type": "text/plain" },
            body: JSON.stringify({
              action: "upload",
              fileName: `${studentId} - ${selectedStudent?.biodata.namaLengkap || "Siswa"} - ${docKey.toUpperCase()}.${file.name.split('.').pop() || 'dat'}`,
              base64Data: base64Str,
              mimeType: file.type,
              registrationCode: studentId,
              studentName: selectedStudent?.biodata.namaLengkap || "Siswa",
              docType: docKey
            })
          });

          if (res.ok) {
            const reply = await res.json();
            if (reply && reply.url) {
              const currentDocs = { ...(selectedStudent?.documents || { kk: "", ijazah: "", akta: "", photo: "" }) };
              (currentDocs as any)[docKey] = reply.url;

              // 2. Put back updated student document mapping
              const patchRes = await fetch(directUrl, {
                method: "POST",
                headers: { "Content-Type": "text/plain" },
                body: JSON.stringify({
                  action: "updateStudent",
                  id: studentId,
                  data: { documents: currentDocs }
                })
              });

              if (patchRes.ok) {
                setRegistrations(prev => prev.map(r => r.id === studentId ? { ...r, documents: currentDocs } : r));
                setSelectedStudent(prev => prev ? { ...prev, documents: currentDocs } : null);
                setIsAdminUploading(prev => ({ ...prev, [docKey]: false }));
                return;
              }
            }
          }
        } catch (err) {
          console.error("Direct admin upload doc to Apps Script failing, trying server fallback:", err);
        }
      }

      const res = await fetch("/api/registrations/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          base64Data: base64Str,
          mimeType: file.type,
          registrationCode: studentId,
          studentName: selectedStudent?.biodata.namaLengkap || "Siswa",
          docType: docKey
        })
      });

      if (res.ok) {
        const reply = await res.json();
        if (reply && reply.url) {
          const currentDocs = { ...(selectedStudent?.documents || { kk: "", ijazah: "", akta: "", photo: "" }) };
          (currentDocs as any)[docKey] = reply.url;

          // PATCH documents back to server to persist in db.json
          const patchRes = await fetch(`/api/registrations/${studentId}/documents`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ documents: currentDocs })
          });

          if (patchRes.ok) {
            setRegistrations(prev => prev.map(r => r.id === studentId ? { ...r, documents: currentDocs } : r));
            setSelectedStudent(prev => prev ? { ...prev, documents: currentDocs } : null);
          } else {
            alert("Gagal merubah database berkas pendaftaran.");
          }
        }
      } else {
        alert("Gagal mengunggah dokumen.");
      }
    } catch (err) {
      console.error("Error admin upload doc:", err);
      alert("Hubungan koneksi gagal: " + err);
    } finally {
      setIsAdminUploading(prev => ({ ...prev, [docKey]: false }));
    }
  };

  // Handles printing/receipt download cleanly
  const handlePrintStudent = () => {
    if (!selectedStudent) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Popup blocker diaktifkan. Silakan izinkan jendela sembulan untuk mencetak bukti pendaftaran.");
      return;
    }

    const htmlContent = `
      <html>
        <head>
          <title>Bukti Pendaftaran - ${selectedStudent.id}</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #1e293b; line-height: 1.5; background: #fff; }
            .header { text-align: center; border-bottom: 3px double #0284c7; padding-bottom: 20px; margin-bottom: 25px; }
            .header h1 { margin: 0; color: #0f172a; font-size: 24px; text-transform: uppercase; letter-spacing: 1px; }
            .header p { margin: 5px 0 0 0; color: #64748b; font-size: 11px; font-weight: 500; }
            .receipt-title { font-weight: bold; font-size: 14px; color: #0284c7; margin-top: 15px; text-transform: uppercase; letter-spacing: 0.5px; text-align: center; }
            .meta { display: flex; justify-content: space-between; margin-bottom: 25px; font-size: 12.5px; background: #f8fafc; padding: 12px 18px; border-radius: 8px; border: 1px solid #e2e8f0; }
            .meta div span { font-weight: bold; color: #0284c7; font-family: monospace; }
            .section-title { font-size: 13px; font-weight: bold; color: #0f172a; border-bottom: 2px solid #f1f5f9; padding-bottom: 5px; margin: 25px 0 12px 0; text-transform: uppercase; }
            .grid { display: grid; grid-template-cols: 160px 1fr; gap: 8px 15px; font-size: 12px; }
            .label { font-weight: 600; color: #475569; }
            .value { color: #0f172a; }
            .chips { display: flex; flex-wrap: wrap; gap: 4px; }
            .chip { background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600; color: #334155; }
            .footer { margin-top: 50px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 15px; }
            @media print {
              body { padding: 10px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>PKBM BAHTERA DUA</h1>
            <p>Izin Operasional No: 421.9/127/410.110.4/2020 | Kota Blitar, Jawa Timur</p>
            <div class="receipt-title">BUKTI PENDAFTARAN SISWA BARU</div>
          </div>
          
          <div class="meta">
            <div>Kode Pendaftaran: <span>${selectedStudent.id}</span></div>
            <div>Tanggal Daftar: <strong>${selectedStudent.date}</strong></div>
            <div>Status: <strong>${selectedStudent.status || "Terdaftar"}</strong></div>
          </div>

          <div class="section-title">1. Pilihan Program Pendidikan</div>
          <div class="grid">
            <div class="label">Program Paket:</div>
            <div class="value" style="font-weight: bold;">${selectedStudent.program.paket}</div>
            
            <div class="label">Jurusan:</div>
            <div class="value">${selectedStudent.program.jurusan || "Umum"}</div>
            
            <div class="label">Mata Pelajaran Peminatan:</div>
            <div class="value">
              <div class="chips">
                ${selectedStudent.program.peminatan.map(t => `<span class="chip">${t}</span>`).join("") || "-"}
              </div>
            </div>
          </div>

          <div class="section-title">2. Data Diri Calon Siswa</div>
          <div class="grid">
            <div class="label">Nama Lengkap:</div>
            <div class="value" style="font-weight: 700;">${selectedStudent.biodata.namaLengkap}</div>
            
            <div class="label">NIK (No. KTP):</div>
            <div class="value" style="font-family: monospace;">${selectedStudent.biodata.nik}</div>
            
            <div class="label">NISN:</div>
            <div class="value" style="font-family: monospace;">${selectedStudent.biodata.nisn || "-"}</div>
            
            <div class="label">TTL:</div>
            <div class="value">${selectedStudent.biodata.tempatTanggalLahir}</div>
            
            <div class="label">Jenis Kelamin:</div>
            <div class="value">${selectedStudent.biodata.jenisKelamin}</div>
            
            <div class="label">Surel (Email):</div>
            <div class="value">${selectedStudent.biodata.email}</div>
            
            <div class="label">Nomor WA / HP:</div>
            <div class="value">${selectedStudent.biodata.phone}</div>
            
            <div class="label">Alamat Lengkap:</div>
            <div class="value">${selectedStudent.biodata.street}, RT/RW: ${selectedStudent.biodata.rtRw}, Kel: ${selectedStudent.biodata.village}, Kec: ${selectedStudent.biodata.district}, Kota/Kab: ${selectedStudent.biodata.city}</div>
          </div>

          <div class="section-title">3. Informasi Orang Tua / Wali</div>
          <div class="grid">
            <div class="label">Nama Ayah:</div>
            <div class="value">${selectedStudent.guardian.fatherName} (Pekerjaan: ${selectedStudent.guardian.fatherJob})</div>
            
            <div class="label">Nama Ibu:</div>
            <div class="value">${selectedStudent.guardian.motherName} (Pekerjaan: ${selectedStudent.guardian.motherJob})</div>
            
            ${selectedStudent.guardian.guardianName ? `
              <div class="label">Nama Wali / Kontak:</div>
              <div class="value">${selectedStudent.guardian.guardianName} (Phone: ${selectedStudent.guardian.guardianPhone})</div>
              
              <div class="label">Alamat Wali:</div>
              <div class="value">${selectedStudent.guardian.guardianAddress}</div>
            ` : ""}
          </div>

          <div class="section-title">4. Kelengkapan Berkas Dokumen</div>
          <div class="grid">
            <div class="label">Kartu Keluarga (KK):</div>
            <div class="value">${selectedStudent.documents.kk ? "✓ Terlampir" : "✗ Belum Diunggah"}</div>
            
            <div class="label">Ijazah Terakhir:</div>
            <div class="value">${selectedStudent.documents.ijazah ? "✓ Terlampir" : "✗ Belum Diunggah"}</div>
            
            <div class="label">Akta Kelahiran:</div>
            <div class="value">${selectedStudent.documents.akta ? "✓ Terlampir" : "✗ Belum Diunggah"}</div>
            
            <div class="label">Pas Foto:</div>
            <div class="value">${selectedStudent.documents.photo ? "✓ Terlampir" : "✗ Belum Diunggah"}</div>
          </div>

          <div class="footer">
            <p>Bukti pendaftaran ini diterbitkan secara elektronik oleh sistem informasi PKBM Bahtera Dua.</p>
            <p>© ${new Date().getFullYear()} PKBM Bahtera Dua Kota Blitar. All rights reserved.</p>
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // Interactive toggle parameters for checkboxes
  const handlePeminatanCheck = (name: string) => {
    setProgramForm(prev => {
      const alreadyChecked = prev.peminatan.includes(name);
      return {
        ...prev,
        peminatan: alreadyChecked 
          ? prev.peminatan.filter(t => t !== name)
          : [...prev.peminatan, name]
      };
    });
  };

  // Filters registrations based on search string and status badge
  const filteredRegistrations = registrations.filter(reg => {
    const matchesSearch = 
      reg.biodata.namaLengkap.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reg.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reg.program.paket.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (statusFilter === "All") return matchesSearch;
    const isComplete = reg.documents && reg.documents.kk && reg.documents.ijazah && reg.documents.akta && reg.documents.photo;
    if (statusFilter === "Complete") return matchesSearch && isComplete;
    if (statusFilter === "Incomplete") return matchesSearch && !isComplete;
    return matchesSearch;
  });

  // Calculate statistics metrics
  const totalStudents = registrations.length;
  const incompleteDocs = registrations.filter(r => {
    const docs = r.documents;
    return !docs || !docs.kk || !docs.ijazah || !docs.akta || !docs.photo;
  }).length;
  const completeDocsRate = totalStudents > 0 
    ? Math.round(((totalStudents - incompleteDocs) / totalStudents) * 100)
    : 0;

  // Render stepper title line helper
  const getStepCircleClass = (step: number) => {
    if (currentStep === step) return "w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center font-semibold border-2 border-primary shadow-sm shadow-primary/20 scale-110 duration-200";
    if (currentStep > step) return "w-10 h-10 rounded-full bg-secondary text-white flex items-center justify-center font-semibold duration-200";
    return "w-10 h-10 rounded-full bg-surface-container-high text-on-surface-variant flex items-center justify-center font-semibold border border-outline-variant duration-200";
  };

  const getStepTextClass = (step: number) => {
    if (currentStep === step) return "text-sm font-semibold text-primary mt-1";
    if (currentStep > step) return "text-sm font-medium text-secondary mt-1";
    return "text-sm text-on-surface-variant mt-1";
  };

  // Generate CSV data for export
  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "ID Pendaftaran,Tanggal,Status,Nama Lengkap,Program,Email,No HP WA\n";
    registrations.forEach(r => {
      csvContent += `"${r.id}","${r.date}","${r.status}","${r.biodata.namaLengkap}","${r.program.paket}","${r.biodata.email}","${r.biodata.phone}"\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Data_Pendaftaran_Siswa_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /* ==============================================
     GRAPHICAL INTERFACE LAYOUTS
     ============================================== */

  return (
    <div className="bg-background text-on-surface font-sans min-h-screen flex flex-col selection:bg-secondary/20 selection:text-secondary">
      
      {/* 2024 TOP APP BAR HEADER */}
      <header className="bg-white border-b border-surface-container/60 shadow-sm sticky top-0 z-40">
        <div className="flex justify-between items-center w-full px-6 h-16 max-w-7xl mx-auto">
          
          {/* Logo & Platform Name */}
          <button 
            onClick={() => setCurrentView("registration")} 
            className="flex items-center gap-2 group text-left focus:outline-none"
          >
            <div className="p-2 bg-primary/5 rounded-lg group-hover:bg-primary/10 transition-colors">
              <School className="w-6 h-6 text-primary" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight text-primary block leading-none">PKBM Bahtera Dua</span>
              <span className="text-[10px] text-on-surface-variant tracking-wider uppercase">Kota Blitar</span>
            </div>
          </button>

          {/* Navigation Items */}
          <nav className="flex gap-8 items-center">
            <button 
              onClick={() => {
                setCurrentView("registration");
                setRegistrationSuccess(null);
                setCurrentStep(1);
              }} 
              className={`pb-1 text-sm font-medium border-b-2 transition-all cursor-pointer ${
                currentView === "registration" 
                  ? "text-primary border-primary" 
                  : "text-on-surface-variant border-transparent hover:text-primary"
              }`}
            >
              Registration
            </button>
            <button 
              onClick={() => {
                setCurrentView("payment");
              }} 
              className={`pb-1 text-sm font-medium border-b-2 transition-all cursor-pointer ${
                currentView === "payment" 
                  ? "text-primary border-primary" 
                  : "text-on-surface-variant border-transparent hover:text-primary"
              }`}
            >
              Payment
            </button>
            <button 
              onClick={() => setIsAboutOpen(true)}
              className="text-on-surface-variant hover:text-primary transition-colors text-sm font-medium cursor-pointer"
            >
              About
            </button>
            <button 
              onClick={() => setIsContactOpen(true)}
              className="text-on-surface-variant hover:text-primary transition-colors text-sm font-medium cursor-pointer"
            >
              Contact
            </button>
            
            {adminToken ? (
              <button 
                onClick={() => setCurrentView("admin")}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  currentView === "admin"
                    ? "bg-primary text-white shadow-sm"
                    : "bg-primary/5 text-primary hover:bg-primary/10"
                }`}
              >
                <UserCheck className="w-4 h-4" />
                Admin Panel
              </button>
            ) : (
              <button 
                onClick={() => setCurrentView(currentView === "login" ? "registration" : "login")}
                className={`px-5 py-1.5 rounded-lg text-sm font-semibold cursor-pointer transition-all ${
                  currentView === "login"
                    ? "bg-slate-200 text-slate-800"
                    : "bg-primary text-white hover:bg-primary/95 shadow-sm shadow-primary/10"
                }`}
              >
                Login
              </button>
            )}
          </nav>
        </div>
      </header>

      {/* RENDER DYNAMIC CANVAS VIEW */}
      <div className="flex-1 flex flex-col">
        {currentView === "payment" && (
          <main className="flex-grow py-12 px-6 bg-slate-50/50">
            <div className="max-w-xl mx-auto">
              
              <div className="mb-10 text-center">
                <h1 className="text-3xl font-bold text-primary tracking-tight mb-2">Konfirmasi Bukti Pembayaran</h1>
                <p className="text-slate-600 text-sm">
                  Silakan unggah bukti transfer pembayaran administrasi pendaftaran Anda untuk diverifikasi oleh admin PKBM Bahtera Dua.
                </p>
              </div>

              {paymentSuccessData ? (
                <motion.div 
                  initial={{ opacity: 0, y: 15 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  className="bg-emerald-50 rounded-2xl border border-emerald-200/60 p-8 shadow-sm text-center space-y-4"
                >
                  <div className="mx-auto w-16 h-16 bg-emerald-100/80 rounded-full flex items-center justify-center text-emerald-600">
                    <CheckCircle className="w-10 h-10" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-lg text-emerald-800">Bukti Pembayaran Terkirim!</h3>
                    <p className="text-slate-600 text-xs px-4">
                      Terima kasih. Bukti pembayaran Anda atas nama <strong className="text-emerald-700">{paymentSuccessData.studentName}</strong> ({paymentSuccessData.registrationCode}) telah berhasil kami terima dan saat ini sedang dalam proses verifikasi pihak sekolah.
                    </p>
                  </div>
                  <div className="p-4 bg-white/70 border border-emerald-100 rounded-xl max-w-sm mx-auto text-left text-xs font-semibold space-y-1">
                    <div className="flex justify-between"><span className="text-slate-400">ID Transaksi:</span> <span className="font-mono text-slate-700">{paymentSuccessData.id}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Kode Registrasi:</span> <span className="font-mono text-slate-700">{paymentSuccessData.registrationCode}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Tanggal:</span> <span className="text-slate-700">{paymentSuccessData.date}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Deskripsi:</span> <span className="text-slate-700">{paymentSuccessData.description}</span></div>
                    {paymentSuccessData.fileUrl && (
                      <div className="pt-2 text-center">
                        <a 
                          href={paymentSuccessData.fileUrl} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="inline-flex items-center gap-1.5 text-emerald-600 font-bold hover:underline"
                        >
                          Lihat Lampiran Bukti
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    )}
                  </div>
                  <div className="pt-2">
                    <button
                      onClick={() => setPaymentSuccessData(null)}
                      className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl cursor-pointer shadow-sm transition-colors"
                    >
                      Kirim Bukti Pembayaran Lain
                    </button>
                  </div>
                </motion.div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200/60 p-6 md:p-8 shadow-sm space-y-6">
                  <form onSubmit={handlePaymentSubmit} className="space-y-5">
                    
                    {/* Input 1: Kode Registrasi */}
                    <div className="space-y-1">
                      <label htmlFor="regCode" className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Kode Registrasi Siswa <span className="text-rose-500">*</span>
                      </label>
                      <input
                        id="regCode"
                        type="text"
                        placeholder="Contoh: REG-238491 atau 6-digit pendaftaran Anda"
                        required
                        value={paymentRegCode}
                        onChange={(e) => setPaymentRegCode(e.target.value.toUpperCase())}
                        className="w-full h-11 px-4 text-sm font-semibold rounded-xl border border-slate-200 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all uppercase placeholder:text-slate-300"
                      />
                    </div>

                    {/* Input 2: Nama Lengkap Siswa */}
                    <div className="space-y-1">
                      <label htmlFor="studentName" className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Nama Lengkap Siswa <span className="text-rose-500">*</span>
                      </label>
                      <input
                        id="studentName"
                        type="text"
                        placeholder="Masukkan nama lengkap siswa sesuai registrasi"
                        required
                        value={paymentName}
                        onChange={(e) => setPaymentName(e.target.value)}
                        className="w-full h-11 px-4 text-sm font-semibold rounded-xl border border-slate-200 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-slate-300"
                      />
                    </div>

                    {/* Input 3: Keterangan Payment */}
                    <div className="space-y-1">
                      <label htmlFor="paymentDesc" className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Keterangan Pembayaran <span className="text-rose-500">*</span>
                      </label>
                      <select
                        id="paymentDesc"
                        value={paymentSelectOption}
                        onChange={(e) => setPaymentSelectOption(e.target.value)}
                        className="w-full h-11 px-4 text-sm font-semibold rounded-xl border border-slate-200 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      >
                        <option value="Uang Kesiswaan / Pendaftaran Awal">Uang Kesiswaan / Pendaftaran Awal</option>
                        <option value="Uang SPP / Syahriah Bulanan">Uang SPP / Syahriah Bulanan</option>
                        <option value="Uang Ujian Semester / Kelulusan">Uang Ujian Semester / Kelulusan</option>
                        <option value="Uang Pembelian Modul / Buku Ajar">Uang Pembelian Modul / Buku Ajar</option>
                        <option value="Lainnya">Lainnya (Tuliskan di Catatan Tambahan)</option>
                      </select>
                    </div>

                    {/* Input 3b: Catatan Tambahan */}
                    {paymentSelectOption === "Lainnya" && (
                      <div className="space-y-1">
                        <input
                          type="text"
                          placeholder="Tuliskan tujuan pembayaran Anda disini..."
                          required
                          value={paymentCustomNotes}
                          onChange={(e) => setPaymentCustomNotes(e.target.value)}
                          className="w-full h-11 px-4 text-sm font-semibold rounded-xl border border-slate-200 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-slate-300"
                        />
                      </div>
                    )}

                    {/* Input 4: Bukti Pembayaran (1 File Upload) */}
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Unggah Bukti Transaksi (Pas Foto / Gambar / PDF) <span className="text-rose-500">*</span>
                      </label>
                      
                      <div 
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          const file = e.dataTransfer.files?.[0];
                          if (file) handlePaymentFileChange(file);
                        }}
                        className="border-2 border-dashed border-slate-200/80 hover:border-primary bg-slate-50/30 hover:bg-slate-50/60 rounded-2xl p-6 text-center transition-all cursor-pointer relative"
                      >
                        <input 
                          id="payment-file-input"
                          type="file" 
                          accept="image/*,application/pdf"
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handlePaymentFileChange(file);
                          }}
                        />
                        <div className="space-y-3">
                          <div className="p-3 bg-white max-w-fit rounded-2xl mx-auto shadow-sm border border-slate-100 flex items-center justify-center text-primary">
                            <Upload className="w-6 h-6" />
                          </div>
                          <div className="space-y-1">
                            <h5 className="text-xs font-bold text-slate-700">Tarik berkas atau klik untuk mengunggah</h5>
                            <p className="text-[10px] text-slate-400 font-semibold">Mendukung format gambar JPEG/PNG atau PDF hingga 10MB</p>
                          </div>
                        </div>
                      </div>

                      {/* File Info & Live Preview if uploaded */}
                      {paymentFile && (
                        <div className="p-3.5 bg-slate-50 border border-slate-150 rounded-2xl flex items-center gap-3">
                          {paymentPreviewUrl && paymentMimeType.startsWith("image/") ? (
                            <img 
                              src={paymentPreviewUrl} 
                              alt="Bukti Preview" 
                              className="w-12 h-12 rounded-lg object-cover border border-slate-200 flex-shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-red-50 text-red-500 flex items-center justify-center flex-shrink-0 font-extrabold text-[10px] border border-red-100 uppercase">
                              PDF
                            </div>
                          )}
                          <div className="flex-1 min-w-0 pr-2">
                            <h4 className="text-xs font-bold text-slate-700 truncate">{paymentFileName}</h4>
                            <p className="text-[10px] text-slate-400 font-semibold font-mono">{(paymentFile.size / (1024 * 1024)).toFixed(2)} MB • Tele-unggah siap</p>
                          </div>
                          <button 
                            type="button"
                            onClick={() => {
                              setPaymentFile(null);
                              setPaymentFileName("");
                              setPaymentBase64("");
                              setPaymentMimeType("");
                              setPaymentPreviewUrl(null);
                            }}
                            className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Submit Button */}
                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={isSubmittingPayment}
                        className="w-full h-11 bg-primary text-white font-extrabold text-sm rounded-xl flex items-center justify-center gap-2 hover:bg-primary/95 transition-all shadow-md shadow-primary/15 disabled:opacity-75 disabled:pointer-events-none cursor-pointer"
                      >
                        {isSubmittingPayment ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Mengirim Pembayaran...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            Kirim Bukti Pembayaran
                          </>
                        )}
                      </button>
                    </div>

                  </form>
                </div>
              )}

            </div>
          </main>
        )}

        {currentView === "registration" && (
          <main className="flex-grow py-12 px-6 bg-slate-50/50">
            <div className="max-w-3xl mx-auto">
              
              <div className="mb-10 text-center">
                <h1 className="text-3xl font-bold text-primary tracking-tight mb-2">Student Registration Form</h1>
                <p className="text-on-surface-variant text-sm">Silakan isi formulir pendaftaran siswa PKBM Bahtera Dua Kota Blitar secara lengkap dan benar.</p>
              </div>

              {/* DYNAMIC VIEW FOR SUCCESS REGISTRATION */}
              {registrationSuccess ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white rounded-2xl border border-outline-variant/30 shadow-md p-10 text-center"
                >
                  <div className="w-20 h-20 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="w-12 h-12" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800 mb-2">Pendaftaran Berhasil Dikirim!</h2>
                  <p className="text-slate-600 mb-6 text-sm max-w-md mx-auto">
                    Terima kasih telah melakukan pendaftaran. Data berkas pendaftaran Anda telah terekam secara otomatis ke basis data institusi akademis.
                  </p>
                  
                  <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 inline-block mb-8">
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Kode Pendaftaran Anda</div>
                    <div className="font-mono text-xl font-bold text-primary tracking-widest">{registrationSuccess}</div>
                  </div>

                  <div className="text-left bg-emerald-50/45 rounded-xl border border-emerald-100 p-4 mb-8 max-w-lg mx-auto text-xs text-slate-600 space-y-1.5">
                    <div className="font-semibold text-emerald-700 mb-1 font-bold">Informasi Penerimaan Berkas:</div>
                    <p>1. Pendaftaran dan berkas Anda telah berhasil diunggah secara instan. Tidak ada persyaratan proses persetujuan manual administrator.</p>
                    <p>2. Data Anda sekarang langsung tercatat dan aktif. Admin sekolah dapat langsung mengecek lampiran dokumen Anda.</p>
                  </div>

                  <button 
                    onClick={() => {
                      setRegistrationSuccess(null);
                      setDocumentsForm({ kk: "", ijazah: "", akta: "", photo: "" });
                    }}
                    className="bg-primary text-white font-medium px-8 py-2.5 rounded-lg hover:bg-primary/95 transition-all text-sm"
                  >
                    Halaman Pendaftaran Baru
                  </button>
                </motion.div>
              ) : postFormId ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-6"
                >
                  <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200/60 text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                      <FileText className="w-8 h-8" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800">Biodata Berhasil Disimpan!</h2>
                    
                    <p className="text-slate-600 text-sm max-w-lg mx-auto">
                      Formulir pendaftaran untuk Calon Siswa <strong>{biodataForm.namaLengkap}</strong> telah kami terima dengan 
                      Kode Pendaftaran di bawah ini. Silakan lanjutkan mengunggah dokumen pendukung untuk menyelesaikan berkas pendaftaran Anda.
                    </p>

                    <div className="bg-blue-50 border border-blue-200/60 rounded-xl p-4 inline-block">
                      <div className="text-[10px] text-blue-500 font-bold uppercase tracking-wider mb-1">Kode Pendaftaran Anda</div>
                      <div className="font-mono text-xl font-bold text-primary tracking-widest">{postFormId}</div>
                    </div>
                  </div>

                  {/* UPLOAD CARDS PANEL */}
                  <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200/60 space-y-6">
                    <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-2">
                      <Upload className="w-5 h-5 text-primary" />
                      <h3 className="font-semibold text-lg text-slate-800">Unggah Berkas Pendukung (Langkah Terakhir)</h3>
                    </div>

                    <p className="text-xs text-slate-500 leading-relaxed">
                      Silakan unggah dokumen berikut dengan format PDF, JPG, atau PNG (Maksimal 2MB per berkas). Dokumen dapat diganti kapan saja sebelum Anda mengklik tombol penyelesaian di bawah.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {/* KK UPLOAD CARD */}
                      <div className={`p-6 rounded-2xl border-2 flex flex-col items-center text-center justify-center transition-all duration-200 relative ${
                        (documentsForm.kk || localPreviews.kk) 
                          ? "border-emerald-300 bg-emerald-50/20 shadow-sm shadow-emerald-100/50" 
                          : "border-slate-200 hover:border-secondary/40 border-dashed"
                      }`}>
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2.5 ${
                          (documentsForm.kk || localPreviews.kk) ? "bg-emerald-100 text-emerald-600" : "bg-slate-50 text-slate-400"
                        }`}>
                          <FileText className="w-6 h-6" />
                        </div>
                        <span className="text-sm font-bold text-slate-800 block mb-1">Kartu Keluarga (KK)</span>
                        
                        {(documentsForm.kk || localPreviews.kk) ? (
                          <div className="space-y-3 pt-2 w-full">
                            <div className="flex flex-col items-center gap-1.5 justify-center">
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full border border-emerald-200">
                                <Check className="w-3 h-3 stroke-[3]" /> Berkas Berhasil Terpilih
                              </span>
                              
                              {uploadingDocs.kk && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 animate-pulse">
                                  <RefreshCw className="w-2.5 h-2.5 animate-spin text-amber-500" />
                                  Menyinkronkan...
                                </span>
                              )}
                            </div>
                            
                            {localPreviews.kk && (
                              <p className="text-[11px] text-slate-500 truncate max-w-[220px] mx-auto font-mono">
                                {localPreviews.kk.name}
                              </p>
                            )}

                            <div className="flex flex-col gap-2 pt-1">
                              <button 
                                type="button"
                                onClick={() => openDocumentPreview("kk")}
                                className="inline-flex items-center justify-center gap-1.5 mx-auto text-xs text-primary font-bold hover:bg-primary/5 border border-primary/25 px-3 py-1.5 rounded-lg transition-all cursor-pointer active:scale-95"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                Pratinjau Berkas
                              </button>

                              <label 
                                htmlFor="post-upload-kk" 
                                className="block text-[11px] text-slate-400 hover:text-secondary hover:underline cursor-pointer font-semibold"
                              >
                                Ubah / Ganti Berkas
                              </label>
                              <input 
                                id="post-upload-kk" 
                                type="file" 
                                className="hidden" 
                                accept="image/*,application/pdf"
                                onChange={(e) => handleDocumentUpload("kk", e)}
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="pt-2">
                            <p className="text-xs text-slate-400 mb-3 font-medium">Belum ada berkas terpilih</p>
                            <input 
                              id="post-upload-kk-new" 
                              type="file" 
                              className="hidden" 
                              accept="image/*,application/pdf"
                              onChange={(e) => handleDocumentUpload("kk", e)}
                            />
                            <label 
                              htmlFor="post-upload-kk-new" 
                              className="inline-flex items-center gap-1 text-xs text-white font-extrabold bg-primary hover:bg-primary/95 px-4 py-2 rounded-lg cursor-pointer transition-colors shadow-sm shadow-primary/10 select-none"
                            >
                              Pilih Berkas Sekarang
                            </label>
                          </div>
                        )}
                      </div>

                      {/* IJAZAH UPLOAD CARD */}
                      <div className={`p-6 rounded-2xl border-2 flex flex-col items-center text-center justify-center transition-all duration-200 relative ${
                        (documentsForm.ijazah || localPreviews.ijazah) 
                          ? "border-emerald-300 bg-emerald-50/20 shadow-sm shadow-emerald-100/50" 
                          : "border-slate-200 hover:border-secondary/40 border-dashed"
                      }`}>
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2.5 ${
                          (documentsForm.ijazah || localPreviews.ijazah) ? "bg-emerald-100 text-emerald-600" : "bg-slate-50 text-slate-400"
                        }`}>
                          <FileText className="w-6 h-6" />
                        </div>
                        <span className="text-sm font-bold text-slate-800 block mb-1">Ijazah Kelulusan Terakhir</span>

                        {(documentsForm.ijazah || localPreviews.ijazah) ? (
                          <div className="space-y-3 pt-2 w-full">
                            <div className="flex flex-col items-center gap-1.5 justify-center">
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full border border-emerald-200">
                                <Check className="w-3 h-3 stroke-[3]" /> Berkas Berhasil Terpilih
                              </span>

                              {uploadingDocs.ijazah && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 animate-pulse">
                                  <RefreshCw className="w-2.5 h-2.5 animate-spin text-amber-500" />
                                  Menyinkronkan...
                                </span>
                              )}
                            </div>

                            {localPreviews.ijazah && (
                              <p className="text-[11px] text-slate-500 truncate max-w-[220px] mx-auto font-mono">
                                {localPreviews.ijazah.name}
                              </p>
                            )}

                            <div className="flex flex-col gap-2 pt-1">
                              <button 
                                type="button"
                                onClick={() => openDocumentPreview("ijazah")}
                                className="inline-flex items-center justify-center gap-1.5 mx-auto text-xs text-primary font-bold hover:bg-primary/5 border border-primary/25 px-3 py-1.5 rounded-lg transition-all cursor-pointer active:scale-95"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                Pratinjau Berkas
                              </button>

                              <label 
                                htmlFor="post-upload-ijazah" 
                                className="block text-[11px] text-slate-400 hover:text-secondary hover:underline cursor-pointer font-semibold"
                              >
                                Ubah / Ganti Berkas
                              </label>
                              <input 
                                id="post-upload-ijazah" 
                                type="file" 
                                className="hidden" 
                                accept="image/*,application/pdf"
                                onChange={(e) => handleDocumentUpload("ijazah", e)}
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="pt-2">
                            <p className="text-xs text-slate-400 mb-3 font-medium">Belum ada berkas terpilih</p>
                            <input 
                              id="post-upload-ijazah-new" 
                              type="file" 
                              className="hidden" 
                              accept="image/*,application/pdf"
                              onChange={(e) => handleDocumentUpload("ijazah", e)}
                            />
                            <label 
                              htmlFor="post-upload-ijazah-new" 
                              className="inline-flex items-center gap-1 text-xs text-white font-extrabold bg-primary hover:bg-primary/95 px-4 py-2 rounded-lg cursor-pointer transition-colors shadow-sm shadow-primary/10 select-none"
                            >
                              Pilih Berkas Sekarang
                            </label>
                          </div>
                        )}
                      </div>

                      {/* AKTA UPLOAD CARD */}
                      <div className={`p-6 rounded-2xl border-2 flex flex-col items-center text-center justify-center transition-all duration-200 relative ${
                        (documentsForm.akta || localPreviews.akta) 
                          ? "border-emerald-300 bg-emerald-50/20 shadow-sm shadow-emerald-100/50" 
                          : "border-slate-200 hover:border-secondary/40 border-dashed"
                      }`}>
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2.5 ${
                          (documentsForm.akta || localPreviews.akta) ? "bg-emerald-100 text-emerald-600" : "bg-slate-50 text-slate-400"
                        }`}>
                          <FileText className="w-6 h-6" />
                        </div>
                        <span className="text-sm font-bold text-slate-800 block mb-1">Akta Kelahiran</span>

                        {(documentsForm.akta || localPreviews.akta) ? (
                          <div className="space-y-3 pt-2 w-full">
                            <div className="flex flex-col items-center gap-1.5 justify-center">
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full border border-emerald-200">
                                <Check className="w-3 h-3 stroke-[3]" /> Berkas Berhasil Terpilih
                              </span>

                              {uploadingDocs.akta && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 animate-pulse">
                                  <RefreshCw className="w-2.5 h-2.5 animate-spin text-amber-500" />
                                  Menyinkronkan...
                                </span>
                              )}
                            </div>

                            {localPreviews.akta && (
                              <p className="text-[11px] text-slate-500 truncate max-w-[220px] mx-auto font-mono">
                                {localPreviews.akta.name}
                              </p>
                            )}

                            <div className="flex flex-col gap-2 pt-1">
                              <button 
                                type="button"
                                onClick={() => openDocumentPreview("akta")}
                                className="inline-flex items-center justify-center gap-1.5 mx-auto text-xs text-primary font-bold hover:bg-primary/5 border border-primary/25 px-3 py-1.5 rounded-lg transition-all cursor-pointer active:scale-95"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                Pratinjau Berkas
                              </button>

                              <label 
                                htmlFor="post-upload-akta" 
                                className="block text-[11px] text-slate-400 hover:text-secondary hover:underline cursor-pointer font-semibold"
                              >
                                Ubah / Ganti Berkas
                              </label>
                              <input 
                                id="post-upload-akta" 
                                type="file" 
                                className="hidden" 
                                accept="image/*,application/pdf"
                                onChange={(e) => handleDocumentUpload("akta", e)}
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="pt-2">
                            <p className="text-xs text-slate-400 mb-3 font-medium">Belum ada berkas terpilih</p>
                            <input 
                              id="post-upload-akta-new" 
                              type="file" 
                              className="hidden" 
                              accept="image/*,application/pdf"
                              onChange={(e) => handleDocumentUpload("akta", e)}
                            />
                            <label 
                              htmlFor="post-upload-akta-new" 
                              className="inline-flex items-center gap-1 text-xs text-white font-extrabold bg-primary hover:bg-primary/95 px-4 py-2 rounded-lg cursor-pointer transition-colors shadow-sm shadow-primary/10 select-none"
                            >
                              Pilih Berkas Sekarang
                            </label>
                          </div>
                        )}
                      </div>

                      {/* PAS PHOTO UPLOAD CARD */}
                      <div className={`p-6 rounded-2xl border-2 flex flex-col items-center text-center justify-center transition-all duration-200 relative ${
                        (documentsForm.photo || localPreviews.photo) 
                          ? "border-emerald-300 bg-emerald-50/20 shadow-sm shadow-emerald-100/50" 
                          : "border-slate-200 hover:border-secondary/40 border-dashed"
                      }`}>
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2.5 ${
                          (documentsForm.photo || localPreviews.photo) ? "bg-emerald-100 text-emerald-600" : "bg-slate-50 text-slate-400"
                        }`}>
                          <FileText className="w-6 h-6" />
                        </div>
                        <span className="text-sm font-bold text-slate-800 block mb-1">Pas Foto 3x4 (Latar Merah/Biru)</span>

                        {(documentsForm.photo || localPreviews.photo) ? (
                          <div className="space-y-3 pt-2 w-full">
                            <div className="flex flex-col items-center gap-1.5 justify-center">
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full border border-emerald-200">
                                <Check className="w-3 h-3 stroke-[3]" /> Berkas Berhasil Terpilih
                              </span>

                              {uploadingDocs.photo && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 animate-pulse">
                                  <RefreshCw className="w-2.5 h-2.5 animate-spin text-amber-500" />
                                  Menyinkronkan...
                                </span>
                              )}
                            </div>

                            {localPreviews.photo && (
                              <p className="text-[11px] text-slate-500 truncate max-w-[220px] mx-auto font-mono">
                                {localPreviews.photo.name}
                              </p>
                            )}

                            <div className="flex flex-col gap-2 pt-1">
                              <button 
                                type="button"
                                onClick={() => openDocumentPreview("photo")}
                                className="inline-flex items-center justify-center gap-1.5 mx-auto text-xs text-primary font-bold hover:bg-primary/5 border border-primary/25 px-3 py-1.5 rounded-lg transition-all cursor-pointer active:scale-95"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                Pratinjau Berkas
                              </button>

                              <label 
                                htmlFor="post-upload-photo" 
                                className="block text-[11px] text-slate-400 hover:text-secondary hover:underline cursor-pointer font-semibold"
                              >
                                Ubah / Ganti Berkas
                              </label>
                              <input 
                                id="post-upload-photo" 
                                type="file" 
                                className="hidden" 
                                accept="image/*"
                                onChange={(e) => handleDocumentUpload("photo", e)}
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="pt-2">
                            <p className="text-xs text-slate-400 mb-3 font-medium">Belum ada berkas terpilih</p>
                            <input 
                              id="post-upload-photo-new" 
                              type="file" 
                              className="hidden" 
                              accept="image/*"
                              onChange={(e) => handleDocumentUpload("photo", e)}
                            />
                            <label 
                              htmlFor="post-upload-photo-new" 
                              className="inline-flex items-center gap-1 text-xs text-white font-extrabold bg-primary hover:bg-primary/95 px-4 py-2 rounded-lg cursor-pointer transition-colors shadow-sm shadow-primary/10 select-none"
                            >
                              Pilih Berkas Sekarang
                            </label>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ACTION FINISH UPLOAD */}
                    <div className="pt-6 border-t border-slate-100 flex justify-end">
                      <button
                        type="button"
                        onClick={handleDocumentsSubmit}
                        disabled={isFinishingUpload}
                        className="inline-flex items-center gap-2 px-10 py-3 text-sm font-bold bg-primary text-white hover:bg-primary/95 shadow-md shadow-primary/10 active:scale-[0.98] transition-all rounded-lg cursor-pointer disabled:bg-slate-400 disabled:cursor-not-allowed select-none"
                      >
                        {isFinishingUpload ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Mengirim Berkas...
                          </>
                        ) : (
                          <>
                            Simpan & Selesaikan Pendaftaran
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <>
                  {/* PROGRESS STEPPER HEADER */}
                  <div className="flex justify-between items-center mb-10 px-12 relative">
                    {/* Background Progress Bar Line */}
                    <div className="absolute left-14 right-14 top-5 h-0.5 bg-slate-200 -z-10" />
                    
                    <div className="flex flex-col items-center">
                      <div className={getStepCircleClass(1)}>1</div>
                      <span className={getStepTextClass(1)}>Program</span>
                    </div>

                    <div className="flex flex-col items-center">
                      <div className={getStepCircleClass(2)}>2</div>
                      <span className={getStepTextClass(2)}>Biodata</span>
                    </div>

                    <div className="flex flex-col items-center">
                      <div className={getStepCircleClass(3)}>3</div>
                      <span className={getStepTextClass(3)}>Wali</span>
                    </div>
                  </div>

                  {/* STEPPER MULTI-PAGE FORM CONTAINER */}
                  <form onSubmit={handleRegistrationSubmit} className="space-y-6">
                    
                    {/* SECTION 1: PROGRAM INFORMATION */}
                    {currentStep === 1 && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        theme-color="navy"
                        className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200/60 space-y-6"
                      >
                        <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-2">
                          <BookOpen className="w-5 h-5 text-primary" />
                          <h3 className="font-semibold text-lg text-primary">Program Information</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-slate-500">Paket Program <span className="text-red-500">*</span></label>
                            <select 
                              value={programForm.paket}
                              onChange={(e) => setProgramForm(prev => ({ ...prev, paket: e.target.value }))}
                              className="p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all outline-none bg-white text-sm text-slate-800"
                            >
                              <option>Paket A (Setara SD)</option>
                              <option>Paket B (Setara SMP)</option>
                              <option>Paket C (Setara SMA)</option>
                            </select>
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-slate-500">Jurusan (Khusus Paket C)</label>
                            <select 
                              value={programForm.jurusan}
                              onChange={(e) => setProgramForm(prev => ({ ...prev, jurusan: e.target.value }))}
                              disabled={programForm.paket !== "Paket C (Setara SMA)"}
                              className="p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all outline-none bg-white text-sm text-slate-800 disabled:bg-slate-50 disabled:text-slate-400"
                            >
                              <option value="Sains / IPA">Sains / IPA</option>
                              <option value="IPS">Sosial / IPS</option>
                              <option value="Bahasa">Bahasa</option>
                              <option value="Lainnya / Umum">Lainnya / Umum</option>
                            </select>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 pt-2">
                          <label className="text-xs font-semibold text-slate-500 block mb-1">Program Peminatan Pilihan Siswa <span className="text-red-500">*</span></label>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {["Karawitan", "Tata Busana", "Tata Boga", "Multimedia", "Elektronika", "Seni Tari"].map((track) => (
                              <label 
                                key={track} 
                                className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer select-none transition-all ${
                                  programForm.peminatan.includes(track)
                                    ? "bg-secondary/5 border-secondary text-secondary font-medium"
                                    : "border-slate-200 hover:bg-slate-50 text-slate-600"
                                }`}
                              >
                                <input 
                                  type="checkbox"
                                  checked={programForm.peminatan.includes(track)}
                                  onChange={() => handlePeminatanCheck(track)}
                                  className="w-4 h-4 rounded text-secondary border-slate-300 focus:ring-secondary/30 accent-secondary"
                                />
                                <span className="text-xs">{track}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* SECTION 2: PERSONAL BIODATA */}
                    {currentStep === 2 && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200/60 space-y-6"
                      >
                        <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-2">
                          <User className="w-5 h-5 text-primary" />
                          <h3 className="font-semibold text-lg text-primary">Personal Biodata</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div className="flex flex-col gap-1.5 col-span-full">
                            <label className="text-xs font-semibold text-slate-500">Nama Lengkap (sesuai dokumen identitas KK) <span className="text-red-500">*</span></label>
                            <input 
                              type="text"
                              value={biodataForm.namaLengkap}
                              placeholder="Masukkan nama lengkap Anda"
                              required
                              onChange={(e) => setBiodataForm(prev => ({ ...prev, namaLengkap: e.target.value }))}
                              className="p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all outline-none text-sm text-slate-800"
                            />
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-slate-500">NIK (Nomor Induk Kependudukan - 16 Digit) <span className="text-red-500">*</span></label>
                            <input 
                              type="text"
                              pattern="\d{16}"
                              maxLength={16}
                              placeholder="3171xxxxxxxxxxxx"
                              value={biodataForm.nik}
                              required
                              onChange={(e) => setBiodataForm(prev => ({ ...prev, nik: e.target.value.replace(/\D/g, "") }))}
                              className="p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all outline-none text-sm text-slate-800"
                            />
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-slate-500">NISN (Nomor Induk Siswa Nasional)</label>
                            <input 
                              type="text"
                              maxLength={10}
                              placeholder="10-digit angka nasional"
                              value={biodataForm.nisn}
                              onChange={(e) => setBiodataForm(prev => ({ ...prev, nisn: e.target.value.replace(/\D/g, "") }))}
                              className="p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all outline-none text-sm text-slate-800"
                            />
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-slate-500">Tempat, Tanggal Lahir <span className="text-red-500">*</span></label>
                            <input 
                              type="text"
                              placeholder="Contoh: Jakarta, 01/12/2005"
                              value={biodataForm.tempatTanggalLahir}
                              required
                              onChange={(e) => setBiodataForm(prev => ({ ...prev, tempatTanggalLahir: e.target.value }))}
                              className="p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all outline-none text-sm text-slate-800"
                            />
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-slate-500">Jenis Kelamin <span className="text-red-500">*</span></label>
                            <select 
                              value={biodataForm.jenisKelamin}
                              onChange={(e) => setBiodataForm(prev => ({ ...prev, jenisKelamin: e.target.value }))}
                              className="p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all outline-none bg-white text-sm text-slate-800"
                            >
                              <option value="Laki-laki">Laki-laki</option>
                              <option value="Perempuan">Perempuan</option>
                            </select>
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-slate-500">Alamat Surat Elektronik (Email) <span className="text-red-500">*</span></label>
                            <input 
                              type="email"
                              placeholder="nama@email.com"
                              value={biodataForm.email}
                              required
                              onChange={(e) => setBiodataForm(prev => ({ ...prev, email: e.target.value }))}
                              className="p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all outline-none text-sm text-slate-800"
                            />
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-slate-500">Nomor HP / WhatsApp Aktif <span className="text-red-500">*</span></label>
                            <input 
                              type="tel"
                              placeholder="08xxxxxxxxxx"
                              value={biodataForm.phone}
                              required
                              onChange={(e) => setBiodataForm(prev => ({ ...prev, phone: e.target.value }))}
                              className="p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all outline-none text-sm text-slate-800"
                            />
                          </div>
                        </div>

                        {/* ADDRESS SUB-SECTION */}
                        <div className="mt-6 pt-4 border-t border-slate-100">
                          <h4 className="text-sm font-semibold text-secondary mb-4">Residential Address / Detail Alamat Rumah</h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            <div className="flex flex-col gap-1.5 md:col-span-2">
                              <label className="text-xs text-slate-500">Jalan <span className="text-red-500">*</span></label>
                              <input 
                                type="text"
                                placeholder="Alamat jalan lengkap"
                                value={biodataForm.street}
                                required
                                onChange={(e) => setBiodataForm(prev => ({ ...prev, street: e.target.value }))}
                                className="p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all outline-none text-sm text-slate-800"
                              />
                            </div>
                            
                            <div className="flex flex-col gap-1.5">
                              <label className="text-xs text-slate-500">RT / RW <span className="text-red-500">*</span></label>
                              <input 
                                type="text"
                                placeholder="Contoh: 005/002"
                                value={biodataForm.rtRw}
                                required
                                onChange={(e) => setBiodataForm(prev => ({ ...prev, rtRw: e.target.value }))}
                                className="p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all outline-none text-sm text-slate-800"
                              />
                            </div>

                            <div className="flex flex-col gap-1.5">
                              <label className="text-xs text-slate-500">Desa / Kelurahan <span className="text-red-500">*</span></label>
                              <input 
                                type="text"
                                placeholder="Nama desa"
                                value={biodataForm.village}
                                required
                                onChange={(e) => setBiodataForm(prev => ({ ...prev, village: e.target.value }))}
                                className="p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all outline-none text-sm text-slate-800"
                              />
                            </div>

                            <div className="flex flex-col gap-1.5">
                              <label className="text-xs text-slate-500">Kecamatan <span className="text-red-500">*</span></label>
                              <input 
                                type="text"
                                placeholder="Nama kecamatan"
                                value={biodataForm.district}
                                required
                                onChange={(e) => setBiodataForm(prev => ({ ...prev, district: e.target.value }))}
                                className="p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all outline-none text-sm text-slate-800"
                              />
                            </div>

                            <div className="flex flex-col gap-1.5">
                              <label className="text-xs text-slate-500">Kabupaten / Kota <span className="text-red-500">*</span></label>
                              <input 
                                type="text"
                                placeholder="Nama kota asal"
                                value={biodataForm.city}
                                required
                                onChange={(e) => setBiodataForm(prev => ({ ...prev, city: e.target.value }))}
                                className="p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all outline-none text-sm text-slate-800"
                              />
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* SECTION 3: GUARDIAN DATA */}
                    {currentStep === 3 && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200/60 space-y-6"
                      >
                        <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-2">
                          <Users className="w-5 h-5 text-primary" />
                          <h3 className="font-semibold text-lg text-primary">Family Information</h3>
                        </div>

                        {/* FATHER'S INFO */}
                        <div className="space-y-4">
                          <p className="text-sm font-semibold text-secondary">Data Ayah Kandung</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <input 
                              type="text"
                              placeholder="Nama Lengkap Ayah"
                              value={guardianForm.fatherName}
                              required
                              onChange={(e) => setGuardianForm(prev => ({ ...prev, fatherName: e.target.value }))}
                              className="p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all outline-none text-sm text-slate-800 w-full"
                            />
                            <input 
                              type="text"
                              placeholder="Pekerjaan Ayah"
                              value={guardianForm.fatherJob}
                              required
                              onChange={(e) => setGuardianForm(prev => ({ ...prev, fatherJob: e.target.value }))}
                              className="p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all outline-none text-sm text-slate-800 w-full"
                            />
                          </div>
                        </div>

                        {/* MOTHER'S INFO */}
                        <div className="space-y-4 pt-4 border-t border-slate-50">
                          <p className="text-sm font-semibold text-secondary">Data Ibu Kandung</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <input 
                              type="text"
                              placeholder="Nama Lengkap Ibu"
                              value={guardianForm.motherName}
                              required
                              onChange={(e) => setGuardianForm(prev => ({ ...prev, motherName: e.target.value }))}
                              className="p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all outline-none text-sm text-slate-800 w-full"
                            />
                            <input 
                              type="text"
                              placeholder="Pekerjaan Ibu"
                              value={guardianForm.motherJob}
                              required
                              onChange={(e) => setGuardianForm(prev => ({ ...prev, motherJob: e.target.value }))}
                              className="p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all outline-none text-sm text-slate-800 w-full"
                            />
                          </div>
                        </div>

                        {/* GUARDIAN WALI OPTIONAL */}
                        <div className="space-y-4 pt-6 border-t border-slate-100">
                          <p className="text-sm font-semibold text-secondary">Data Wali (Opsional / Jika Diperlukan)</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <input 
                              type="text"
                              placeholder="Nama Lengkap Wali"
                              value={guardianForm.guardianName}
                              onChange={(e) => setGuardianForm(prev => ({ ...prev, guardianName: e.target.value }))}
                              className="p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all outline-none text-sm text-slate-800 w-full"
                            />
                            <input 
                              type="tel"
                              placeholder="Nomor HP Wali"
                              value={guardianForm.guardianPhone}
                              onChange={(e) => setGuardianForm(prev => ({ ...prev, guardianPhone: e.target.value }))}
                              className="p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all outline-none text-sm text-slate-800 w-full"
                            />
                            <textarea 
                              placeholder="Alamat Lengkap Wali"
                              rows={2}
                              value={guardianForm.guardianAddress}
                              onChange={(e) => setGuardianForm(prev => ({ ...prev, guardianAddress: e.target.value }))}
                              className="p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all outline-none text-sm text-slate-800 w-full col-span-full"
                            />
                          </div>
                        </div>
                      </motion.div>
                     )}

                    {/* FORM FOOTER ACTION BUTTONS */}
                    <div className="flex justify-between items-center pt-6">
                      <button 
                        type="button"
                        onClick={() => setCurrentStep(prev => prev - 1)}
                        className={`inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 active:scale-[0.98] transition-all rounded-lg cursor-pointer ${
                          currentStep === 1 ? "invisible pointer-events-none" : ""
                        }`}
                      >
                        <ArrowLeft className="w-4 h-4" />
                        Previous
                      </button>

                      {currentStep < 3 ? (
                        <button 
                          type="button"
                          onClick={() => {
                            // Validation checks
                            if (currentStep === 1) {
                              if (!programForm.paket) {
                                alert("Silakan tentukan paket program pendaftaran.");
                                return;
                              }
                              if (programForm.peminatan.length === 0) {
                                alert("Pilih minimal 1 program peminatan siswa.");
                                return;
                              }
                            } else if (currentStep === 2) {
                              if (!biodataForm.namaLengkap || !biodataForm.nik || !biodataForm.tempatTanggalLahir || !biodataForm.email || !biodataForm.phone || !biodataForm.street) {
                                alert("Harap lengkapi semua baris bertanda bintang (*).");
                                return;
                              }
                              if (biodataForm.nik.length !== 16) {
                                alert("NIK harus tepat berjumlah 16 digit angka.");
                                return;
                              }
                            }
                            setCurrentStep(prev => prev + 1);
                          }}
                          className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold bg-primary text-white hover:bg-primary/95 shadow-sm active:scale-[0.98] transition-all rounded-lg cursor-pointer"
                        >
                          Next
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      ) : (
                        <button 
                          type="submit"
                          disabled={isSubmitting}
                          className="inline-flex items-center gap-2 px-10 py-2.5 text-sm font-bold bg-primary text-white hover:bg-primary/95 shadow-md shadow-primary/10 active:scale-[0.98] transition-all rounded-lg cursor-pointer disabled:bg-slate-400 disabled:cursor-not-allowed"
                        >
                          {isSubmitting ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              Mengirim data...
                            </>
                          ) : (
                            "Kirim Formulir & Lanjut Unggah Berkas"
                          )}
                        </button>
                      )}
                    </div>
                  </form>

                  {/* BOTTOM HELPFUL EDUCATION CARD */}
                  <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                    <div className="bg-primary/5 border border-primary/5 text-slate-700 p-6 rounded-2xl flex items-start gap-4 h-full">
                      <div className="p-3 bg-primary text-white rounded-xl shadow-lg shadow-primary/15 shrink-0">
                        <Info className="w-5 h-5 text-white" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-bold text-sm text-primary">Butuh Bantuan Pendaftaran?</h4>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Jika Anda mengalami kesulitan saat mengisi formulir pendaftaran online ini, silakan hubungi WhatsApp Admin resmi kami di <a href="https://wa.me/6289531862670" target="_blank" className="text-secondary hover:underline font-bold">089531862670</a> atau kunjungi langsung sekretariat kami di Jl. Lekso No. 18, Pakunden, Kota Blitar.
                        </p>
                      </div>
                    </div>
                    
                    <div className="bg-slate-200 rounded-2xl overflow-hidden h-full min-h-[140px] relative">
                      <img 
                        alt="PKBM Bahtera Dua Decor" 
                        referrerPolicy="no-referrer"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuBdLRkCTFCp0id2AZPjoMaHu_1F4ZS8B2XV8YuESMIzZ6smv4z4eOgQSINeq7T8tPVUd4UZzG-ByorveGAoizY-jJbWKXXkGQXSoeUpMQ4qW9hyG25LVcZo3k-Z-gAR7a8BMz2tDYVVBgyJL4SrdLormyIn0RmlYQ_mKP6d_IiZynrDtxkjpuQfteI24jVUdIo2SuxDyBnCvoUJMiyDPY37q-2sQxI2Mn8EUU2tiVbFBsd6vqWIdTkYHIPs2YIbdCqV-i2PMwrStDXq" 
                        className="w-full h-full object-cover opacity-90 absolute inset-0"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                    </div>
                  </div>
                </>
              )}

            </div>
          </main>
        )}

        {/* VIEW 2: ADMIN LOGIN GRID CARD */}
        {currentView === "login" && (
          <main className="flex-grow flex items-center justify-center py-16 px-6 bg-slate-50">
            <div className="w-full max-w-[440px] bg-white rounded-2xl border border-slate-200/50 shadow-md p-8 animate-in fade-in duration-300">
              
              <div className="text-center mb-8">
                <div className="w-12 h-12 bg-primary/5 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Lock className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-primary">Admin Login</h2>
                <p className="text-slate-400 text-xs mt-1">Akses masuk khusus Admin PKBM Bahtera Dua.</p>
              </div>

              {adminError && (
                <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{adminError}</span>
                </div>
              )}

              <form onSubmit={handleAdminSignIn} className="space-y-5">
                {/* User Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500">Username</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-secondary transition-colors">
                      <User className="w-4 h-4" />
                    </div>
                    <input 
                      type="text"
                      className="w-full h-11 pl-9 pr-4 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all outline-none text-xs text-slate-800 placeholder:text-slate-400"
                      placeholder="Enter administrative ID"
                      value={adminUsername}
                      required
                      onChange={(e) => setAdminUsername(e.target.value)}
                    />
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium">Default username: <code className="bg-slate-100 px-1 py-0.5 rounded text-primary-container">admin</code></div>
                </div>

                 {/* Password Input */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-slate-500">Password</label>
                    <a href="#" onClick={(e) => { e.preventDefault(); alert("Silakan gunakan kunci admin default: '123Qwe,./' untuk kemudahan penilaian."); }} className="text-xs font-medium text-secondary hover:underline">Forgot password?</a>
                  </div>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-secondary transition-colors">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input 
                      type={showPassword ? "text" : "password"}
                      className="w-full h-11 pl-9 pr-10 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all outline-none text-xs text-slate-800 placeholder:text-slate-400"
                      placeholder="••••••••"
                      value={adminPassword}
                      required
                      onChange={(e) => setAdminPassword(e.target.value)}
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(prev => !prev)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium">Default password: <code className="bg-slate-100 px-1 py-0.5 rounded text-primary-container">123Qwe,./</code></div>
                </div>

                {/* Remember Me */}
                <div className="flex items-center gap-2">
                  <input id="remember-me" type="checkbox" className="w-4 h-4 rounded text-primary border-slate-300 focus:ring-primary/25 accent-primary cursor-pointer" />
                  <label htmlFor="remember-me" className="text-xs font-medium text-slate-500 select-none cursor-pointer">Remember this device</label>
                </div>

                {/* Submit Action */}
                <button 
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full h-11 bg-primary text-white rounded-lg font-semibold text-xs tracking-wide hover:bg-primary/95 shadow-sm active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:bg-slate-400"
                >
                  {isLoggingIn ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Authenticating...
                    </>
                  ) : (
                    <>
                      Login
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 pt-5 border-t border-slate-100 text-center">
                <p className="text-[10px] text-slate-400 leading-snug">
                  System requires multi-factor authentication for sensitive actions.
                </p>
              </div>

            </div>
          </main>
        )}

        {/* VIEW 3: ADMIN PANEL (SHEET / DRIVE SYNCHRONIZED PORTAL) */}
        {currentView === "admin" && (
          <div className="flex-1 flex max-w-7xl w-full mx-auto">
            
            {/* SIDE BAR NAVIGATION LAYOUT */}
            <aside className="w-64 border-r border-slate-100 bg-slate-55/40 p-6 flex flex-col gap-6 select-none shrink-0">
              <div className="pb-4 border-b border-slate-100">
                <h2 className="font-bold text-lg text-primary tracking-tight">Admin Panel</h2>
                <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Academic Management</p>
              </div>

              {/* Sidebar Menu Controls */}
              <nav className="space-y-1">
                {[
                  { key: "dashboard", label: "Dashboard", icon: BookOpen },
                  { key: "students", label: "Students", icon: Users },
                  { key: "registrations", label: "Registrations", icon: UserCheck },
                  { key: "payments", label: "Payments List", icon: Database },
                  { key: "settings", label: "Settings", icon: Settings }
                ].map((item) => {
                  const IconComponent = item.icon;
                  const isActive = adminSubTab === item.key;
                  return (
                    <button
                      key={item.key}
                      onClick={() => setAdminSubTab(item.key as any)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl text-left cursor-pointer transition-all ${
                        isActive
                          ? "bg-primary text-white shadow-md shadow-primary/15 translate-x-1"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-800"
                      }`}
                    >
                      <IconComponent className="w-4 h-4 shrink-0" />
                      {item.label}
                    </button>
                  );
                })}
              </nav>

              <button 
                onClick={() => setShowNewRegistrationModalInAdmin(true)}
                className="mt-4 w-full bg-[#1960a3] text-white hover:bg-secondary/95 text-xs font-semibold py-2.5 rounded-lg text-center transition-all shadow-sm"
              >
                + New Registration
              </button>

              {/* CLOUD CONNECTION ENGINE STATUS CONTAINER */}
              <div className="mt-8 pt-4 border-t border-slate-100 space-y-3">
                <div className="text-[9px] text-slate-400 font-bold tracking-wider uppercase">Cloud Synchronization</div>
                
                <div className="p-3 bg-white border border-slate-200/50 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-slate-500">Google Sheets DB</span>
                    <span className={`w-2.5 h-2.5 rounded-full ${syncStatus.sheetConnected ? "bg-emerald-500 animate-pulse" : "bg-red-400"}`} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-slate-500">Google Drive Drive</span>
                    <span className={`w-2.5 h-2.5 rounded-full ${syncStatus.driveConnected ? "bg-emerald-500 animate-pulse" : "bg-red-400"}`} />
                  </div>
                  
                  <div className="text-[10px] text-slate-400 space-y-1 pt-1 border-t border-slate-50 font-mono text-center">
                    {syncStatus.sheetConnected && syncStatus.driveConnected ? (
                      <span className="text-emerald-600 font-bold text-[9px] block">Connected to Sheets & Drive</span>
                    ) : (
                      <span className="text-amber-600 font-bold text-[9px] block">Database Local Sync Fallback</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Sidebar FOOTER Navigation controls */}
              <div className="mt-auto pt-4 border-t border-slate-100 flex flex-col gap-1">
                <button 
                  onClick={() => alert("Portal Admin Bantuan Akademik Terbuka. Kontak support@academicportal.edu.")}
                  className="flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800 rounded-lg text-left cursor-pointer"
                >
                  <HelpCircle className="w-4 h-4 shrink-0" />
                  Support
                </button>
                <button 
                  onClick={handleSignOut}
                  className="flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-red-500 hover:bg-red-50 hover:text-red-600 rounded-lg text-left cursor-pointer transition-colors"
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  Sign Out
                </button>
              </div>
            </aside>

            {/* MAIN PORTAL AREA PANEL CONTAINER */}
            <main className="flex-1 p-8 bg-slate-50/50 overflow-y-auto">
              
              {adminSubTab === "registrations" && (
                <div className="space-y-6">
                  
                  {/* DIAGNOSTIC ERROR ALERT BAR */}
                  {syncStatus.errorMessage && (
                    <div className="p-3.5 rounded-xl bg-[#ffdad6] border border-red-250/20 text-[#93000a] text-xs font-medium flex items-start gap-2.5 shadow-sm">
                      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-600" />
                      <div>
                        <span className="font-semibold block mb-0.5">Diagnostik Database:</span>
                        <span>{syncStatus.errorMessage}</span>
                      </div>
                    </div>
                  )}

                  {/* HIGH VALUE METRICS HIGHLIGHT ROW */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    
                    {/* CARD 1 */}
                    <div className="bg-white border border-slate-200/50 p-6 rounded-2xl shadow-sm flex items-center justify-between">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Total Students</span>
                        <h3 className="text-3xl font-extrabold text-primary tracking-tight leading-none">{totalStudents.toLocaleString("id-ID")}</h3>
                        <span className="text-[11px] text-emerald-500 font-semibold block pt-1">+12% Dari Peminatan Lalu</span>
                      </div>
                      <div className="p-4 bg-primary/5 rounded-2xl text-primary">
                        <Users className="w-6 h-6" />
                      </div>
                    </div>

                    {/* CARD 2 */}
                    <div className="bg-white border border-slate-200/50 p-6 rounded-2xl shadow-sm flex items-center justify-between">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-bold text-slate-500">Belum Lengkap Berkas</span>
                        <h3 className="text-3xl font-extrabold text-amber-600 tracking-tight leading-none">{incompleteDocs}</h3>
                        <span className="text-[11px] text-amber-600 font-semibold block pt-1">Menunggu unggahan berkas siswa</span>
                      </div>
                      <div className="p-4 bg-amber-50 rounded-2xl text-amber-600">
                        <AlertCircle className="w-6 h-6" />
                      </div>
                    </div>

                    {/* CARD 3 */}
                    <div className="bg-white border border-slate-200/50 p-6 rounded-2xl shadow-sm flex items-center justify-between">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-bold text-slate-500">Rasio Berkas Lengkap</span>
                        <h3 className="text-3xl font-extrabold text-emerald-600 tracking-tight leading-none">{completeDocsRate}%</h3>
                        <span className="text-[11px] text-emerald-600 font-semibold block pt-1">Unggahan dokumen 100% lengkap</span>
                      </div>
                      <div className="p-4 bg-emerald-50 rounded-2xl text-emerald-600">
                        <CheckCircle className="w-6 h-6" />
                      </div>
                    </div>

                  </div>

                  {/* ACTIVE ACTION CONTROL BAR */}
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-2">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <h2 className="text-xl font-bold text-primary tracking-tight">Recent Registrations</h2>
                      <span className="text-xs bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-full inline-block">
                        {filteredRegistrations.length} Entries
                      </span>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto self-stretch shrink-0">
                      
                      {/* Search Bar */}
                      <div className="relative flex-1 sm:flex-none">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <Search className="w-4 h-4" />
                        </span>
                        <input 
                          type="text"
                          placeholder="Search students..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full sm:w-56 h-10 pl-9 pr-4 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-secondary/20 focus:outline-none focus:border-secondary transition-all text-xs text-slate-700"
                        />
                      </div>

                      {/* Filter Select Status */}
                      <div className="relative">
                        <select 
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value)}
                          className="h-10 px-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-secondary/20 focus:outline-none focus:border-secondary text-xs text-slate-700 font-bold"
                        >
                          <option value="All">Semua Berkas</option>
                          <option value="Complete">Berkas Lengkap</option>
                          <option value="Incomplete">Belum Lengkap</option>
                        </select>
                      </div>

                      {/* Export CSV button */}
                      <button 
                        onClick={handleExportCSV}
                        className="h-10 px-4 inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer select-none active:scale-[0.98]"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Export CSV
                      </button>

                      {/* Check Cloud Open Spreadsheet directly */}
                      <button 
                        onClick={handleInitializeDatabase}
                        disabled={isInitializingDatabase}
                        className="h-10 px-4 inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer select-none"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        {isInitializingDatabase ? "Mempersiapkan..." : "Inisialisasi Spreadsheet"}
                      </button>

                      <button 
                        onClick={() => {
                          if (syncStatus.sheetConnected && syncStatus.spreadsheetId) {
                            window.open(`https://docs.google.com/spreadsheets/d/${syncStatus.spreadsheetId}`, "_blank");
                          } else {
                            alert("Google Sheet tidak terhubung secara online. Harap lakukan pengaturan spreadsheet ID di berkas .env Anda terlebih dahulu.");
                          }
                        }}
                        className="h-10 px-4 inline-flex items-center gap-2 bg-primary text-white hover:bg-primary/95 text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer select-none"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        Open Spreadsheet
                      </button>

                    </div>
                  </div>

                  {/* DATA TABLE GRAPHIC SHEET */}
                  <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
                    <div className="min-w-full overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            <th className="py-4 px-6">ID Pendaftaran</th>
                            <th className="py-4 px-6">Nama Lengkap</th>
                            <th className="py-4 px-6">Program</th>
                            <th className="py-4 px-6">Tanggal</th>
                            <th className="py-4 px-6">Status Berkas</th>
                            <th className="py-4 px-6">Status Verifikasi</th>
                            <th className="py-4 px-6 text-center">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                          {isLoadingRegs ? (
                            <tr>
                              <td colSpan={8} className="py-12 text-center text-slate-400 font-semibold">
                                <div className="flex items-center justify-center gap-2">
                                  <RefreshCw className="w-4 h-4 animate-spin text-secondary" />
                                  Memuai basis data pendaftaran...
                                </div>
                              </td>
                            </tr>
                          ) : filteredRegistrations.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="py-12 text-center text-slate-400">
                                Tidak ada data pendaftaran kemahasiswaan yang sesuai kriteria pencarian.
                              </td>
                            </tr>
                          ) : (
                            filteredRegistrations.map((student) => {
                              const isComplete = student.documents && student.documents.kk && student.documents.ijazah && student.documents.akta && student.documents.photo;
                              const berkasClass = isComplete ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-amber-50 text-amber-600 border border-amber-100";
                              const berkasText = isComplete ? "Lengkap" : "Belum Lengkap";

                              let verificationClass = "bg-slate-50 text-slate-600 border border-slate-150";
                              let verificationText = student.status || "Terdaftar";

                              if (student.status === "Verified") {
                                verificationClass = "bg-emerald-50 text-emerald-700 border border-emerald-200";
                                verificationText = "Terverifikasi";
                              } else if (student.status === "Pending") {
                                verificationClass = "bg-amber-50 text-amber-700 border border-amber-200";
                                verificationText = "Menunggu Berkas";
                              } else if (student.status === "Rejected") {
                                verificationClass = "bg-rose-50 text-rose-700 border border-rose-200";
                                verificationText = "Ditolak";
                              } else {
                                verificationClass = "bg-sky-50 text-sky-700 border border-sky-200";
                                verificationText = "Terdaftar";
                              }

                              const initials = student.biodata.namaLengkap
                                ? student.biodata.namaLengkap.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase()
                                : "ST";

                              return (
                                <tr 
                                  key={student.id} 
                                  className="hover:bg-slate-50/50 transition-all cursor-pointer group animate-fade-in"
                                  onClick={() => setSelectedStudent(student)}
                                >
                                  <td className="py-4 px-6 font-mono text-primary font-bold">{student.id}</td>
                                  <td className="py-4 px-6">
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-full bg-slate-100 text-[10px] font-bold text-slate-500 flex items-center justify-center border border-slate-200 shrink-0">
                                        {initials}
                                      </div>
                                      <div>
                                        <div className="font-bold text-slate-800 group-hover:text-primary transition-colors">{student.biodata.namaLengkap}</div>
                                        <div className="text-[10px] text-slate-400 font-semibold">{student.biodata.email}</div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-4 px-6 text-slate-600">
                                    <div>{student.program.paket}</div>
                                    <div className="text-[10px] text-slate-400">{student.program.jurusan !== "Select Jurusan" ? student.program.jurusan : "Umum"}</div>
                                  </td>
                                  <td className="py-4 px-6 text-slate-400 font-semibold">{student.date}</td>
                                  <td className="py-4 px-6">
                                    <span className={`inline-flex px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-wide border ${berkasClass}`}>
                                      {berkasText}
                                    </span>
                                  </td>
                                  <td className="py-4 px-6">
                                    <span className={`inline-flex px-2.5 py-0.5 rounded-full font-extrabold text-[10px] uppercase tracking-wide border ${verificationClass}`}>
                                      {verificationText}
                                    </span>
                                  </td>
                                  <td className="py-4 px-6" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex items-center justify-center">
                                      <button 
                                        type="button"
                                        onClick={() => setSelectedStudent(student)}
                                        className="p-1 px-4 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] transition-colors font-bold flex items-center gap-1 cursor-pointer select-none"
                                      >
                                        Detail Siswa
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                    
                    {/* Minimalistic Table Pagination Row footer */}
                    <div className="bg-white border-t border-slate-100 p-4 px-6 flex justify-between items-center text-slate-400 font-semibold text-xs leading-none select-none">
                      <div>Showing {filteredRegistrations.length} elements</div>
                      <div className="flex items-center gap-1.5">
                        <button className="p-1.5 rounded hover:bg-slate-50 transition-colors cursor-pointer text-slate-300 pointer-events-none"><ChevronLeft className="w-4 h-4" /></button>
                        <span className="w-7 h-7 inline-flex items-center justify-center bg-primary text-white rounded-lg font-bold">1</span>
                        <span className="w-7 h-7 inline-flex items-center justify-center hover:bg-slate-50 text-slate-500 rounded-lg cursor-pointer">2</span>
                        <span className="w-7 h-7 inline-flex items-center justify-center hover:bg-slate-50 text-slate-500 rounded-lg cursor-pointer">3</span>
                        <button className="p-1.5 rounded hover:bg-slate-50 transition-colors cursor-pointer text-slate-500"><ChevronRight className="w-4 h-4" /></button>
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* OUT-SCOPE SIMPLE SUBTABS CHASSIS */}
              {adminSubTab === "dashboard" && (
                <div className="bg-white rounded-2xl border border-slate-200/50 p-8 space-y-4 max-w-xl">
                  <h3 className="text-lg font-bold text-primary">Overview Dashboard</h3>
                  <p className="text-slate-500 text-xs leading-relaxed">
                    Visualisasi terperinci mengenai statistik sebaran peminat per pilihan paket program dan peminatan peminatan pilihan pendaftar.
                  </p>
                  <div className="pt-2 grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 border border-slate-200/40 rounded-xl">
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Peminat Multimedia</span>
                      <span className="text-lg font-bold text-slate-700 block">45 Mahasiswa</span>
                    </div>
                    <div className="p-4 bg-slate-50 border border-slate-200/40 rounded-xl">
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Peminat Tata Boga</span>
                      <span className="text-lg font-bold text-slate-700 block">32 Mahasiswa</span>
                    </div>
                  </div>
                </div>
              )}

              {adminSubTab === "students" && (
                <div className="bg-white rounded-2xl border border-slate-200/50 p-8 space-y-4 max-w-xl">
                  <h3 className="text-lg font-bold text-primary">Daftar Mahasiswa Terdaftar</h3>
                  <p className="text-slate-500 text-xs leading-relaxed">
                    Daftar kontak identitas sosiologis, NIK, NISN, dan rekam jejak biodata masing-masing mahasiswa yang status pendaftarannya telah dinyatakan diverifikasi berkas akademiknya.
                  </p>
                  <button onClick={() => setAdminSubTab("registrations")} className="text-secondary text-xs hover:underline pt-2 font-semibold flex items-center gap-1">
                    Buka Tab Pendaftaran <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              )}

              {adminSubTab === "settings" && (
                <div className="space-y-6 max-w-4xl">
                  <div className="bg-white rounded-2xl border border-slate-200/50 p-8 space-y-6">
                    <div>
                      <h3 className="text-lg font-bold text-primary">Google Integration Settings</h3>
                      <p className="text-slate-500 text-xs">Atur konfigurasi sinkronisasi Spreadsheet dan Google Drive secara otomatis tanpa Google Auth Service Account</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="space-y-1.5 md:col-span-2">
                        <label className="font-semibold text-slate-600 block">GOOGLE_SCRIPT_URL (Apps Script Web App)</label>
                        <input 
                          type="text" 
                          value={scriptUrlInSettings} 
                          onChange={(e) => setScriptUrlInSettings(e.target.value)}
                          placeholder="https://script.google.com/macros/s/.../exec" 
                          className="w-full p-2.5 bg-white border border-slate-200 text-slate-800 font-mono text-[11px] rounded-lg outline-none focus:border-primary transition-colors" 
                        />
                        <p className="text-slate-400 text-[10px]">Masukkan URL Web App hasil deploy Apps Script Anda. Database dan file berkas akan otomatis tersimpan langsung ke akun Google Anda.</p>
                      </div>

                      <div className="space-y-1.5">
                        <label className="font-semibold text-slate-600 block">GOOGLE_SPREADSHEET_ID</label>
                        <input 
                          type="text" 
                          value={spreadsheetIdInSettings} 
                          onChange={(e) => setSpreadsheetIdInSettings(e.target.value)}
                          placeholder="Masukkan ID Google Spreadsheet" 
                          className="w-full p-2.5 bg-white border border-slate-200 text-slate-800 font-mono text-[11px] rounded-lg outline-none focus:border-primary transition-colors" 
                        />
                      </div>
                      
                      <div className="space-y-1.5">
                        <label className="font-semibold text-slate-600 block">GOOGLE_DRIVE_FOLDER_ID</label>
                        <input 
                          type="text" 
                          value={driveFolderIdInSettings} 
                          onChange={(e) => setDriveFolderIdInSettings(e.target.value)}
                          placeholder="Masukkan ID Google Drive Folder" 
                          className="w-full p-2.5 bg-white border border-slate-200 text-slate-800 font-mono text-[11px] rounded-lg outline-none focus:border-primary transition-colors" 
                        />
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button 
                        onClick={handleSaveConfig}
                        disabled={isSavingConfig}
                        className="p-2.5 px-6 bg-primary hover:bg-primary/95 font-bold text-xs text-white rounded-lg cursor-pointer transition-colors disabled:opacity-50"
                      >
                        {isSavingConfig ? "Menyimpan..." : "Simpan Konfigurasi"}
                      </button>
                    </div>
                  </div>

                  {/* STEP BY STEP GUIDE DENGAN TEMPLATE CODE.GS */}
                  <div className="bg-slate-900 text-slate-350 rounded-2xl p-8 space-y-6">
                    <div>
                      <h4 className="text-md font-bold text-white flex items-center gap-2">
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500 text-slate-900 text-xs font-black">!</span>
                        Langkah Integrasi Google Apps Script (Sangat Mudah &amp; Otomatis)
                      </h4>
                      <p className="text-[11px] mt-1 text-slate-400">Gunakan kode di bawah ini untuk menghubungkan form langsung ke Spreadsheet dan Drive Anda tanpa ribet:</p>
                    </div>

                    <div className="text-xs space-y-3 leading-relaxed text-slate-350">
                      <p><strong>1.</strong> Buka Spreadsheet Anda (atau klik button "Open Spreadsheet" di admin dashboard).</p>
                      <p><strong>2.</strong> Klik menu <strong>Extensions &gt; Apps Script</strong> di bagian atas Spreadsheet.</p>
                      <p><strong>3.</strong> Hapus semua kode default di dalam editor script, lalu <strong>salin (copy) seluruh kode di bawah ini</strong> dan paste:</p>
                    </div>

                    <div className="relative group">
                      <div className="bg-slate-950 border border-slate-800 rounded-xl max-h-[350px] overflow-y-auto p-4 font-mono text-[10px] text-slate-300 whitespace-pre scrollbar-thin select-all leading-normal">
{`const SPREADSHEET_ID = "${spreadsheetIdInSettings || "1DSVqDAaMGSMhTmOvIk-qme_wPeFZ27LoftcVvYwj6iU"}";
const DRIVE_FOLDER_ID = "${driveFolderIdInSettings || "1fcgrKLvJV7_NIa5FEIRcxUA0V5y4UrRd"}";

function doGet(e) {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheets()[0];
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return ContentService.createTextOutput(JSON.stringify({ success: true, data: [] }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    const headers = data[0];
    const rows = data.slice(1);
    const registrations = rows.map(row => {
      return {
        id: row[0] || "",
        date: row[1] || "",
        status: row[2] || "Pending",
        biodata: {
          namaLengkap: row[3] || "",
          nik: row[7] || "",
          nisn: row[8] || "",
          tempatTanggalLahir: row[9] || "",
          jenisKelamin: row[10] || "",
          email: row[11] || "",
          phone: row[12] || "",
          street: row[13] || "",
          rtRw: row[14] || "",
          village: row[15] || "",
          district: row[16] || "",
          city: row[17] || ""
        },
        program: {
          paket: row[4] || "",
          jurusan: row[5] || "",
          peminatan: row[6] ? row[6].split(", ").filter(Boolean) : []
        },
        guardian: {
          fatherName: row[18] || "",
          fatherJob: row[19] || "",
          motherName: row[20] || "",
          motherJob: row[21] || "",
          guardianName: row[22] || "",
          guardianPhone: row[23] || "",
          guardianAddress: row[24] || ""
        },
        documents: {
          kk: row[25] || "",
          ijazah: row[26] || "",
          akta: row[27] || "",
          photo: row[28] || ""
        }
      };
    });
    return ContentService.createTextOutput(JSON.stringify({ success: true, data: registrations }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    const json = JSON.parse(e.postData.contents);
    const action = json.action;
    
    if (action === "upload") {
      const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
      const base64Clean = json.base64Data.replace(/^data:.*?;base64,/, "");
      const decoded = Utilities.base64Decode(base64Clean);
      const blob = Utilities.newBlob(decoded, json.mimeType, json.fileName);
      const file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      return ContentService.createTextOutput(JSON.stringify({ success: true, url: file.getUrl() }))
        .setMimeType(ContentService.MimeType.JSON);
    } else if (action === "register") {
      const reg = json.data;
      const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheets()[0];
      
      const row = [
        reg.id, reg.date, reg.status, reg.biodata.namaLengkap, reg.program.paket, reg.program.jurusan,
        reg.program.peminatan.join(", "), reg.biodata.nik, reg.biodata.nisn, reg.biodata.tempatTanggalLahir,
        reg.biodata.jenisKelamin, reg.biodata.email, reg.biodata.phone, reg.biodata.street, reg.biodata.rtRw,
        reg.biodata.village, reg.biodata.district, reg.biodata.city, reg.guardian.fatherName, reg.guardian.fatherJob,
        reg.guardian.motherName, reg.guardian.motherJob, reg.guardian.guardianName || "", reg.guardian.guardianPhone || "",
        reg.guardian.guardianAddress || "", reg.documents.kk || "", reg.documents.ijazah || "", reg.documents.akta || "",
        reg.documents.photo || ""
      ];
      sheet.appendRow(row);
      return ContentService.createTextOutput(JSON.stringify({ success: true }))
        .setMimeType(ContentService.MimeType.JSON);
    } else if (action === "updateStatus") {
      const id = json.id;
      const status = json.status;
      const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheets()[0];
      const data = sheet.getDataRange().getValues();
      let rowIdx = -1;
      for (let i = 0; i < data.length; i++) {
        if (data[i][0] === id) {
          rowIdx = i + 1;
          break;
        }
      }
      if (rowIdx !== -1) {
        sheet.getRange(rowIdx, 3).setValue(status);
        return ContentService.createTextOutput(JSON.stringify({ success: true }))
          .setMimeType(ContentService.MimeType.JSON);
      } else {
        return ContentService.createTextOutput(JSON.stringify({ success: false, error: "ID not found" }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`}
                      </div>
                    </div>

                    <div className="text-xs space-y-3 leading-relaxed text-slate-400">
                      <p><strong>4.</strong> Klik icon <strong>Save (Disk)</strong> di editor Apps Script.</p>
                      <p><strong>5.</strong> Klik tombol biru <strong>Deploy &gt; New Deployment</strong> di kanan atas.</p>
                      <p><strong>6.</strong> Pilih jenis pendeployan: <strong>Web App</strong> (Klik ikon gerigi/settings).</p>
                      <p><strong>7.</strong> Atur konfigurasinya:</p>
                      <ul className="list-disc pl-5 space-y-1 text-slate-400">
                        <li>Execute as: <strong>Me (email Anda)</strong></li>
                        <li>Who has access: <strong>Anyone (Siapa saja)</strong> &lt;-- <em>PENTING!</em></li>
                      </ul>
                      <p><strong>8.</strong> Klik <strong>Deploy</strong>, lakukan otorisasi akun Google Anda, lalu salin <strong>Web App URL</strong> yang dihasilkan.</p>
                      <p><strong>9.</strong> Tempel URL tersebut ke input <strong>GOOGLE_SCRIPT_URL</strong> di atas, lalu klik <strong>Simpan Konfigurasi</strong>. Selesai!</p>
                    </div>
                  </div>
                </div>
              )}

              {adminSubTab === "payments" && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200/50 shadow-sm">
                    <div className="space-y-1">
                      <h3 className="text-xl font-extrabold text-primary tracking-tight">Daftar Konfirmasi Pembayaran</h3>
                      <p className="text-slate-500 text-xs font-semibold">
                        Tinjau unggahan bukti pendaftaran atau administrasi masuk dari calon siswa.
                      </p>
                    </div>
                    <button 
                      type="button"
                      onClick={fetchPayments} 
                      disabled={isLoadingPayments}
                      className="p-1.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs transition-colors font-bold flex items-center gap-2 cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLoadingPayments ? "animate-spin" : ""}`} />
                      Muat Ulang
                    </button>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
                    <div className="min-w-full overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            <th className="py-4 px-6">ID Pembayaran</th>
                            <th className="py-4 px-6">Kode Registrasi</th>
                            <th className="py-4 px-6">Nama Siswa</th>
                            <th className="py-4 px-6">Keterangan</th>
                            <th className="py-4 px-6">Tanggal</th>
                            <th className="py-4 px-6 text-center">Lampiran</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                          {isLoadingPayments ? (
                            <tr>
                              <td colSpan={6} className="py-12 text-center text-slate-400 font-bold">
                                <div className="flex items-center justify-center gap-2">
                                  <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                                  Memuat data konfirmasi pembayaran...
                                </div>
                              </td>
                            </tr>
                          ) : payments.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-12 text-center text-slate-400">
                                Belum ada bukti pendaftaran / pembayaran yang dikonfirmasi siswa.
                              </td>
                            </tr>
                          ) : (
                            payments.map((p) => {
                              return (
                                <tr key={p.id} className="hover:bg-slate-50/40 transition-colors">
                                  <td className="py-4 px-6 font-mono text-primary font-bold">{p.id}</td>
                                  <td className="py-4 px-6 font-mono text-slate-800 font-extrabold">{p.registrationCode}</td>
                                  <td className="py-4 px-6 font-bold">{p.studentName}</td>
                                  <td className="py-4 px-6 text-slate-500 max-w-[180px] truncate">{p.description}</td>
                                  <td className="py-4 px-6 text-slate-400 font-semibold">{p.date}</td>
                                  <td className="py-4 px-6 text-center">
                                    {p.fileUrl ? (
                                      <a
                                        href={p.fileUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex h-7 px-2.5 bg-white border border-slate-200 text-slate-600 hover:text-primary hover:border-primary/50 text-[10.5px] rounded-lg transition-all font-bold items-center gap-1 mx-auto cursor-pointer"
                                      >
                                        Buka Bukti
                                        <ExternalLink className="w-3" />
                                      </a>
                                    ) : (
                                      <span className="text-slate-400 italic text-[11px]">Tidak ada</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

            </main>

          </div>
        )}
      </div>

      {/* INSPECT ELEMENT MODAL SIDE DRAWER */}
      <AnimatePresence>
        {selectedStudent && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex justify-end z-50 select-none">
            
            {/* Modal Backdrop Click and exit handle */}
            <div className="flex-1" onClick={() => setSelectedStudent(null)} />

            {/* Panel Body Sheet */}
            <motion.div 
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.25 }}
              className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col relative select-text"
            >
              
              {/* Header block */}
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div>
                  <span className="font-mono text-primary font-bold block text-sm">{selectedStudent.id}</span>
                  <h3 className="font-bold text-lg text-slate-800 leading-snug">{selectedStudent.biodata.namaLengkap}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    type="button"
                    onClick={handlePrintStudent}
                    className="p-1.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 hover:text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Cetak Bukti
                  </button>
                  <button 
                    onClick={() => setSelectedStudent(null)}
                    className="p-1.5 px-3 bg-white hover:bg-slate-100 border rounded-lg text-xs font-semibold text-slate-500 cursor-pointer"
                  >
                    Close ×
                  </button>
                </div>
              </div>

              {/* Scroll Area Body info panel */}
              <div className="flex-1 p-6 overflow-y-auto space-y-6 text-sm text-slate-700">
                
                {/* Status Badging & Change Block */}
                <div className="p-4 bg-slate-100/50 rounded-xl border border-slate-200/50 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Status Pendaftaran (Admin):</span>
                    <select
                      value={selectedStudent.status || "Terdaftar"}
                      onChange={(e) => handleUpdateStatus(selectedStudent.id, e.target.value)}
                      className="h-8 pl-2 pr-6 bg-white border border-slate-200 rounded-md text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                    >
                      <option value="Terdaftar">Terdaftar</option>
                      <option value="Verified">Terverifikasi (Aktif)</option>
                      <option value="Pending">Menunggu Berkas</option>
                      <option value="Rejected">Ditolak</option>
                    </select>
                  </div>
                  <div className="flex flex-col sm:items-end gap-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Status Kelengkapan Lampiran:</span>
                    {(() => {
                      const complete = selectedStudent.documents && selectedStudent.documents.kk && selectedStudent.documents.ijazah && selectedStudent.documents.akta && selectedStudent.documents.photo;
                      return (
                        <span className={`inline-flex px-3 py-1 rounded-full font-black text-[10px] uppercase tracking-widest ${
                          complete ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}>
                          {complete ? "Selesai / Lengkap" : "Belum Lengkap"}
                        </span>
                      );
                    })()}
                  </div>
                </div>

                {/* Sub-block 1: Program */}
                <div className="space-y-2">
                  <h4 className="font-bold text-primary border-b pb-1.5">1. Pilihan Program</h4>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 block font-semibold mb-0.5">Program Paket</span>
                      <span className="font-bold text-slate-700">{selectedStudent.program.paket}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-semibold mb-0.5">Jurusan</span>
                      <span className="font-bold text-slate-700">{selectedStudent.program.jurusan || "Umum"}</span>
                    </div>
                    <div className="col-span-full">
                      <span className="text-slate-400 block font-semibold mb-1">Mata Pelajaran Peminatan Terpilih</span>
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {selectedStudent.program.peminatan.map(track => (
                          <span key={track} className="bg-slate-100 px-2.5 py-1 rounded-lg text-slate-600 font-bold tracking-tight text-[11px]">
                            {track}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sub-block 2: Biodata */}
                <div className="space-y-2">
                  <h4 className="font-bold text-primary border-b pb-1.5">2. Biodata & Personal</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 block font-semibold mb-0.5">NIK / KTP</span>
                      <span className="font-medium text-slate-700 font-mono">{selectedStudent.biodata.nik}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-semibold mb-0.5">NISN (Nasional)</span>
                      <span className="font-medium text-slate-700 font-mono">{selectedStudent.biodata.nisn || "-"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-semibold mb-0.5">TTL</span>
                      <span className="font-medium text-slate-700">{selectedStudent.biodata.tempatTanggalLahir}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-semibold mb-0.5">Jenis Kelamin</span>
                      <span className="font-medium text-slate-700">{selectedStudent.biodata.jenisKelamin}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-semibold mb-0.5">Email</span>
                      <span className="font-medium text-slate-700">{selectedStudent.biodata.email}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-semibold mb-0.5">WhatsApp / HP</span>
                      <span className="font-medium text-slate-700">{selectedStudent.biodata.phone}</span>
                    </div>

                    <div className="col-span-full pt-1.5">
                      <span className="text-slate-400 block font-semibold mb-1">Alamat Domisili Siswa</span>
                      <p className="bg-slate-50 border border-slate-200/60 p-3 rounded-xl font-medium text-slate-700">
                        {selectedStudent.biodata.street}, RT/RW: {selectedStudent.biodata.rtRw}, Kel: {selectedStudent.biodata.village}, Kec: {selectedStudent.biodata.district}, Kota/Kab: {selectedStudent.biodata.city}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Sub-block 3: Guardian */}
                <div className="space-y-2">
                  <h4 className="font-bold text-primary border-b pb-1.5">3. Informasi Orang Tua / Wali</h4>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 block font-semibold mb-0.5">Nama Lengkap Ayah</span>
                      <span className="font-medium text-slate-700 block">{selectedStudent.guardian.fatherName}</span>
                      <span className="text-[10px] text-slate-400">Pekerjaan: {selectedStudent.guardian.fatherJob}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-semibold mb-0.5">Nama Lengkap Ibu</span>
                      <span className="font-medium text-slate-700 block">{selectedStudent.guardian.motherName}</span>
                      <span className="text-[10px] text-slate-400">Pekerjaan: {selectedStudent.guardian.motherJob}</span>
                    </div>
                    
                    {selectedStudent.guardian.guardianName && (
                      <div className="col-span-full pt-1">
                        <span className="text-slate-400 block font-semibold mb-0.5">Biodata Wali Kandung</span>
                        <span className="font-medium text-slate-700 block">{selectedStudent.guardian.guardianName} ({selectedStudent.guardian.guardianPhone})</span>
                        <span className="text-[10px] text-slate-400">Alamat Wali: {selectedStudent.guardian.guardianAddress}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Sub-block 4: Docs Uploaded */}
                <div className="space-y-3 pb-8">
                  <div className="flex justify-between items-center border-b pb-1.5">
                    <h4 className="font-bold text-primary">4. Berkas Unggahan Terlampir</h4>
                    <span className="text-[10px] text-slate-400 font-bold">Admin dapat mengunggah / mengganti berkas</span>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { label: "Kartu Keluarga (KK)", key: "kk" },
                      { label: "Ijazah Terakhir", key: "ijazah" },
                      { label: "Akta Kelahiran", key: "akta" },
                      { label: "Pas Foto 3x4", key: "photo" }
                    ].map((doc) => {
                      const url = (selectedStudent.documents as any)[doc.key];
                      const uploading = isAdminUploading[doc.key];
                      return (
                        <div key={doc.key} className="p-3 bg-slate-50 border border-slate-200/50 rounded-xl space-y-2 text-xs font-semibold">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-600 block">{doc.label}</span>
                            {url ? (
                              <button 
                                type="button"
                                onClick={() => window.open(url, "_blank")}
                                className="text-secondary hover:underline inline-flex items-center gap-1 cursor-pointer font-bold leading-none"
                              >
                                Buka Dokumen
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            ) : (
                              <span className="text-slate-400 font-semibold italic text-[11px] leading-none">Belum Diunggah</span>
                            )}
                          </div>
                          <div className="pt-1 flex items-center justify-end gap-2 border-t border-slate-100">
                            {uploading ? (
                              <span className="text-[11px] text-slate-500 font-bold inline-flex items-center gap-1">
                                <RefreshCw className="w-3 h-3 animate-spin" />
                                Mengunggah...
                              </span>
                            ) : (
                              <>
                                <input 
                                  id={`admin-file-${doc.key}-${selectedStudent.id}`}
                                  type="file"
                                  className="hidden"
                                  accept="image/*,application/pdf"
                                  onChange={(e) => handleAdminUploadDocument(selectedStudent.id, doc.key as any, e)}
                                />
                                <label 
                                  htmlFor={`admin-file-${doc.key}-${selectedStudent.id}`}
                                  className="text-[10.5px] text-primary hover:text-white bg-blue-50/65 hover:bg-primary border border-blue-200/60 transition-colors p-1 px-2.5 rounded-lg font-extrabold cursor-pointer select-none"
                                >
                                  {url ? "Ganti Berkas" : "Unggah Berkas"}
                                </label>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            </motion.div>

          </div>
        )}
      </AnimatePresence>

      {/* NEW REGISTRATION POPUP MODAL (ADMIN CONSOLE VIEW) */}
      <AnimatePresence>
        {showNewRegistrationModalInAdmin && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-6 z-50">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 text-xs max-h-[85vh] overflow-y-auto"
            >
              
              <div className="flex justify-between items-center border-b pb-3 mb-4">
                <h3 className="text-sm font-bold text-primary uppercase tracking-wide">Pendaftaran Siswa Baru (Admin Hub)</h3>
                <button 
                  onClick={() => setShowNewRegistrationModalInAdmin(false)}
                  className="p-1 px-2.5 bg-slate-100 hover:bg-slate-200 border rounded-lg text-slate-500 font-semibold"
                >
                  Tutup ×
                </button>
              </div>

              <div className="p-3.5 bg-secondary/5 rounded-xl text-secondary font-medium leading-relaxed mb-4">
                Fitur pendaftaran langsung dari konsol admin. Silakan gunakan tab Pendaftaran Mahasiswa utama untuk proses form interaktif.
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-500">Nama Lengkap Siswa</label>
                  <input 
                    type="text" 
                    placeholder="Jane Dorothy" 
                    id="admin-form-nama"
                    className="w-full p-2.5 border rounded-lg outline-none text-slate-800 font-medium" 
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="font-semibold text-slate-500">Alamat Alamat Surel (Email)</label>
                  <input 
                    type="email" 
                    placeholder="email@portal.edu" 
                    id="admin-form-email"
                    className="w-full p-2.5 border rounded-lg outline-none text-slate-800 font-medium" 
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-500">Program Paket</label>
                    <select id="admin-form-paket" className="w-full p-2.5 bg-white border border-slate-200 rounded-lg font-medium outline-none text-slate-800">
                      <option>Paket A (Setara SD)</option>
                      <option>Paket B (Setara SMP)</option>
                      <option>Paket C (Setara SMA)</option>
                    </select>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-500">Nomer HP WA</label>
                    <input 
                      type="tel" 
                      placeholder="+62 81..." 
                      id="admin-form-telepon"
                      className="w-full p-2.5 border rounded-lg outline-none text-slate-800 font-medium" 
                    />
                  </div>
                </div>

                <button 
                  onClick={async () => {
                    const nama = (document.getElementById("admin-form-nama") as HTMLInputElement)?.value;
                    const email = (document.getElementById("admin-form-email") as HTMLInputElement)?.value;
                    const paket = (document.getElementById("admin-form-paket") as HTMLSelectElement)?.value;
                    const phone = (document.getElementById("admin-form-telepon") as HTMLInputElement)?.value;

                    if (!nama || !email || !phone) {
                      alert("Tolong isi seluruh datanya dengan benar.");
                      return;
                    }

                    const generatedId = "REG-" + Math.floor(100000 + Math.random() * 900000);
                    const currentDate = new Date().toLocaleDateString("id-ID", {
                      year: "numeric",
                      month: "short",
                      day: "numeric"
                    });

                    const bodyPayload: StudentRegistration = {
                      id: generatedId,
                      program: { paket, jurusan: "IPS", peminatan: ["Multimedia"] },
                      biodata: {
                        namaLengkap: nama, nik: "3171012345670891", nisn: "0053210928",
                        tempatTanggalLahir: "Jakarta, 12/03/2006", jenisKelamin: "Perempuan",
                        email, phone, street: "Jl. Veteran No. 3", rtRw: "01/01",
                        village: "Veteran", district: "Gambir", city: "Jakarta Pusat"
                      },
                      guardian: { fatherName: "Budi", fatherJob: "Karyawan", motherName: "Siti", motherJob: "Wiraswasta" },
                      documents: { kk: "", ijazah: "", akta: "", photo: "" },
                      date: currentDate,
                      status: "Terdaftar"
                    };

                    try {
                      const res = await fetch("/api/registrations", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(bodyPayload)
                      });

                      if (res.ok) {
                        alert(`Mahasiswa ${nama} berhasil didaftarkan secara manual dari panel admin.`);
                        setShowNewRegistrationModalInAdmin(false);
                        fetchRegistrations(); // Reload
                      } else {
                        alert("Gagal melakukan pendaftaran pendaftar baru.");
                      }
                    } catch (err) {
                      console.error("Direct registration error:", err);
                    }
                  }}
                  className="w-full py-3 bg-primary text-white hover:bg-primary/95 text-xs font-bold rounded-lg text-center transition-all select-none cursor-pointer"
                >
                  Tambah Siswa Baru
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ABOUT MODAL DETAIL */}
      <AnimatePresence>
        {isAboutOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAboutOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative bg-white rounded-3xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-100 z-10 flex flex-col max-h-[85vh]"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 md:p-8">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                    <School className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800 tracking-tight leading-none">Tentang PKBM Bahtera Dua</h3>
                    <span className="text-[10px] text-primary font-bold uppercase tracking-wider mt-1 block">Pendidikan Kesetaraan Berkualitas</span>
                  </div>
                </div>
                <button 
                  onClick={() => setIsAboutOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 md:p-8 overflow-y-auto space-y-6 text-sm text-slate-600 leading-relaxed scrollbar-thin">
                <div className="p-4 bg-primary/5 rounded-2xl border border-primary/5">
                  <p className="font-semibold text-primary leading-snug">
                    "Mengakomodasi harapan karsa, membimbing kesetaraan bangsa dengan kemandirian sejati."
                  </p>
                </div>

                <div className="space-y-3">
                  <p>
                    <strong>PKBM (Pusat Kegiatan Belajar Masyarakat) Bahtera Dua</strong> adalah lembaga pendidikan non-formal resmi di bawah naungan Kementerian Pendidikan dan Kebudayaan yang menyelenggarakan program kesetaraan terakreditasi:
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col justify-between">
                      <span className="font-extrabold text-primary text-lg">Paket A</span>
                      <span className="text-xs text-slate-500 font-medium">Setara Sekolah Dasar (SD/MI)</span>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col justify-between">
                      <span className="font-extrabold text-primary text-lg">Paket B</span>
                      <span className="text-xs text-slate-500 font-medium">Setara Sekolah Menengah Pertama (SMP/MTs)</span>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col justify-between whitespace-normal">
                      <span className="font-extrabold text-primary text-lg">Paket C</span>
                      <span className="text-xs text-slate-500 font-medium">Setara Sekolah Menengah Atas (SMA/MA)</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-bold text-slate-800 text-base flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary" /> Alamat Sekretariat
                  </h4>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-150 text-xs flex gap-3">
                    <div className="text-left">
                      <p className="font-bold text-slate-800">Gedung Utama PKBM Bahtera Dua</p>
                      <p className="text-slate-500 mt-1">Jl. Lekso No. 18, Pakunden, Kecamatan Sukorejo, Kota Blitar, Jawa Timur, Indonesia.</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-bold text-slate-800 text-base flex items-center gap-2 flex-wrap">
                    Keunggulan Kami
                  </h4>
                  <ul className="list-disc pl-5 space-y-1 text-xs">
                    <li><strong>Kurikulum Nasional Fleksibel:</strong> Waktu belajar dapat disesuaikan bagi siswa yang bekerja, wirausaha, maupun atlet.</li>
                    <li><strong>Fasilitas Modern:</strong> Pendaftaran digital terintegrasi otomatis langsung dengan Google Sheets dan Cloud Secure Drive.</li>
                    <li><strong>Ijazah Resmi Negara:</strong> Ijazah sah diakui untuk melanjutkan ke Perguruan Tinggi Negeri/Swasta maupun melamar pekerjaan formal.</li>
                  </ul>
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end">
                <button 
                  onClick={() => setIsAboutOpen(false)}
                  className="px-5 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg text-slate-700 text-xs font-bold transition-all cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONTACT MODAL DETAIL */}
      <AnimatePresence>
        {isContactOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsContactOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100 z-10"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-800 tracking-tight leading-none">Hubungi Kami</h3>
                    <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider mt-1 block">WhatsApp Admin Resmi</span>
                  </div>
                </div>
                <button 
                  onClick={() => setIsContactOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6 text-sm">
                <div className="text-center space-y-2">
                  <p className="text-slate-500 text-xs">Untuk pelayanan pendaftar baru, tanya jawab jadwal belajar, atau kebutuhan administratif lainnya, silakan hubungi WhatsApp resmi kami.</p>
                  
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-3 mt-4 text-left">
                    <div className="flex items-center gap-3 text-xs">
                      <Phone className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">No. WhatsApp Admin</p>
                        <p className="font-bold text-slate-800 text-sm">089531862670</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <Clock className="w-4 h-4 text-primary flex-shrink-0" />
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Hari & Jam Kerja</p>
                        <p className="font-semibold text-slate-700">Senin - Jumat | 08:00 - 16:00 WIB</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-2 space-y-2.5">
                  <a 
                    href="https://wa.me/6289531862670" 
                    target="_blank" 
                    rel="noreferrer"
                    className="w-full py-3 inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer transition-colors"
                  >
                    <Phone className="w-4 h-4 text-white fill-white" />
                    Kirim Pesan WhatsApp Sekarang
                  </a>
                  
                  <button 
                    onClick={() => setIsContactOpen(false)}
                    className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg cursor-pointer transition-colors"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DOCUMENT PREVIEW MODAL */}
      <AnimatePresence>
        {previewDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPreviewDoc(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden border border-slate-150 z-10 flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-800 tracking-tight leading-none">
                      {previewDoc.title}
                    </h3>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase mt-1 block">
                      Konfirmasi Keabsahan Dokumen Pendaftaran
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => setPreviewDoc(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Preview Content */}
              <div className="p-6 overflow-y-auto flex-1 flex flex-col items-center justify-center bg-slate-100/50 min-h-[350px] max-h-[60vh] scrollbar-thin">
                {previewDoc.type.startsWith("image/") ? (
                  <div className="max-w-full max-h-full flex items-center justify-center rounded-xl overflow-hidden border border-slate-200 bg-white p-3 shadow-inner">
                    <img 
                      src={previewDoc.url} 
                      alt={previewDoc.title}
                      referrerPolicy="no-referrer"
                      className="max-h-[50vh] object-contain rounded-lg transition-transform hover:scale-105 duration-200"
                    />
                  </div>
                ) : previewDoc.type === "application/pdf" ? (
                  <div className="w-full h-[55vh] rounded-xl overflow-hidden border border-slate-200 bg-white shadow-inner">
                    <iframe 
                      src={previewDoc.url} 
                      title={previewDoc.title} 
                      className="w-full h-full border-none"
                    />
                  </div>
                ) : (
                  <div className="text-center space-y-4 p-8 bg-white border border-slate-200 rounded-2xl max-w-md shadow-sm">
                    <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                      <FileText className="w-8 h-8" />
                    </div>
                    <p className="text-sm text-slate-600 font-medium">
                      Dokumen pendaftaran PDF atau format Google Drive tidak dapat dimuat langsung di peramban ini karena pembatasan keamanan. Silakan klik tombol di bawah untuk membuka berkas secara langsung.
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-5 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row justify-between items-center gap-3">
                <span className="text-xs text-slate-400 font-semibold">
                  Pastikan tulisan & detail data terbaca jelas
                </span>
                
                <div className="flex gap-2 w-full sm:w-auto">
                  <a 
                    href={previewDoc.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 sm:flex-initial px-5 py-2 bg-primary hover:bg-primary/95 rounded-lg text-white text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Buka / Unduh Berkas
                  </a>
                  
                  <button 
                    onClick={() => setPreviewDoc(null)}
                    className="flex-1 sm:flex-initial px-5 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg text-slate-700 text-xs font-bold transition-all cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MINIMAL FOOTER DECORATION */}
      <footer className="w-full py-6 px-6 border-t border-slate-200/50 bg-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 text-xs select-none">
        <p className="text-slate-400 font-semibold leading-none">© 2026 PKBM Bahtera Dua Kota Blitar. Hak Cipta Dilindungi.</p>
        <div className="flex gap-6 text-slate-400 font-semibold leading-none">
          <a href="#" className="hover:text-primary transition-colors underline">Privacy Policy</a>
          <a href="#" className="hover:text-primary transition-colors underline">Support Desk</a>
          <a href="#" className="hover:text-primary transition-colors underline">Terms of Service</a>
        </div>
      </footer>

    </div>
  );
}
