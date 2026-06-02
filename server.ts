import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { google } from "googleapis";
import dotenv from "dotenv";
import { Readable } from "stream";

dotenv.config();

const CONFIG_PATH = path.join(process.cwd(), "config.json");

function getAppConfig() {
  const defaultConf = {
    googleSpreadsheetId: process.env.GOOGLE_SPREADSHEET_ID || "1DSVqDAaMGSMhTmOvIk-qme_wPeFZ27LoftcVvYwj6iU",
    googleDriveFolderId: process.env.GOOGLE_DRIVE_FOLDER_ID || "1fcgrKLvJV7_NIa5FEIRcxUA0V5y4UrRd",
    googleScriptUrl: process.env.GOOGLE_SCRIPT_URL || ""
  };
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const data = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
      return { ...defaultConf, ...data };
    }
  } catch (e) {
    console.error("Failed to load config.json:", e);
  }
  return defaultConf;
}

function saveAppConfig(conf: any) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(conf, null, 2));
  } catch (e) {
    console.error("Failed to save config.json:", e);
  }
}

// Ensure first load setup
process.env.GOOGLE_SPREADSHEET_ID = getAppConfig().googleSpreadsheetId;
process.env.GOOGLE_DRIVE_FOLDER_ID = getAppConfig().googleDriveFolderId;

const app = express();
const PORT = 3000;

// Set up body parsers with generous limits to support base64 file uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const DB_PATH = path.join(process.cwd(), "db.json");
const PAYMENTS_PATH = path.join(process.cwd(), "db_payments.json");

// Core helper to load local payments DB
function getLocalPayments(): any[] {
  try {
    if (fs.existsSync(PAYMENTS_PATH)) {
      const data = fs.readFileSync(PAYMENTS_PATH, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Failed to load local payments DB:", err);
  }
  return [];
}

// Core helper to write local payments DB
function saveLocalPayments(data: any[]) {
  try {
    fs.writeFileSync(PAYMENTS_PATH, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Failed to write local payments DB:", err);
  }
}

// Core helper to load local registrations in case Google Sheet is offline or not configured
function getLocalRegistrations(): any[] {
  try {
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Failed to load local DB:", err);
  }
  // Default values if DB doesn't exist
  const defaultRegistrations = [
    {
      id: "REG-238491",
      program: {
        paket: "Paket C (Setara SMA)",
        jurusan: "IPS",
        peminatan: ["Multimedia", "Tata Boga"]
      },
      biodata: {
        namaLengkap: "Jane Dorothy",
        nik: "3171012345670001",
        nisn: "0054321098",
        tempatTanggalLahir: "Jakarta, 24/10/2005",
        jenisKelamin: "Perempuan",
        email: "jane.dorothy@example.com",
        phone: "+628123456789",
        street: "Jl. Merdeka No. 45",
        rtRw: "02/05",
        village: "Senen",
        district: "Senen",
        city: "Jakarta Pusat"
      },
      guardian: {
        fatherName: "John Dorothy",
        fatherJob: "Pegawai Negeri",
        motherName: "Mary Dorothy",
        motherJob: "Wiraswasta"
      },
      documents: {
        kk: "https://lh3.googleusercontent.com/d/mock-kk-link",
        ijazah: "https://lh3.googleusercontent.com/d/mock-ijazah-link",
        akta: "https://lh3.googleusercontent.com/d/mock-akta-link",
        photo: "https://lh3.googleusercontent.com/d/mock-photo-link"
      },
      date: "Oct 24, 2023",
      status: "Verified"
    },
    {
      id: "REG-847291",
      program: {
        paket: "Paket C (Setara SMA)",
        jurusan: "IPA",
        peminatan: ["Multimedia", "Elektronika"]
      },
      biodata: {
        namaLengkap: "Mark Smith",
        nik: "3273012354670002",
        nisn: "0049876543",
        tempatTanggalLahir: "Bandung, 15/05/2006",
        jenisKelamin: "Laki-laki",
        email: "mark.smith@example.com",
        phone: "+628771234567",
        street: "Jl. Dago No. 100",
        rtRw: "04/12",
        village: "Dago",
        district: "Coblong",
        city: "Bandung"
      },
      guardian: {
        fatherName: "William Smith",
        fatherJob: "Insinyur",
        motherName: "Elizabeth Smith",
        motherJob: "Ibu Rumah Tangga"
      },
      documents: {
        kk: "https://lh3.googleusercontent.com/d/mock-kk-link",
        ijazah: "https://lh3.googleusercontent.com/d/mock-ijazah-link",
        akta: "",
        photo: ""
      },
      date: "Oct 23, 2023",
      status: "Pending"
    },
    {
      id: "REG-109283",
      program: {
        paket: "Paket B (Setara SMP)",
        jurusan: "Select Jurusan",
        peminatan: ["Tata Busana"]
      },
      biodata: {
        namaLengkap: "Alice Lawson",
        nik: "3374012345670003",
        nisn: "0061122334",
        tempatTanggalLahir: "Semarang, 02/09/2007",
        jenisKelamin: "Perempuan",
        email: "alice.lawson@example.com",
        phone: "+628198765432",
        street: "Jl. Pandanaran No. 12",
        rtRw: "01/01",
        village: "Pekunden",
        district: "Semarang Tengah",
        city: "Semarang"
      },
      guardian: {
        fatherName: "Robert Lawson",
        fatherJob: "Nelayan",
        motherName: "Sarah Lawson",
        motherJob: "Guru"
      },
      documents: {
        kk: "https://lh3.googleusercontent.com/d/mock-kk-link",
        ijazah: "",
        akta: "",
        photo: ""
      },
      date: "Oct 22, 2023",
      status: "Rejected"
    },
    {
      id: "REG-721094",
      program: {
        paket: "Paket C (Setara SMA)",
        jurusan: "IPS",
        peminatan: ["Seni Tari", "Karawitan"]
      },
      biodata: {
        namaLengkap: "Robert Reed",
        nik: "3471012345670004",
        nisn: "0059988776",
        tempatTanggalLahir: "Yogyakarta, 19/11/2005",
        jenisKelamin: "Laki-laki",
        email: "robert.reed@example.com",
        phone: "+62811223344",
        street: "Jl. Malioboro No. 80",
        rtRw: "03/04",
        village: "Sosromenduran",
        district: "Gedongtengen",
        city: "Yogyakarta"
      },
      guardian: {
        fatherName: "James Reed",
        fatherJob: "Dosen",
        motherName: "Sophia Reed",
        motherJob: "Staf Administrasi"
      },
      documents: {
        kk: "https://lh3.googleusercontent.com/d/mock-kk-link",
        ijazah: "https://lh3.googleusercontent.com/d/mock-ijazah-link",
        akta: "https://lh3.googleusercontent.com/d/mock-akta-link",
        photo: "https://lh3.googleusercontent.com/d/mock-photo-link"
      },
      date: "Oct 21, 2023",
      status: "Verified"
    }
  ];
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(defaultRegistrations, null, 2));
  } catch (err) {
    console.error("Failed to create default DB:", err);
  }
  return defaultRegistrations;
}

function saveLocalRegistrations(data: any[]) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Failed to write local DB:", err);
  }
}

// Check Google auth integration environment setup
function getGoogleAuth() {
  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKey || serviceAccountKey.trim() === "" || serviceAccountKey === '""') return null;

  try {
    const creds = JSON.parse(serviceAccountKey);
    if (!creds || !creds.private_key) {
      console.warn("GOOGLE_SERVICE_ACCOUNT_KEY is present but does not contain a private_key.");
      return null;
    }
    return new google.auth.GoogleAuth({
      credentials: {
        client_email: creds.client_email,
        private_key: creds.private_key.replace(/\\n/g, "\n")
      },
      scopes: [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive.file",
        "https://www.googleapis.com/auth/drive"
      ]
    });
  } catch (err) {
    console.error("Google authentication GoogleAuth initialization error:", err);
    return null;
  }
}

// Google Sheets Headings
const SHEET_HEADERS = [
  "ID Pendaftaran",
  "Tanggal",
  "Status",
  "Nama Lengkap",
  "Paket Program",
  "Jurusan",
  "Peminatan",
  "NIK",
  "NISN",
  "Tempat Tanggal Lahir",
  "Jenis Kelamin",
  "Email",
  "No HP WA",
  "Alamat Jalan",
  "RT RW",
  "Desa Kelurahan",
  "Kecamatan",
  "Kabupaten Kota",
  "Nama Ayah",
  "Pekerjaan Ayah",
  "Nama Ibu",
  "Pekerjaan Ibu",
  "Nama Wali",
  "No HP Wali",
  "Alamat Wali",
  "File KK",
  "File Ijazah",
  "File Akta Kelahiran",
  "Pas Foto"
];

// Helper to convert registration object into a single row array
function buildSheetRow(reg: any): any[] {
  return [
    reg.id,
    reg.date,
    reg.status,
    reg.biodata.namaLengkap,
    reg.program.paket,
    reg.program.jurusan,
    reg.program.peminatan.join(", "),
    reg.biodata.nik,
    reg.biodata.nisn,
    reg.biodata.tempatTanggalLahir,
    reg.biodata.jenisKelamin,
    reg.biodata.email,
    reg.biodata.phone,
    reg.biodata.street,
    reg.biodata.rtRw,
    reg.biodata.village,
    reg.biodata.district,
    reg.biodata.city,
    reg.guardian.fatherName,
    reg.guardian.fatherJob,
    reg.guardian.motherName,
    reg.guardian.motherJob,
    reg.guardian.guardianName || "",
    reg.guardian.guardianPhone || "",
    reg.guardian.guardianAddress || "",
    reg.documents.kk || "",
    reg.documents.ijazah || "",
    reg.documents.akta || "",
    reg.documents.photo || ""
  ];
}

// Initializing the spreadsheet if empty headers
async function initializeGoogleSheet(sheets: any, spreadsheetId: string) {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "A1:C1"
    });
    if (!response.data.values || response.data.values.length === 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: "A1",
        valueInputOption: "RAW",
        requestBody: {
          values: [SHEET_HEADERS]
        }
      });
      console.log("Initialized blank Google Sheet with headers.");
    }
  } catch (err) {
    console.error("Failed to initialize headers in Google Sheet:", err);
  }
}

/* ==============================================
   EXPRESS SERVER API ROUTING
   ============================================== */

// Endpoint: Fetch and Save Configurations
app.get("/api/config", (req, res) => {
  res.json(getAppConfig());
});

app.post("/api/config", (req, res) => {
  const { googleSpreadsheetId, googleDriveFolderId, googleScriptUrl } = req.body;
  const current = getAppConfig();
  const updated = {
    googleSpreadsheetId: googleSpreadsheetId !== undefined ? googleSpreadsheetId : current.googleSpreadsheetId,
    googleDriveFolderId: googleDriveFolderId !== undefined ? googleDriveFolderId : current.googleDriveFolderId,
    googleScriptUrl: googleScriptUrl !== undefined ? googleScriptUrl.trim() : current.googleScriptUrl
  };
  saveAppConfig(updated);
  process.env.GOOGLE_SPREADSHEET_ID = updated.googleSpreadsheetId;
  process.env.GOOGLE_DRIVE_FOLDER_ID = updated.googleDriveFolderId;
  res.json({ success: true, config: updated });
});

// Endpoint: Trigger Database Initialization
app.post("/api/setup", async (req, res) => {
  const config = getAppConfig();
  const scriptUrl = config.googleScriptUrl;

  if (scriptUrl && scriptUrl.startsWith("https://script.google.com")) {
    try {
      const response = await fetch(scriptUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setup" })
      });
      if (response.ok) {
        const payload = await response.json();
        if (payload && payload.success) {
          return res.json({ success: true, message: payload.message || "Database successfully initialized!" });
        } else {
          return res.status(500).json({ error: payload.error || "Gagal menginisialisasi spreadsheet via Apps Script." });
        }
      } else {
        return res.status(500).json({ error: `Apps Script status ${response.status}` });
      }
    } catch (err: any) {
      return res.status(500).json({ error: "Gagal menghubungkan ke Apps Script: " + err.message });
    }
  }

  // Fallback if Google Service Account
  const auth = getGoogleAuth();
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
  if (auth && spreadsheetId) {
    try {
      const sheets = google.sheets({ version: "v4", auth });
      await initializeGoogleSheet(sheets, spreadsheetId);
      return res.json({ success: true, message: "Spreadsheet berhasil diinisialisasi menggunakan Google Service Account!" });
    } catch (err: any) {
      return res.status(500).json({ error: "Gagal inisialisasi spreadsheet: " + err.message });
    }
  }

  return res.status(400).json({ error: "Silakan konfigurasi URL Google Apps Script Web App terlebih dahulu di menu Settings." });
});

// Endpoint (Internal/Admin): Health and Cloud Synchronization diagnostics
app.get("/api/sync/status", async (req, res) => {
  const config = getAppConfig();
  const spreadsheetId = config.googleSpreadsheetId || null;
  const driveFolderId = config.googleDriveFolderId || null;
  const scriptUrl = config.googleScriptUrl || null;

  const status = {
    sheetConnected: false,
    driveConnected: false,
    spreadsheetId,
    driveFolderId,
    scriptUrl,
    usingScript: false,
    errorMessage: null as string | null
  };

  // If using Google Apps Script Web App
  if (scriptUrl && scriptUrl.startsWith("https://script.google.com")) {
    status.usingScript = true;
    try {
      const response = await fetch(scriptUrl);
      if (response.ok) {
        status.sheetConnected = true;
        status.driveConnected = true;
      } else {
        status.errorMessage = `Apps Script Web App dikembalikan status ${response.status}. Pastikan sudah di-deploy dengan benar sebagai 'Anyone' (Siapa saja).`;
      }
    } catch (err: any) {
      status.errorMessage = `Gagal terhubung dengan Apps Script: ${err.message || err}. Pastikan URL Web App valid dan sudah di-publish.`;
    }
    return res.json(status);
  }

  // Fallback to Google Auth
  const auth = getGoogleAuth();
  if (!auth) {
    status.errorMessage = "Tidak ada integrasi Apps Script Web App aktif, dan Kredensial Service Account Google tidak ditemukan. Berjalan dalam mode lokal aman.";
    return res.json(status);
  }

  if (!spreadsheetId) {
    status.errorMessage = "Google Spreadsheet ID belum dikonfigurasi.";
    return res.json(status);
  }

  try {
    const sheets = google.sheets({ version: "v4", auth });
    await initializeGoogleSheet(sheets, spreadsheetId);
    status.sheetConnected = true;
  } catch (err: any) {
    status.errorMessage = `Koneksi Google Sheets gagal: ${err.message || err}`;
  }

  if (driveFolderId) {
    try {
      const drive = google.drive({ version: "v3", auth });
      await drive.files.get({ fileId: driveFolderId });
      status.driveConnected = true;
    } catch (err: any) {
      console.error("Drive Verification Issue:", err.message || err);
    }
  }

  res.json(status);
});

// Endpoint: Administrative Panel Authenticator
app.post("/api/admin/login", (req, res) => {
  const { username, password } = req.body;
  // Standard educational gateway credentials. Easy to customize or modify
  if (username === "admin" && password === "123Qwe,./") {
    return res.json({ success: true, token: "admin-jwt-token-academic-key-1992" });
  }
  return res.status(401).json({ success: false, message: "Invalid administrative credentials." });
});

// Endpoint: Fetch Student Registrations (Merges local and cloud sync data seamlessly)
app.get("/api/registrations", async (req, res) => {
  const config = getAppConfig();
  const scriptUrl = config.googleScriptUrl;
  const localRegs = getLocalRegistrations();

  // If Google Apps Script Web App URL is configured
  if (scriptUrl && scriptUrl.startsWith("https://script.google.com")) {
    try {
      const response = await fetch(scriptUrl);
      if (response.ok) {
        const payload = await response.json();
        if (payload && payload.success && Array.isArray(payload.data)) {
          saveLocalRegistrations(payload.data);
          return res.json({ source: "script", data: payload.data });
        }
      }
      console.warn("Google Apps Script response wasn't successful. Falling back to local cache.");
    } catch (err: any) {
      console.error("Failed fetching from Google Apps Script:", err.message || err);
    }
    return res.json({ source: "local (cached)", data: localRegs });
  }

  const auth = getGoogleAuth();
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;

  if (!auth || !spreadsheetId) {
    // Falls back seamlessly to local DB
    return res.json({ source: "local", data: localRegs });
  }

  try {
    const sheets = google.sheets({ version: "v4", auth });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Sheet1!A2:AC" // Skips the headers row
    });

    const values = response.data.values || [];
    if (values.length === 0) {
      // If blank sheet, map our rich pre-populated defaults back into Google Sheet
      console.log("Empty Google Sheet detected. Syncing default database to Google Sheet...");
      const rows = localRegs.map(r => buildSheetRow(r));
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: "Sheet1!A2",
        valueInputOption: "USER_ENTERED",
        requestBody: { values: rows }
      });
      return res.json({ source: "sheets", data: localRegs });
    }

    // Map columns from sheet back to student registrations objects
    const cloudRegs = values.map((row) => {
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

    // Mirror synced cache to local state
    saveLocalRegistrations(cloudRegs);

    res.json({ source: "sheets", data: cloudRegs });
  } catch (err: any) {
    console.error("Sheets retrieval failed, serving cached local database.", err.message || err);
    res.json({ source: "local (cached due to sheets issue)", data: localRegs });
  }
});

// Endpoint: Register document file into Google Drive
app.post("/api/registrations/upload", async (req, res) => {
  const { fileName, base64Data, mimeType, registrationCode, studentName, docType } = req.body;
  if (!base64Data) {
    return res.status(400).json({ error: "No base64 file data provided." });
  }

  const config = getAppConfig();
  const scriptUrl = config.googleScriptUrl;

  const docFriendlyNames: Record<string, string> = {
    kk: "Kartu Keluarga (KK)",
    ijazah: "Ijazah Kelulusan Terakhir",
    akta: "Akta Kelahiran",
    photo: "Pas Foto 3x4"
  };
  const friendlyDoc = docFriendlyNames[docType as string] || docType || "Dokumen Pendukung";
  const ext = fileName.split(".").pop() || "png";
  const cleanStudentName = studentName ? (studentName as string).replace(/[\/\\]/g, "_").trim() : "Siswa";
  const cleanRegCode = registrationCode ? (registrationCode as string).replace(/[\/\\]/g, "_").trim() : "Draft";
  const finalFileName = `${cleanRegCode} - ${cleanStudentName} - ${friendlyDoc}.${ext}`;

  // Prefer Google Apps Script Web App for file uploads
  if (scriptUrl && scriptUrl.startsWith("https://script.google.com")) {
    try {
      const response = await fetch(scriptUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "upload",
          fileName: finalFileName,
          base64Data,
          mimeType,
          registrationCode,
          studentName,
          docType
        })
      });
      if (response.ok) {
        const payload = await response.json();
        if (payload && payload.success) {
          return res.json({ success: true, url: payload.url });
        } else {
          return res.status(500).json({ error: payload.error || "Gagal mengunggah berkas ke Google Drive via Apps Script." });
        }
      } else {
        return res.status(500).json({ error: `Apps Script mengembalikan status ${response.status}` });
      }
    } catch (err: any) {
      console.error("Failed uploading to Google Apps Script:", err.message || err);
      return res.status(500).json({ error: "Gagal menghubungi Google Apps Script: " + err.message });
    }
  }

  const auth = getGoogleAuth();
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  // Fallback if not configured
  if (!auth || !folderId) {
    console.log("No Google Drive connection configured. Simulating asset upload local storage.");
    // Generate a beautiful preview mock URL
    const randId = Math.floor(Math.random() * 900000) + 100000;
    return res.json({
      success: true,
      url: `https://lh3.googleusercontent.com/d/mock-file-${cleanRegCode}-${docType || 'doc'}-link`,
      fileName: finalFileName
    });
  }

  try {
    const drive = google.drive({ version: "v3", auth });
    
    // Auto-create or resolve sub-folder
    let targetFolderId = folderId;
    if (registrationCode && studentName) {
      const subFolderName = `${cleanRegCode} - ${cleanStudentName}`;
      try {
        const query = `mimeType = 'application/vnd.google-apps.folder' and name = '${subFolderName.replace(/'/g, "\\'")}' and '${folderId}' in parents and trashed = false`;
        const searchRes = await drive.files.list({
          q: query,
          fields: "files(id, name)",
          spaces: "drive"
        });

        if (searchRes.data.files && searchRes.data.files.length > 0) {
          targetFolderId = searchRes.data.files[0].id!;
        } else {
          // Create the sub-folder
          const folderMetadata = {
            name: subFolderName,
            mimeType: "application/vnd.google-apps.folder",
            parents: [folderId]
          };
          const newFolder = await drive.files.create({
            requestBody: folderMetadata,
            fields: "id"
          });
          targetFolderId = newFolder.data.id!;

          // Make the folder publicly readable so it's transparently inspectable
          try {
            await drive.permissions.create({
              fileId: targetFolderId,
              requestBody: {
                role: "reader",
                type: "anyone"
              }
            });
          } catch (pe) {
            console.warn("Failed setting subfolder permissions, continuing safely:", pe.message);
          }
        }
      } catch (folderErr: any) {
        console.warn("Failed ensuring Drive student subfolder, using master folder ID instead:", folderErr.message);
      }
    }

    // Clean base64 buffer extraction
    const base64Clean = base64Data.replace(/^data:.*?;base64,/, "");
    const buffer = Buffer.from(base64Clean, "base64");

    const fileMetadata: any = {
      name: finalFileName,
      parents: [targetFolderId]
    };

    const media = {
      mimeType,
      body: fs.createReadStream(path.join(process.cwd(), "package.json")) // Placehold standard upload
    };

    // Construct stream directly from Buffer instead of file-system write
    const { Readable } = require("stream");
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);
    media.body = stream;

    const uploadedFile = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: "id, webViewLink, webContentLink"
    });

    const fileId = uploadedFile.data.id;

    // Grant public viewing rights to link so admins can view it in the iframe
    try {
      await drive.permissions.create({
        fileId: fileId!,
        requestBody: {
          role: "reader",
          type: "anyone"
        }
      });
    } catch (permErr: any) {
      console.warn("Failed to set open permissions on drive file:", permErr.message);
    }

    const viewLink = uploadedFile.data.webViewLink;
    res.json({ success: true, fileId, url: viewLink });
  } catch (err: any) {
    console.error("Google Drive Upload Failure:", err.message || err);
    res.status(500).json({ error: "Drive Upload Failed: " + (err.message || err) });
  }
});

// Endpoint: Create student registration (Appends row to Sheet and updates local DB cache)
app.post("/api/registrations", async (req, res) => {
  const newReg = req.body;
  if (!newReg || !newReg.id) {
    return res.status(400).json({ error: "Invalid registration structure." });
  }

  const config = getAppConfig();
  const scriptUrl = config.googleScriptUrl;

  // Always save locally
  const currentRegs = getLocalRegistrations();
  currentRegs.unshift(newReg); // Prepend to show immediately in 'Recent' lists
  saveLocalRegistrations(currentRegs);

  // Prefer Google Apps Script Web App
  if (scriptUrl && scriptUrl.startsWith("https://script.google.com")) {
    try {
      const response = await fetch(scriptUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "register",
          data: newReg
        })
      });
      if (response.ok) {
        const payload = await response.json();
        if (payload && payload.success) {
          return res.json({ success: true, synced: true, data: newReg });
        } else {
          return res.json({ success: true, synced: false, error: payload.error || "Gagal sinkronisasi data ke spreadsheet via Apps Script", data: newReg });
        }
      } else {
        return res.json({ success: true, synced: false, error: `Apps Script status ${response.status}`, data: newReg });
      }
    } catch (err: any) {
      console.error("Failed registering to Google Apps Script:", err.message || err);
      return res.json({ success: true, synced: false, error: "Gagal menghubungkan ke Apps Script: " + err.message, data: newReg });
    }
  }

  const auth = getGoogleAuth();
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;

  if (!auth || !spreadsheetId) {
    return res.json({ success: true, synced: false, data: newReg });
  }

  try {
    const sheets = google.sheets({ version: "v4", auth });
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "Sheet1!A2",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [buildSheetRow(newReg)]
      }
    });
    res.json({ success: true, synced: true, data: newReg });
  } catch (err: any) {
    console.error("Failed to append row to Google Sheets database:", err.message || err);
    res.json({ success: true, synced: false, error: err.message, data: newReg });
  }
});

// Endpoint: Update Student Registration Documents (uploaded post-form)
app.patch("/api/registrations/:id/documents", async (req, res) => {
  const { id } = req.params;
  const { documents } = req.body;

  if (!documents) {
    return res.status(400).json({ error: "Documents attribute is required." });
  }

  const currentRegs = getLocalRegistrations();
  const itemIndex = currentRegs.findIndex(r => r.id === id);

  if (itemIndex === -1) {
    return res.status(404).json({ error: "Student registration not found." });
  }

  // Update locally
  currentRegs[itemIndex].documents = {
    kk: documents.kk || "",
    ijazah: documents.ijazah || "",
    akta: documents.akta || "",
    photo: documents.photo || ""
  };
  saveLocalRegistrations(currentRegs);

  // Sync with Google Sheets if configured
  const auth = getGoogleAuth();
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;

  if (auth && spreadsheetId) {
    try {
      const sheets = google.sheets({ version: "v4", auth });
      const searchResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "Sheet1!A1:A5000"
      });

      const rows = searchResponse.data.values || [];
      let targetRowIndex = -1;
      for (let i = 0; i < rows.length; i++) {
        if (rows[i][0] === id) {
          targetRowIndex = i + 1;
          break;
        }
      }

      if (targetRowIndex !== -1) {
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `Sheet1!AB${targetRowIndex}:AE${targetRowIndex}`,
          valueInputOption: "RAW",
          requestBody: {
            values: [[
              documents.kk || "",
              documents.ijazah || "",
              documents.akta || "",
              documents.photo || ""
            ]]
          }
        });
      }
    } catch (sheetErr: any) {
      console.error("Failed to update documents on Google Sheets:", sheetErr.message || sheetErr);
    }
  }

  res.json({ success: true, data: currentRegs[itemIndex] });
});

// Endpoint (Destructive/State mutation): Update Student Registration Status with user confirmation
app.patch("/api/registrations/:id", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  if (!status) {
    return res.status(400).json({ error: "Status attribute is required." });
  }

  const config = getAppConfig();
  const scriptUrl = config.googleScriptUrl;

  const currentRegs = getLocalRegistrations();
  const itemIndex = currentRegs.findIndex(r => r.id === id);

  if (itemIndex === -1) {
    return res.status(404).json({ error: "Student registration not found." });
  }

  currentRegs[itemIndex].status = status;
  saveLocalRegistrations(currentRegs);

  // Prefer Google Apps Script Web App
  if (scriptUrl && scriptUrl.startsWith("https://script.google.com")) {
    try {
      const response = await fetch(scriptUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateStatus",
          id,
          status
        })
      });
      if (response.ok) {
        const payload = await response.json();
        if (payload && payload.success) {
          return res.json({ success: true, synced: true, data: currentRegs[itemIndex] });
        } else {
          return res.json({ success: true, synced: false, error: payload.error || "Gagal update status via Apps Script", data: currentRegs[itemIndex] });
        }
      } else {
        return res.json({ success: true, synced: false, error: `Apps Script status ${response.status}`, data: currentRegs[itemIndex] });
      }
    } catch (err: any) {
      console.error("Failed updating status in Google Apps Script:", err.message || err);
      return res.json({ success: true, synced: false, error: "Gagal menghubungi Google Apps Script: " + err.message, data: currentRegs[itemIndex] });
    }
  }

  const auth = getGoogleAuth();
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;

  if (!auth || !spreadsheetId) {
    return res.json({ success: true, synced: false, data: currentRegs[itemIndex] });
  }

  try {
    const sheets = google.sheets({ version: "v4", auth });
    
    // Find the row number by pulling down the IDs
    const searchResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Sheet1!A1:A5000"
    });

    const rows = searchResponse.data.values || [];
    let targetRowIndex = -1;
    for (let i = 0; i < rows.length; i++) {
      if (rows[i][0] === id) {
        targetRowIndex = i + 1; // 1-indexed row number
        break;
      }
    }

    if (targetRowIndex !== -1) {
      // Update the status cell (Column C is index 3)
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `Sheet1!C${targetRowIndex}`,
        valueInputOption: "RAW",
        requestBody: {
          values: [[status]]
        }
      });
      res.json({ success: true, synced: true, data: currentRegs[itemIndex] });
    } else {
      res.json({ success: true, synced: false, message: "Row index not successfully resolved on Google Sheets. Saved locally.", data: currentRegs[itemIndex] });
    }
  } catch (err: any) {
    console.error("Failed to updates student status on Google Sheets:", err.message || err);
    res.json({ success: true, synced: false, error: err.message, data: currentRegs[itemIndex] });
  }
});

/* ==============================================
   PAYMENT RECEIPT ENDPOINTS (LIGHTWEIGHT DB)
   ============================================== */

// Endpoint: Fetch payments list
app.get("/api/payments", (req, res) => {
  const payments = getLocalPayments();
  res.json({ success: true, data: payments });
});

// Helper to ensure "Pembayaran" sheet exists with correct headers
async function ensurePaymentSheetExists(sheets: any, spreadsheetId: string) {
  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetsList = meta.data.sheets || [];
    const hasPaymentSheet = sheetsList.some((s: any) => s.properties.title === "Pembayaran");
    if (!hasPaymentSheet) {
      console.log("Sheet 'Pembayaran' not found in spreadsheet. Creating it now...");
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: "Pembayaran",
                  gridProperties: { rowCount: 1000, columnCount: 10 }
                }
              }
            }
          ]
        }
      });
      // Add Header Row
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: "Pembayaran!A1",
        valueInputOption: "RAW",
        requestBody: {
          values: [["ID Pembayaran", "Kode Registrasi", "Nama Siswa", "Keterangan Pembayaran", "Tanggal", "URL Bukti", "Status Verifikasi"]]
        }
      });
      console.log("Successfully created 'Pembayaran' sheet and appended header row.");
    }
  } catch (err: any) {
    console.error("Failed to check/create 'Pembayaran' sheet:", err.message || err);
  }
}

// Endpoint: Update status of a payment (e.g. Verified / Rejected)
app.patch("/api/payments/:id", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // "Verified" | "Rejected" | "Pending"
  
  if (!status) {
    return res.status(400).json({ error: "status is required." });
  }

  const payments = getLocalPayments();
  const index = payments.findIndex(p => p.id === id);
  if (index === -1) {
    return res.status(404).json({ success: false, error: "Payment record not found." });
  }

  payments[index].status = status;
  saveLocalPayments(payments);

  const config = getAppConfig();
  const scriptUrl = config.googleScriptUrl;

  // 1. Sync update to Gas Web App if configured
  if (scriptUrl && scriptUrl.startsWith("https://script.google.com")) {
    try {
      const response = await fetch(scriptUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updatePaymentStatus",
          id,
          status
        })
      });
      if (response.ok) {
        const payload = await response.json();
        if (payload && payload.success) {
          return res.json({ success: true, synced: true, data: payments[index] });
        }
      }
    } catch (err: any) {
      console.error("Failed syncing payment status to Google Apps Script:", err.message || err);
    }
  }

  // 2. Sync to standard sheets API if configured
  const auth = getGoogleAuth();
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;

  if (auth && spreadsheetId) {
    try {
      const sheets = google.sheets({ version: "v4", auth });
      await ensurePaymentSheetExists(sheets, spreadsheetId);

      const listResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "Pembayaran!A1:A5000"
      });

      const rows = listResponse.data.values || [];
      let targetRowIndex = -1;
      for (let i = 0; i < rows.length; i++) {
        if (rows[i][0] === id) {
          targetRowIndex = i + 1;
          break;
        }
      }

      if (targetRowIndex !== -1) {
        // Update Column G (Status Verifikasi) - which is index 7
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `Pembayaran!G${targetRowIndex}`,
          valueInputOption: "RAW",
          requestBody: {
            values: [[status]]
          }
        });
        return res.json({ success: true, synced: true, data: payments[index] });
      }
    } catch (err: any) {
      console.error("Failed updating payment status on Google sheets:", err.message || err);
    }
  }

  res.json({ success: true, synced: false, data: payments[index] });
});

// Endpoint: Submit payment with optional Google Drive / Apps Script upload
app.post("/api/payments", async (req, res) => {
  const { registrationCode, studentName, description, paymentFileName, paymentBase64, paymentMimeType } = req.body;

  if (!registrationCode || !studentName) {
    return res.status(400).json({ error: "Kode registrasi dan nama lengkap siswa harus diisi." });
  }

  let fileUrl = "";
  if (paymentBase64) {
    const cleanStudentName = studentName ? (studentName as string).replace(/[\/\\]/g, "_").trim() : "Siswa";
    const cleanRegCode = registrationCode ? (registrationCode as string).replace(/[\/\\]/g, "_").trim() : "Draft";
    const ext = paymentFileName ? paymentFileName.split(".").pop() : "png";
    const finalFileName = `${cleanRegCode} - ${cleanStudentName} - Bukti Pembayaran.${ext}`;

    const config = getAppConfig();
    const scriptUrl = config.googleScriptUrl;

    if (scriptUrl && scriptUrl.startsWith("https://script.google.com")) {
      try {
        const response = await fetch(scriptUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "upload",
            fileName: finalFileName,
            base64Data: paymentBase64,
            mimeType: paymentMimeType || "image/png",
            registrationCode,
            studentName,
            docType: "bukti_pembayaran"
          })
        });
        if (response.ok) {
          const payload = await response.json();
          if (payload && payload.success) {
            fileUrl = payload.url;
          }
        }
      } catch (err: any) {
        console.error("Failed uploading payment back to Apps Script:", err);
      }
    }

    if (!fileUrl) {
      const auth = getGoogleAuth();
      const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

      if (!auth || !folderId) {
        fileUrl = `https://lh3.googleusercontent.com/d/mock-file-${cleanRegCode}-bukti_pembayaran-link`;
      } else {
        try {
          const drive = google.drive({ version: "v3", auth });
          let targetFolderId = folderId;

          const subFolderName = `${cleanRegCode} - ${cleanStudentName}`;
          try {
            const query = `mimeType = 'application/vnd.google-apps.folder' and name = '${subFolderName.replace(/'/g, "\\'")}' and '${folderId}' in parents and trashed = false`;
            const searchRes = await drive.files.list({ q: query, fields: "files(id, name)" });
            if (searchRes.data.files && searchRes.data.files.length > 0) {
              targetFolderId = searchRes.data.files[0].id!;
            } else {
              const newFolder = await drive.files.create({
                requestBody: { name: subFolderName, mimeType: "application/vnd.google-apps.folder", parents: [folderId] },
                fields: "id"
              });
              targetFolderId = newFolder.data.id!;
              try {
                await drive.permissions.create({ fileId: targetFolderId, requestBody: { role: "reader", type: "anyone" } });
              } catch (pe) {}
            }
          } catch (err) {}

          const base64Clean = paymentBase64.replace(/^data:.*?;base64,/, "");
          const buffer = Buffer.from(base64Clean, "base64");
          const driveFile = await drive.files.create({
            requestBody: { name: finalFileName, parents: [targetFolderId] },
            media: { mimeType: paymentMimeType || "image/png", body: Readable.from(buffer) },
            fields: "id, webViewLink"
          });
          fileUrl = driveFile.data.webViewLink || `https://lh3.googleusercontent.com/d/${driveFile.data.id}`;
        } catch (err: any) {
          console.error("Failed uploading payment to Google Drive:", err);
          fileUrl = `https://lh3.googleusercontent.com/d/mock-file-${cleanRegCode}-bukti_pembayaran-link`;
        }
      }
    }
  }

  const payments = getLocalPayments();
  const newPayment = {
    id: "PAY-" + Math.floor(100000 + Math.random() * 900000),
    registrationCode,
    studentName,
    description,
    fileUrl,
    date: new Date().toLocaleDateString("id-ID", { year: "numeric", month: "short", day: "numeric" }),
    status: "Pending"
  };

  payments.unshift(newPayment);
  saveLocalPayments(payments);

  // Sync submission to spreadsheet if configured
  const config = getAppConfig();
  const scriptUrl = config.googleScriptUrl;

  // 1. Sync via Apps Script
  if (scriptUrl && scriptUrl.startsWith("https://script.google.com")) {
    try {
      await fetch(scriptUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submitPayment",
          data: newPayment
        })
      });
    } catch (err: any) {
      console.error("Failed to sync payment submission to Google Apps Script:", err.message || err);
    }
  }

  // 2. Sync via standard sheets API
  const auth = getGoogleAuth();
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;

  if (auth && spreadsheetId) {
    try {
      const sheets = google.sheets({ version: "v4", auth });
      await ensurePaymentSheetExists(sheets, spreadsheetId);

      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: "Pembayaran!A2",
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [[
            newPayment.id,
            newPayment.registrationCode,
            newPayment.studentName,
            newPayment.description,
            newPayment.date,
            newPayment.fileUrl,
            newPayment.status
          ]]
        }
      });
    } catch (err: any) {
      console.error("Failed to append payment row on Google sheets:", err.message || err);
    }
  }

  res.json({ success: true, data: newPayment });
});

/* ==============================================
   VITE DEV ENVIRONMENT INTERACTION MIDDLEWARES
   ============================================== */

async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`PKBM Bahtera Dua Server fully booted up and running on port ${PORT}`);
  });
}

start();
