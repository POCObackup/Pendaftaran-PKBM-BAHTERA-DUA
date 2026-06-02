// ==========================================
// GOOGLE APPS SCRIPT DATABASE CONTROL HEAD
// ==========================================
// Institution: PKBM Bahtera Dua (Kota Blitar)
// Spreadsheet: https://docs.google.com/spreadsheets/d/1DSVqDAaMGSMhTmOvIk-qme_wPeFZ27LoftcVvYwj6iU/edit
// Drive Folder: https://drive.google.com/drive/folders/1fcgrKLvJV7_NIa5FEIRcxUA0V5y4UrRd
// ==========================================

const SPREADSHEET_ID = "1DSVqDAaMGSMhTmOvIk-qme_wPeFZ27LoftcVvYwj6iU";
const DRIVE_FOLDER_ID = "1fcgrKLvJV7_NIa5FEIRcxUA0V5y4UrRd";

/**
 * Setup Database: Initializes headers on the Google Sheet automatically.
 * Can be run manually inside Google Apps Script editor or triggered automatically on first access.
 */
function setupDatabase() {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheets()[0];
    const headers = [
      "ID", "Tanggal", "Status", "Nama Lengkap", "Paket Pendidikan", "Jurusan", "Peminatan", 
      "NIK", "NISN", "Tempat/Tanggal Lahir", "Jenis Kelamin", "Email", "Telepon", 
      "Alamat Jalan", "RT/RW", "Kelurahan", "Kecamatan", "Kota", 
      "Nama Ayah", "Pekerjaan Ayah", "Nama Ibu", "Pekerjaan Ibu", "Nama Wali", "Telepon Wali", "Alamat Wali", 
      "Berkas KK (Link)", "Berkas Ijazah (Link)", "Berkas Akta (Link)", "Foto (Link)"
    ];
    
    // Set headers in the first row
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    // Auto-adjust design
    sheet.getRange("A1:AC1").setFontWeight("bold").setBackground("#e2e8f0").setFontColor("#0f172a");
    sheet.setFrozenRows(1);
    
    return { success: true, message: "Google Sheet successfully initialized with column headers." };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

/**
 * Handle GET Requests: Fetch list of registrations from the Spreadsheet
 * Merges and maps columns into structured StudentRegistration objects for the UI
 */
function doGet(e) {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheets()[0];
    
    // Auto-setup if sheet has no data or headers
    if (sheet.getLastRow() === 0) {
      setupDatabase();
    }

    const data = sheet.getDataRange().getValues();
    
    // If workbook only contains headers
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

/**
 * Handle POST Requests: Actions for Document Upload, Creation, or Status Updates
 */
function doPost(e) {
  try {
    const json = JSON.parse(e.postData.contents);
    const action = json.action;
    
    // ACTION: UPLOAD DOCUMENT FILE TO GOOGLE DRIVE
    if (action === "upload") {
      const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
      const base64Clean = json.base64Data.replace(/^data:.*?;base64,/, "");
      const decoded = Utilities.base64Decode(base64Clean);
      const blob = Utilities.newBlob(decoded, json.mimeType, json.fileName);
      const file = folder.createFile(blob);
      
      // Make file viewable by anyone with the link so the PKBM admin panel can preview it
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      
      return ContentService.createTextOutput(JSON.stringify({ success: true, url: file.getUrl() }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // ACTION: MANUALLY TRIGGER DATABASE INITIALIZATION
    else if (action === "setup") {
      const res = setupDatabase();
      return ContentService.createTextOutput(JSON.stringify(res))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // ACTION: INSERT STUDENT REGISTRATION RECORD
    else if (action === "register") {
      const reg = json.data;
      const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheets()[0];
      
      // Auto-initialize if empty
      if (sheet.getLastRow() === 0) {
        setupDatabase();
      }
      
      const row = [
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
      
      sheet.appendRow(row);
      return ContentService.createTextOutput(JSON.stringify({ success: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // ACTION: UPDATE REGISTRATION ACCORDING TO ID (e.g., Approve / Reject / Pending Status)
    else if (action === "updateStatus") {
      const id = json.id;
      const status = json.status;
      const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheets()[0];
      const data = sheet.getDataRange().getValues();
      
      let rowIdx = -1;
      for (let i = 0; i < data.length; i++) {
        if (data[i][0] === id) {
          rowIdx = i + 1; // 1-based index in Google Sheets row positioning
          break;
        }
      }
      
      if (rowIdx !== -1) {
        // Status column is Column C (index 3)
        sheet.getRange(rowIdx, 3).setValue(status);
        return ContentService.createTextOutput(JSON.stringify({ success: true }))
          .setMimeType(ContentService.MimeType.JSON);
      } else {
        return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Student ID not found in spreadsheet." }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Unsupported action." }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
