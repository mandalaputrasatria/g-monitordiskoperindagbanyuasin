/**
 * ============================================================================
 * SISTEM WEB APP MONITORING KERJA STAF, DIKTE SUARA & ARSIP GOOGLE DRIVE
 * Backend: Google Apps Script (Code.gs)
 * ============================================================================
 */

function doGet(e) {
  try {
    return HtmlService.createTemplateFromFile('index')
      .evaluate()
      .setTitle('Sistem Monitoring & Arsip Kerja Staf')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  } catch (err) {
    return HtmlService.createTemplateFromFile('Index')
      .evaluate()
      .setTitle('Sistem Monitoring & Arsip Kerja Staf')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }
}

/**
 * Endpoint API Web App (Dapat diakses oleh aplikasi eksternal/localhost)
 */
function doPost(e) {
  try {
    const postData = JSON.parse(e.postData.contents);
    const fn = postData.functionName;
    const args = postData.args || [];
    let result;

    if (fn === 'getOfficeBranding') result = getOfficeBranding();
    else if (fn === 'saveOfficeBranding') result = saveOfficeBranding(args[0], args[1], args[2], args[3], args[4], args[5]);
    else if (fn === 'loginUser') result = loginUser(args[0], args[1]);
    else if (fn === 'logoutUser') result = logoutUser(args[0]);
    else if (fn === 'sendHeartbeat') result = sendHeartbeat(args[0], args[1]);
    else if (fn === 'getAdminDashboardData') result = getAdminDashboardData(args[0]);
    else if (fn === 'registerNewStaff') result = registerNewStaff(args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7]);
    else if (fn === 'archiveStaffWorkFile') result = archiveStaffWorkFile(args[0], args[1], args[2]);
    else if (fn === 'getStaffGridCells') result = getStaffGridCells(args[0]);
    else if (fn === 'updateStaffCellByA1') result = updateStaffCellByA1(args[0], args[1], args[2]);
    else if (fn === 'updateStaffData') result = updateStaffData(args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7], args[8], args[9]);
    else if (fn === 'forceAllStaffOffline') result = forceAllStaffOffline();
    else if (fn === 'deleteStaff') result = deleteStaff(args[0]);
    else result = { success: false, message: 'Fungsi tidak dikenal: ' + fn };

    return ContentService.createTextOutput(JSON.stringify({ status: 'success', result: result }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 1. FUNGSI INISIALISASI OTOMATIS (JALANKAN 1X DI AWAL)
 * Otomatis membuat Sheet DB_USERS, DB_ARSIP, DB_CONFIG, dan Folder Google Drive
 */
function setupSystem() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Buat / Cek Sheet DB_CONFIG
  let sheetConfig = ss.getSheetByName('DB_CONFIG');
  if (!sheetConfig) {
    sheetConfig = ss.insertSheet('DB_CONFIG');
    sheetConfig.appendRow(['KEY', 'VALUE']);
  }
  
  const configData = sheetConfig.getDataRange().getValues();
  let rootFolderId = '';
  let activeFolderId = '';
  let archiveRootFolderId = '';
  let photoFolderId = '';
  
  for (let i = 1; i < configData.length; i++) {
    if (configData[i][0] === 'ROOT_FOLDER_ID') rootFolderId = configData[i][1];
    if (configData[i][0] === 'ACTIVE_FOLDER_ID') activeFolderId = configData[i][1];
    if (configData[i][0] === 'ARCHIVE_ROOT_ID') archiveRootFolderId = configData[i][1];
    if (configData[i][0] === 'PHOTO_FOLDER_ID') photoFolderId = configData[i][1];
  }
  
  // Buat Struktur Folder di Google Drive jika belum ada
  if (!rootFolderId) {
    const rootFolder = DriveApp.createFolder('🏢 SISTEM KERJA & ARSIP STAF');
    const activeFolder = rootFolder.createFolder('01_File_Kerja_Aktif');
    const archiveFolder = rootFolder.createFolder('02_Arsip_Tahunan');
    const photoFolder = rootFolder.createFolder('03_Foto_Profil_Staf');
    
    archiveFolder.createFolder('2024');
    archiveFolder.createFolder('2025');
    archiveFolder.createFolder('2026');
    
    rootFolderId = rootFolder.getId();
    activeFolderId = activeFolder.getId();
    archiveRootFolderId = archiveFolder.getId();
    photoFolderId = photoFolder.getId();
    
    sheetConfig.appendRow(['ROOT_FOLDER_ID', rootFolderId]);
    sheetConfig.appendRow(['ACTIVE_FOLDER_ID', activeFolderId]);
    sheetConfig.appendRow(['ARCHIVE_ROOT_ID', archiveRootFolderId]);
    sheetConfig.appendRow(['PHOTO_FOLDER_ID', photoFolderId]);
  } else if (!photoFolderId) {
    try {
      const rootFolder = DriveApp.getFolderById(rootFolderId);
      const photoFolder = rootFolder.createFolder('03_Foto_Profil_Staf');
      photoFolderId = photoFolder.getId();
      sheetConfig.appendRow(['PHOTO_FOLDER_ID', photoFolderId]);
    } catch (e) {}
  }
  
  // 2. Buat / Cek Sheet DB_USERS
  let sheetUsers = ss.getSheetByName('DB_USERS');
  if (!sheetUsers) {
    sheetUsers = ss.insertSheet('DB_USERS');
    sheetUsers.appendRow([
      'ID_Staf', 'Nama_Lengkap', 'NIP', 'Jabatan', 'Unit_Kerja', 'No_WA', 'Foto_URL',
      'Username', 'Password', 'Role', 
      'Sheet_ID_Aktif', 'Sheet_URL_Aktif', 'Last_Active_Ms', 'Status_Manual', 'Total_Baris'
    ]);
    sheetUsers.getRange('A1:O1').setFontWeight('bold').setBackground('#1e293b').setFontColor('#ffffff');
    
    // Default Admin
    sheetUsers.appendRow([
      'ADM-01', 'Administrator Utama', '-', 'Kepala Administrator', 'Sekretariat Utama', '-',
      'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
      'admin', 'admin123', 'ADMIN', 
      '-', '-', new Date().getTime(), 'ONLINE', 0
    ]);
    
    // Contoh Staf
    createStaffInternal(
      'Budi Santoso, S.Kom', '19900812 201503 1 004', 'Pranata Komputer Ahli Pertama', 
      'Bidang PIAK & Pemanfaatan Data', '081234567890',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      'staf1', '12345', activeFolderId, sheetUsers
    );
  } else {
    // Migrasi otomatis jika masih struktur 10 kolom lama
    const lastCol = sheetUsers.getLastColumn();
    if (lastCol > 0) {
      const header = sheetUsers.getRange(1, 1, 1, lastCol).getValues()[0];
      const col = getUserColumnsMap(header);
      if (col.nip === -1) {
        const allData = sheetUsers.getDataRange().getValues();
        const newHeader = [
          'ID_Staf', 'Nama_Lengkap', 'NIP', 'Jabatan', 'Unit_Kerja', 'No_WA', 'Foto_URL',
          'Username', 'Password', 'Role', 
          'Sheet_ID_Aktif', 'Sheet_URL_Aktif', 'Last_Active_Ms', 'Status_Manual', 'Total_Baris'
        ];
        const newRows = [newHeader];
        for (let r = 1; r < allData.length; r++) {
          const row = allData[r];
          const isAdm = String(row[col.role]).toUpperCase() === 'ADMIN';
          newRows.push([
            row[col.id] || '',
            row[col.nama] || '',
            '-',
            isAdm ? 'Kepala Administrator' : 'Staf Pelaksana',
            isAdm ? 'Sekretariat Utama' : 'Pelayanan Terpadu',
            '-',
            'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
            row[col.username] || '',
            row[col.password] || '',
            row[col.role] || 'STAF',
            row[col.sheetId] || '-',
            row[col.sheetUrl] || '-',
            row[col.lastActive] || 0,
            row[col.status] || 'OFFLINE',
            row[col.totalBaris] || 0
          ]);
        }
        sheetUsers.clear();
        sheetUsers.getRange(1, 1, newRows.length, newHeader.length).setValues(newRows);
        sheetUsers.getRange(1, 1, 1, newHeader.length).setFontWeight('bold').setBackground('#1e293b').setFontColor('#ffffff');
      }
    }
  }
  
  // 3. Buat / Cek Sheet DB_ARSIP
  let sheetArsip = ss.getSheetByName('DB_ARSIP');
  if (!sheetArsip) {
    sheetArsip = ss.insertSheet('DB_ARSIP');
    sheetArsip.appendRow([
      'ID_Arsip', 'Tahun_Arsip', 'ID_Staf', 'Nama_Staf', 'Nama_File_Arsip', 
      'URL_File_Arsip', 'URL_Folder_Tahun', 'Total_Baris_Ketikan', 'Waktu_Diarsipkan'
    ]);
    sheetArsip.getRange('A1:I1').setFontWeight('bold').setBackground('#0f766e').setFontColor('#ffffff');
  }
  
  return 'Setup Sistem Berhasil! Silakan Deploy sebagai Web App.';
}

/**
 * Helper: Hashing Password dengan Algoritma SHA-256 Standar
 */
function hashPassword(plainText) {
  if (!plainText) return '';
  const rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(plainText).trim(), Utilities.Charset.UTF_8);
  let hexStr = '';
  for (let i = 0; i < rawHash.length; i++) {
    let byteVal = rawHash[i];
    if (byteVal < 0) byteVal += 256;
    let byteHex = byteVal.toString(16);
    if (byteHex.length === 1) byteHex = '0' + byteHex;
    hexStr += byteHex;
  }
  return hexStr;
}

/**
 * Helper: Ambil Konfigurasi Folder ID
 */
function getConfigMap() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheetConfig = ss.getSheetByName('DB_CONFIG');
  if (!sheetConfig) {
    setupSystem();
    sheetConfig = ss.getSheetByName('DB_CONFIG');
  }
  const data = sheetConfig.getDataRange().getValues();
  const map = {};
  for (let i = 1; i < data.length; i++) {
    map[data[i][0]] = data[i][1];
  }
  return map;
}

/**
 * Helper: Pemetaan Kolom Fleksibel untuk DB_USERS (Dukungan Format Lama & Baru)
 */
function getUserColumnsMap(headerRow) {
  const map = {};
  for (let c = 0; c < headerRow.length; c++) {
    const raw = String(headerRow[c]).trim();
    map[raw] = c;
    map[raw.toLowerCase()] = c;
  }
  const hasNip = (map['nip'] !== undefined);
  return {
    id: map['id_staf'] !== undefined ? map['id_staf'] : (map['id'] !== undefined ? map['id'] : 0),
    nama: map['nama_lengkap'] !== undefined ? map['nama_lengkap'] : (map['nama'] !== undefined ? map['nama'] : 1),
    nip: hasNip ? map['nip'] : -1,
    jabatan: map['jabatan'] !== undefined ? map['jabatan'] : -1,
    unitKerja: map['unit_kerja'] !== undefined ? map['unit_kerja'] : -1,
    noWa: map['no_wa'] !== undefined ? map['no_wa'] : (map['nowa'] !== undefined ? map['nowa'] : -1),
    fotoUrl: map['foto_url'] !== undefined ? map['foto_url'] : -1,
    username: map['username'] !== undefined ? map['username'] : (hasNip ? 7 : 2),
    password: map['password'] !== undefined ? map['password'] : (hasNip ? 8 : 3),
    role: map['role'] !== undefined ? map['role'] : (hasNip ? 9 : 4),
    sheetId: map['sheet_id_aktif'] !== undefined ? map['sheet_id_aktif'] : (map['sheet_id'] !== undefined ? map['sheet_id'] : (hasNip ? 10 : 5)),
    sheetUrl: map['sheet_url_aktif'] !== undefined ? map['sheet_url_aktif'] : (map['sheet_url'] !== undefined ? map['sheet_url'] : (hasNip ? 11 : 6)),
    lastActive: map['last_active_ms'] !== undefined ? map['last_active_ms'] : (map['last_active'] !== undefined ? map['last_active'] : (hasNip ? 12 : 7)),
    status: map['status_manual'] !== undefined ? map['status_manual'] : (map['status'] !== undefined ? map['status'] : (hasNip ? 13 : 8)),
    totalBaris: map['total_baris'] !== undefined ? map['total_baris'] : (hasNip ? 14 : 9)
  };
}

/**
 * Helper: Upload Foto Staf ke Google Drive Folder "03_Foto_Profil_Staf"
 */
function uploadStaffPhoto(base64Data, fileName, photoFolderId) {
  if (!base64Data) return 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png';
  try {
    const cleanBase64 = String(base64Data).replace(/^data:image\/\w+;base64,/, '');
    const decoded = Utilities.base64Decode(cleanBase64);
    const blob = Utilities.newBlob(decoded, 'image/jpeg', fileName || ('foto_' + new Date().getTime() + '.jpg'));
    
    let targetFolder;
    if (photoFolderId) {
      targetFolder = DriveApp.getFolderById(photoFolderId);
    } else {
      const config = getConfigMap();
      targetFolder = config.PHOTO_FOLDER_ID ? DriveApp.getFolderById(config.PHOTO_FOLDER_ID) : DriveApp.getRootFolder();
    }
    const file = targetFolder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return 'https://lh3.googleusercontent.com/d/' + file.getId();
  } catch (err) {
    Logger.log('Gagal upload foto ke Drive: ' + err);
    return 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png';
  }
}

/**
 * Helper: Membuat Template Spreadsheet Kerja Baru untuk Staf
 */
function createWorkSpreadsheet(staffName, activeFolderId) {
  const dateStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd-MM-yyyy');
  const fileName = 'KERJA AKTIF - ' + staffName + ' (Mulai ' + dateStr + ')';
  const newSS = SpreadsheetApp.create(fileName);
  const fileId = newSS.getId();
  
  const sheet = newSS.getActiveSheet();
  sheet.setName('Lembar_Ketikan');
  sheet.appendRow(['NO', 'TANGGAL INPUT', 'KATEGORI / KODE', 'URAIAN DATA KETIKAN', 'KETERANGAN / STATUS']);
  sheet.getRange('A1:E1').setFontWeight('bold').setBackground('#2563eb').setFontColor('#ffffff');
  sheet.setColumnWidth(1, 50);
  sheet.setColumnWidth(2, 140);
  sheet.setColumnWidth(3, 160);
  sheet.setColumnWidth(4, 350);
  sheet.setColumnWidth(5, 180);
  
  const file = DriveApp.getFileById(fileId);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.EDIT);
  if (activeFolderId) {
    try {
      const targetFolder = DriveApp.getFolderById(activeFolderId);
      file.moveTo(targetFolder);
    } catch (e) {}
  }
  
  return { id: fileId, url: newSS.getUrl() };
}

/**
 * Helper Internal: Tambah Staf Baru
 */
function createStaffInternal(nama, nip, jabatan, unitKerja, noWa, fotoUrl, username, password, activeFolderId, sheetUsers) {
  const idStaf = 'STF-' + Math.floor(1000 + Math.random() * 9000);
  const workSheet = createWorkSpreadsheet(nama, activeFolderId);
  const defaultFoto = 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png';
  
  const header = sheetUsers.getRange(1, 1, 1, sheetUsers.getLastColumn()).getValues()[0];
  const col = getUserColumnsMap(header);

  if (col.nip !== -1) {
    // Format Baru (15 Kolom)
    sheetUsers.appendRow([
      idStaf, nama, nip || '-', jabatan || 'Staf Pelaksana', unitKerja || 'Pelayanan Terpadu', noWa || '-',
      fotoUrl || defaultFoto, username, hashPassword(password), 'STAF',
      workSheet.id, workSheet.url, 0, 'OFFLINE', 0
    ]);
  } else {
    // Format Lama (10 Kolom)
    sheetUsers.appendRow([
      idStaf, nama, username, hashPassword(password), 'STAF',
      workSheet.id, workSheet.url, 0, 'OFFLINE', 0
    ]);
  }
  return idStaf;
}

/**
 * 2. FUNGSI LOGIN (ADMIN & STAF)
 */
function loginUser(username, password) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('DB_USERS');
  if (!sheet) {
    setupSystem();
    sheet = ss.getSheetByName('DB_USERS');
  }
  const data = sheet.getDataRange().getValues();
  const col = getUserColumnsMap(data[0]);
  const nowMs = new Date().getTime();
  const trimmedUser = String(username).trim().toLowerCase();
  const trimmedPass = String(password).trim();
  const passHash = hashPassword(trimmedPass);
  
  for (let i = 1; i < data.length; i++) {
    const uName = String(data[i][col.username]).trim().toLowerCase();
    const uPass = String(data[i][col.password]).trim();
    if (uName === trimmedUser && (uPass === trimmedPass || uPass === passHash)) {
      // Auto-migration: Jika password tersimpan masih plaintext, perbarui ke hash SHA-256
      if (uPass !== passHash) {
        sheet.getRange(i + 1, col.password + 1).setValue(passHash);
      }
      sheet.getRange(i + 1, col.lastActive + 1).setValue(nowMs);
      sheet.getRange(i + 1, col.status + 1).setValue('ONLINE');
      
      return {
        success: true,
        user: {
          id: data[i][col.id],
          nama: data[i][col.nama],
          nip: col.nip !== -1 ? (data[i][col.nip] || '-') : '-',
          jabatan: col.jabatan !== -1 ? (data[i][col.jabatan] || 'Staf') : 'Staf',
          unitKerja: col.unitKerja !== -1 ? (data[i][col.unitKerja] || 'Kantor') : 'Kantor',
          noWa: col.noWa !== -1 ? (data[i][col.noWa] || '-') : '-',
          fotoUrl: col.fotoUrl !== -1 ? (data[i][col.fotoUrl] || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png') : 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
          username: data[i][col.username],
          role: data[i][col.role],
          sheetId: data[i][col.sheetId],
          sheetUrl: data[i][col.sheetUrl],
          totalBaris: data[i][col.totalBaris] || 0
        }
      };
    }
  }
  return { success: false, message: 'Username atau Password salah!' };
}

/**
 * 3. FUNGSI LOGOUT
 */
function logoutUser(username) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('DB_USERS');
  const data = sheet.getDataRange().getValues();
  const col = getUserColumnsMap(data[0]);
  const nowMs = new Date().getTime();
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][col.username]).toLowerCase() === String(username).toLowerCase()) {
      sheet.getRange(i + 1, col.lastActive + 1).setValue(nowMs);
      sheet.getRange(i + 1, col.status + 1).setValue('OFFLINE');
      break;
    }
  }
  return { success: true };
}

/**
 * 4. FUNGSI HEARTBEAT STAF
 */
function sendHeartbeat(username, countRowsNow) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('DB_USERS');
  const data = sheet.getDataRange().getValues();
  const col = getUserColumnsMap(data[0]);
  const nowMs = new Date().getTime();
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][col.username]).toLowerCase() === String(username).toLowerCase()) {
      const currentStatus = String(data[i][col.status]).trim().toUpperCase();
      
      // JIKA STATUS STAFF SUDAH OFFLINE (karena dipaksa offline oleh Admin atau sudah logout)
      // JANGAN ubah kembali ke ONLINE! Beritahu client staf agar segera logout otomatis!
      if (currentStatus === 'OFFLINE') {
        return { success: false, forcedOffline: true, message: 'Sesi kerja Anda telah dialihkan ke status Offline oleh Administrator.' };
      }

      sheet.getRange(i + 1, col.lastActive + 1).setValue(nowMs);
      sheet.getRange(i + 1, col.status + 1).setValue('ONLINE');
      
      let rowsCount = Number(data[i][col.totalBaris]) || 0;
      const sheetId = data[i][col.sheetId];
      
      if (countRowsNow && sheetId && sheetId !== '-') {
        try {
          const staffSS = SpreadsheetApp.openById(sheetId);
          const lastRow = staffSS.getSheets()[0].getLastRow();
          rowsCount = Math.max(0, lastRow - 1);
          sheet.getRange(i + 1, col.totalBaris + 1).setValue(rowsCount);
        } catch (err) {}
      }
      return { success: true, totalBaris: rowsCount, timestamp: nowMs };
    }
  }
  return { success: false };
}

/**
 * 5. FUNGSI DASHBOARD ADMIN
 */
function getAdminDashboardData(forceRefreshRowCounts) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetUsers = ss.getSheetByName('DB_USERS');
  const sheetArsip = ss.getSheetByName('DB_ARSIP');
  const config = getConfigMap();
  
  const usersData = sheetUsers.getDataRange().getValues();
  const arsipData = sheetArsip.getDataRange().getValues();
  const col = getUserColumnsMap(usersData[0]);
  const nowMs = new Date().getTime();
  const ONLINE_TIMEOUT_MS = 2 * 60 * 1000;
  
  const staffList = [];
  let onlineCount = 0;
  let offlineCount = 0;
  let totalKetikanAktif = 0;
  
  for (let i = 1; i < usersData.length; i++) {
    const role = String(usersData[i][col.role]).toUpperCase();
    if (role !== 'STAF') continue;
    
    const idStaf = usersData[i][col.id];
    const nama = usersData[i][col.nama];
    const nip = col.nip !== -1 ? (usersData[i][col.nip] || '-') : '-';
    const jabatan = col.jabatan !== -1 ? (usersData[i][col.jabatan] || 'Staf') : 'Staf';
    const unitKerja = col.unitKerja !== -1 ? (usersData[i][col.unitKerja] || 'Kantor') : 'Kantor';
    const noWa = col.noWa !== -1 ? (usersData[i][col.noWa] || '-') : '-';
    const fotoUrl = col.fotoUrl !== -1 ? (usersData[i][col.fotoUrl] || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png') : 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png';
    const username = usersData[i][col.username];
    const sheetId = usersData[i][col.sheetId];
    const sheetUrl = usersData[i][col.sheetUrl];
    const lastActiveMs = Number(usersData[i][col.lastActive]) || 0;
    const statusManual = String(usersData[i][col.status]);
    let totalBaris = Number(usersData[i][col.totalBaris]) || 0;
    
    if (forceRefreshRowCounts && sheetId && sheetId !== '-') {
      try {
        const staffSS = SpreadsheetApp.openById(sheetId);
        totalBaris = Math.max(0, staffSS.getSheets()[0].getLastRow() - 1);
        sheetUsers.getRange(i + 1, col.totalBaris + 1).setValue(totalBaris);
      } catch (e) {}
    }
    
    const diffMs = nowMs - lastActiveMs;
    const isOnline = (statusManual === 'ONLINE') && (lastActiveMs > 0) && (diffMs <= ONLINE_TIMEOUT_MS);
    
    let lastSeenText = 'Belum pernah login';
    if (isOnline) {
      lastSeenText = 'Sedang aktif sekarang';
    } else if (lastActiveMs > 0) {
      const diffMinutes = Math.floor(diffMs / 60000);
      if (diffMinutes < 1) lastSeenText = 'Baru saja offline';
      else if (diffMinutes < 60) lastSeenText = diffMinutes + ' menit yang lalu';
      else {
        const diffHours = Math.floor(diffMinutes / 60);
        if (diffHours < 24) lastSeenText = diffHours + ' jam yang lalu';
        else lastSeenText = Utilities.formatDate(new Date(lastActiveMs), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');
      }
    }
    
    if (isOnline) onlineCount++;
    else offlineCount++;
    
    totalKetikanAktif += totalBaris;
    
    staffList.push({
      id: idStaf,
      nama: nama,
      nip: nip,
      jabatan: jabatan,
      unitKerja: unitKerja,
      noWa: noWa,
      fotoUrl: fotoUrl,
      username: username,
      sheetId: sheetId,
      sheetUrl: sheetUrl,
      isOnline: isOnline,
      lastSeenText: lastSeenText,
      totalBaris: totalBaris
    });
  }
  
  const archiveList = [];
  const archiveByYear = {};
  
  for (let j = arsipData.length - 1; j >= 1; j--) {
    const tahun = String(arsipData[j][1]);
    const jmlBaris = Number(arsipData[j][7]) || 0;
    
    if (!archiveByYear[tahun]) {
      archiveByYear[tahun] = { files: 0, rows: 0 };
    }
    archiveByYear[tahun].files += 1;
    archiveByYear[tahun].rows += jmlBaris;
    
    archiveList.push({
      idArsip: arsipData[j][0],
      tahun: tahun,
      idStaf: arsipData[j][2],
      namaStaf: arsipData[j][3],
      namaFile: arsipData[j][4],
      urlFile: arsipData[j][5],
      urlFolderTahun: arsipData[j][6],
      totalBaris: jmlBaris,
      waktuArsip: arsipData[j][8] instanceof Date
        ? Utilities.formatDate(arsipData[j][8], Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm')
        : String(arsipData[j][8])
    });
  }
  
  const driveYearFolders = [];
  let archiveRootUrl = '#';
  if (config.ARCHIVE_ROOT_ID) {
    try {
      const archRoot = DriveApp.getFolderById(config.ARCHIVE_ROOT_ID);
      archiveRootUrl = archRoot.getUrl();
      const subFolders = archRoot.getFolders();
      while (subFolders.hasNext()) {
        const sf = subFolders.next();
        driveYearFolders.push({ yearName: sf.getName(), url: sf.getUrl() });
      }
      driveYearFolders.sort((a, b) => a.yearName.localeCompare(b.yearName));
    } catch (e) {}
  }
  
  return {
    summary: {
      totalStaf: staffList.length,
      onlineCount: onlineCount,
      offlineCount: offlineCount,
      totalKetikanAktif: totalKetikanAktif,
      totalFileArsip: archiveList.length,
      archiveRootUrl: archiveRootUrl
    },
    staffList: staffList,
    archiveList: archiveList,
    archiveByYear: archiveByYear,
    driveYearFolders: driveYearFolders
  };
}

/**
 * 6. FUNGSI TAMBAH STAF BARU (LENGKAP DENGAN NIP, JABATAN, UNIT KERJA, NO WA & FOTO)
 */
function registerNewStaff(nama, nip, jabatan, unitKerja, noWa, fotoBase64, username, password) {
  if (!nama || !username || !password) {
    return { success: false, message: 'Nama, Username, dan Password wajib diisi!' };
  }
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetUsers = ss.getSheetByName('DB_USERS');
  const data = sheetUsers.getDataRange().getValues();
  const col = getUserColumnsMap(data[0]);
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][col.username]).trim().toLowerCase() === String(username).trim().toLowerCase()) {
      return { success: false, message: 'Username sudah digunakan staf lain!' };
    }
  }
  
  const config = getConfigMap();
  let photoUrl = '';
  if (fotoBase64 && String(fotoBase64).startsWith('data:image')) {
    const cleanNip = (nip || 'staf').replace(/[^a-zA-Z0-9]/g, '');
    const fileName = '[FOTO] ' + nama.replace(/[^a-zA-Z0-9]/g, '_') + '_' + cleanNip + '.jpg';
    photoUrl = uploadStaffPhoto(fotoBase64, fileName, config.PHOTO_FOLDER_ID);
  } else {
    photoUrl = 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png';
  }
  
  createStaffInternal(nama, nip, jabatan, unitKerja, noWa, photoUrl, username, password, config.ACTIVE_FOLDER_ID, sheetUsers);
  
  return {
    success: true,
    message: 'Staf ' + nama + ' berhasil ditambahkan, foto tersimpan di Google Drive, dan dibuatkan Google Sheet kerja!'
  };
}

/**
 * 7. FUNGSI AMBIL SEL SMART GRID A1-E25
 */
function getStaffGridCells(username) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetUsers = ss.getSheetByName('DB_USERS');
  const data = sheetUsers.getDataRange().getValues();
  const col = getUserColumnsMap(data[0]);

  let sheetId = null;
  let totalBaris = 0;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][col.username]).toLowerCase() === String(username).toLowerCase()) {
      sheetId = data[i][col.sheetId];
      totalBaris = Number(data[i][col.totalBaris]) || 0;
      break;
    }
  }

  const matrix = [];
  matrix.push(['NO', 'TANGGAL INPUT', 'KATEGORI / KODE', 'URAIAN DATA KETIKAN', 'KETERANGAN / STATUS']);
  for (let r = 1; r < 35; r++) matrix.push(['', '', '', '', '']);

  if (sheetId && sheetId !== '-') {
    try {
      const staffSS = SpreadsheetApp.openById(sheetId);
      const ws = staffSS.getSheets()[0];
      const maxRows = Math.min(100, Math.max(35, ws.getLastRow()));
      const vals = ws.getRange(1, 1, maxRows, 5).getValues();
      matrix.length = 0;
      for (let r = 0; r < maxRows; r++) {
        matrix.push([
          vals[r] && vals[r][0] !== undefined && vals[r][0] !== null ? String(vals[r][0]) : '',
          vals[r] && vals[r][1] !== undefined && vals[r][1] !== null ? String(vals[r][1]) : '',
          vals[r] && vals[r][2] !== undefined && vals[r][2] !== null ? String(vals[r][2]) : '',
          vals[r] && vals[r][3] !== undefined && vals[r][3] !== null ? String(vals[r][3]) : '',
          vals[r] && vals[r][4] !== undefined && vals[r][4] !== null ? String(vals[r][4]) : ''
        ]);
      }
      totalBaris = Math.max(0, ws.getLastRow() - 1);
    } catch (e) {}
  }

  return { success: true, matrix: matrix, totalBaris: totalBaris };
}

/**
 * 8. FUNGSI UPDATE SEL TERTENTU (A1 NOTATION)
 */
function updateStaffCellByA1(username, coord, val) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetUsers = ss.getSheetByName('DB_USERS');
  const data = sheetUsers.getDataRange().getValues();
  const col = getUserColumnsMap(data[0]);

  let sheetId = null;
  let userRowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][col.username]).toLowerCase() === String(username).toLowerCase()) {
      sheetId = data[i][col.sheetId];
      userRowIndex = i + 1;
      break;
    }
  }

  if (sheetId && sheetId !== '-') {
    try {
      const staffSS = SpreadsheetApp.openById(sheetId);
      const ws = staffSS.getSheets()[0];
      ws.getRange(coord).setValue(val);
      const totalBaris = Math.max(0, ws.getLastRow() - 1);
      sheetUsers.getRange(userRowIndex, col.totalBaris + 1).setValue(totalBaris);
      sheetUsers.getRange(userRowIndex, col.lastActive + 1).setValue(new Date().getTime());
      sheetUsers.getRange(userRowIndex, col.status + 1).setValue('ONLINE');
      return { success: true, totalBaris: totalBaris };
    } catch (e) {
      return { success: false, message: e.toString() };
    }
  }
  return { success: false, message: 'Sheet staf tidak ditemukan' };
}

/**
 * 9. FUNGSI ARSIPKAN FILE STAF KE FOLDER TAHUN
 */
function archiveStaffWorkFile(targetStaffId, tahunArsip, catatanPeriode) {
  if (!tahunArsip) {
    return { success: false, message: 'Tahun arsip wajib diisi!' };
  }
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetUsers = ss.getSheetByName('DB_USERS');
  const sheetArsip = ss.getSheetByName('DB_ARSIP');
  const config = getConfigMap();
  
  if (!config.ARCHIVE_ROOT_ID) {
    return { success: false, message: 'Folder Induk Arsip belum terkonfigurasi.' };
  }
  
  const archiveRootFolder = DriveApp.getFolderById(config.ARCHIVE_ROOT_ID);
  const yearClean = String(tahunArsip).trim();
  const existingFolders = archiveRootFolder.getFoldersByName(yearClean);
  let yearFolder;
  let isNewFolderCreated = false;
  
  if (existingFolders.hasNext()) {
    yearFolder = existingFolders.next();
  } else {
    yearFolder = archiveRootFolder.createFolder(yearClean);
    isNewFolderCreated = true;
  }
  const yearFolderUrl = yearFolder.getUrl();
  
  const usersData = sheetUsers.getDataRange().getValues();
  const col = getUserColumnsMap(usersData[0]);
  let archivedCount = 0;
  const dateStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd-MM-yyyy HH:mm');
  const labelPeriode = catatanPeriode ? (' - ' + catatanPeriode) : '';
  
  for (let i = 1; i < usersData.length; i++) {
    const role = String(usersData[i][col.role]).toUpperCase();
    const idStaf = String(usersData[i][col.id]);
    
    if (role === 'STAF' && (targetStaffId === 'ALL' || idStaf === targetStaffId)) {
      const namaStaf = usersData[i][col.nama];
      const oldSheetId = usersData[i][col.sheetId];
      
      if (oldSheetId && oldSheetId !== '-') {
        try {
          const oldSS = SpreadsheetApp.openById(oldSheetId);
          const totalBaris = Math.max(0, oldSS.getSheets()[0].getLastRow() - 1);
          
          const archiveFileName = '[ARSIP ' + yearClean + '] ' + namaStaf + labelPeriode + ' (' + dateStr + ')';
          const driveFile = DriveApp.getFileById(oldSheetId);
          driveFile.setName(archiveFileName);
          driveFile.moveTo(yearFolder);
          driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          
          const idArsip = 'ARS-' + yearClean + '-' + Math.floor(10000 + Math.random() * 90000);
          sheetArsip.appendRow([
            idArsip, yearClean, idStaf, namaStaf, archiveFileName,
            driveFile.getUrl(), yearFolderUrl, totalBaris, dateStr
          ]);
          
          const newWork = createWorkSpreadsheet(namaStaf, config.ACTIVE_FOLDER_ID);
          sheetUsers.getRange(i + 1, col.sheetId + 1).setValue(newWork.id);
          sheetUsers.getRange(i + 1, col.sheetUrl + 1).setValue(newWork.url);
          sheetUsers.getRange(i + 1, col.totalBaris + 1).setValue(0);
          
          archivedCount++;
        } catch (err) {
          Logger.log('Gagal arsip staf ' + namaStaf + ': ' + err);
        }
      }
    }
  }
  
  return {
    success: true,
    message: archivedCount + ' file kerja staf berhasil diarsipkan ke Folder Drive Tahun ' + yearClean + '!'
  };
}

/**
 * 10. FITUR BRANDING
 */
function convertDriveUrlToDirectImage(url) {
  if (!url) return '';
  const cleanUrl = String(url).trim();
  const matchFile = cleanUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
                 || cleanUrl.match(/\/d\/([a-zA-Z0-9_-]+)/)
                 || cleanUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  let fileId = '';
  if (matchFile && matchFile[1]) fileId = matchFile[1];
  
  if (fileId) {
    try {
      const file = DriveApp.getFileById(fileId);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (e) {}
    return 'https://lh3.googleusercontent.com/d/' + fileId;
  }
  return cleanUrl;
}

function getOfficeBranding() {
  const config = getConfigMap();
  return {
    officeName: config.OFFICE_NAME || 'PORTAL KERJA & MONITORING DIGITAL',
    officeTagline: config.OFFICE_TAGLINE || 'Sistem Manajemen Dokumen, Asisten Dikte Suara & Arsip Terpadu Kabupaten Banyuasin',
    logoUrl: config.OFFICE_LOGO_URL || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
    bgUrl: config.OFFICE_BG_URL || 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1600&q=80'
  };
}

function saveOfficeBranding(officeName, officeTagline, rawLogoUrl, rawBgUrl, logoBase64, bgBase64) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheetConfig = ss.getSheetByName('DB_CONFIG');
  if (!sheetConfig) {
    setupSystem();
    sheetConfig = ss.getSheetByName('DB_CONFIG');
  }
  
  const config = getConfigMap();
  const current = getOfficeBranding();
  let finalLogo = '';
  let finalBg = '';

  // 1. Simpan Logo: Jika upload file base64, simpan ke Drive. Jika URL, convert.
  if (logoBase64 && String(logoBase64).startsWith('data:image')) {
    finalLogo = uploadStaffPhoto(logoBase64, '[LOGO] Logo_Kantor_' + new Date().getTime() + '.png', config.PHOTO_FOLDER_ID);
  } else if (rawLogoUrl && String(rawLogoUrl).trim()) {
    finalLogo = convertDriveUrlToDirectImage(rawLogoUrl);
  } else {
    finalLogo = current.logoUrl;
  }

  // 2. Simpan Background: Jika upload file base64, simpan ke Drive. Jika URL, convert.
  if (bgBase64 && String(bgBase64).startsWith('data:image')) {
    finalBg = uploadStaffPhoto(bgBase64, '[BG] Background_Kantor_' + new Date().getTime() + '.jpg', config.PHOTO_FOLDER_ID);
  } else if (rawBgUrl && String(rawBgUrl).trim()) {
    finalBg = convertDriveUrlToDirectImage(rawBgUrl);
  } else {
    finalBg = current.bgUrl;
  }

  const updates = {
    'OFFICE_NAME': officeName || current.officeName || 'PORTAL KERJA & MONITORING DIGITAL',
    'OFFICE_TAGLINE': officeTagline || current.officeTagline || 'Sistem Manajemen Dokumen, Asisten Dikte Suara & Arsip Terpadu',
    'OFFICE_LOGO_URL': finalLogo,
    'OFFICE_BG_URL': finalBg
  };

  const data = sheetConfig.getDataRange().getValues();
  const keysToSave = Object.keys(updates);

  for (let k = 0; k < keysToSave.length; k++) {
    const keyName = keysToSave[k];
    const keyVal = updates[keyName];
    let found = false;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === keyName) {
        sheetConfig.getRange(i + 1, 2).setValue(keyVal);
        found = true;
        break;
      }
    }
    if (!found) sheetConfig.appendRow([keyName, keyVal]);
  }

  return {
    success: true,
    message: 'Branding Halaman Login & Logo Kantor berhasil diperbarui!',
    branding: getOfficeBranding()
  };
}

/**
 * 9. FUNGSI EDIT / PERBARUI DATA STAF (NIP, JABATAN, UNIT KERJA, NO WA, FOTO, PASSWORD)
 */
function updateStaffData(idStaf, nama, nip, jabatan, unitKerja, noWa, fotoBase64, rawFotoUrl, newPassword, forceOffline) {
  if (!idStaf) {
    return { success: false, message: 'ID Staf tidak ditemukan!' };
  }
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetUsers = ss.getSheetByName('DB_USERS');
  const data = sheetUsers.getDataRange().getValues();
  const col = getUserColumnsMap(data[0]);
  const config = getConfigMap();

  let targetRow = -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][col.id]).trim() === String(idStaf).trim()) {
      targetRow = i + 1;
      break;
    }
  }

  if (targetRow === -1) {
    return { success: false, message: 'Data staf dengan ID ' + idStaf + ' tidak ditemukan di database!' };
  }

  // Update Nama
  if (nama) {
    sheetUsers.getRange(targetRow, col.nama + 1).setValue(nama);
  }
  // Update NIP
  if (col.nip !== -1 && nip !== undefined) {
    sheetUsers.getRange(targetRow, col.nip + 1).setValue(nip || '-');
  }
  // Update Jabatan
  if (col.jabatan !== -1 && jabatan !== undefined) {
    sheetUsers.getRange(targetRow, col.jabatan + 1).setValue(jabatan || 'Staf Pelaksana');
  }
  // Update Unit Kerja
  if (col.unitKerja !== -1 && unitKerja !== undefined) {
    sheetUsers.getRange(targetRow, col.unitKerja + 1).setValue(unitKerja || 'Pelayanan Terpadu');
  }
  // Update No WA
  if (col.noWa !== -1 && noWa !== undefined) {
    sheetUsers.getRange(targetRow, col.noWa + 1).setValue(noWa || '-');
  }
  // Update Foto jika ada perubahan
  if (col.fotoUrl !== -1) {
    if (fotoBase64 && String(fotoBase64).startsWith('data:image')) {
      const cleanNip = (nip || 'staf').replace(/[^a-zA-Z0-9]/g, '');
      const fileName = '[FOTO] ' + (nama || 'staf').replace(/[^a-zA-Z0-9]/g, '_') + '_' + cleanNip + '_' + new Date().getTime() + '.jpg';
      const uploadedUrl = uploadStaffPhoto(fotoBase64, fileName, config.PHOTO_FOLDER_ID);
      sheetUsers.getRange(targetRow, col.fotoUrl + 1).setValue(uploadedUrl);
    } else if (rawFotoUrl && String(rawFotoUrl).trim()) {
      const convertedUrl = convertDriveUrlToDirectImage(rawFotoUrl);
      sheetUsers.getRange(targetRow, col.fotoUrl + 1).setValue(convertedUrl);
    }
  }
  // Update Password jika diisi
  if (newPassword && String(newPassword).trim() !== '') {
    sheetUsers.getRange(targetRow, col.password + 1).setValue(hashPassword(newPassword));
  }
  // Paksa Offline jika diminta
  const isForceOffline = (forceOffline === true || String(forceOffline).toLowerCase() === 'true' || forceOffline === 1 || forceOffline === '1');
  if (isForceOffline) {
    sheetUsers.getRange(targetRow, col.status + 1).setValue('OFFLINE');
    sheetUsers.getRange(targetRow, col.lastActive + 1).setValue(0);
  }

  return {
    success: true,
    message: 'Data staf ' + (nama || '') + ' berhasil diperbarui!' + (isForceOffline ? ' Status staf berhasil dipaksa Offline.' : '')
  };
}

/**
 * 10. FUNGSI PAKSA SEMUA STAF JADI OFFLINE SEKALIGUS (ADMIN UTAMA)
 */
function forceAllStaffOffline() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetUsers = ss.getSheetByName('DB_USERS');
  const data = sheetUsers.getDataRange().getValues();
  const col = getUserColumnsMap(data[0]);
  let count = 0;

  for (let i = 1; i < data.length; i++) {
    const role = String(data[i][col.role]).trim().toUpperCase();
    if (role === 'STAF') {
      sheetUsers.getRange(i + 1, col.status + 1).setValue('OFFLINE');
      sheetUsers.getRange(i + 1, col.lastActive + 1).setValue(0);
      count++;
    }
  }

  return {
    success: true,
    message: count + ' akun staf pegawai berhasil dialihkan ke status Offline!',
    count: count
  };
}

/**
 * 11. FUNGSI HAPUS STAF DARI DATABASE
 */
function deleteStaff(idStaf) {
  if (!idStaf) return { success: false, message: 'ID Staf tidak valid' };
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetUsers = ss.getSheetByName('DB_USERS');
  const data = sheetUsers.getDataRange().getValues();
  const col = getUserColumnsMap(data[0]);

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][col.id]).trim() === String(idStaf).trim()) {
      const staffName = data[i][col.nama];
      sheetUsers.deleteRow(i + 1);
      return { success: true, message: 'Staf ' + staffName + ' berhasil dihapus dari sistem.' };
    }
  }
  return { success: false, message: 'Staf tidak ditemukan.' };
}