const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'data', 'database.json');
const ORIGINAL_INDEX_PATH = fs.existsSync(path.join(__dirname, 'index.html'))
  ? path.join(__dirname, 'index.html')
  : path.join(__dirname, 'Index.html');
const CONFIG_PATH = path.join(__dirname, 'config.json');

// Security Headers Middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Helper Hashing Password (SHA-256)
function hashPassword(plainText) {
  if (!plainText) return '';
  return crypto.createHash('sha256').update(String(plainText).trim()).digest('hex');
}

// Membaca Konfigurasi Google Apps Script
function readConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    }
  } catch (e) {}
  return {
    gasWebAppUrl: 'https://script.google.com/macros/s/AKfycbzXVA-mCJFlZecMADLziVjjqk4WnMwIn0MpOCXSco_dA4QrTMfSiRRCsqLD-Oi3ElW2GQ/exec',
    syncMode: 'live'
  };
}

// Forward langsung ke Google Apps Script Web App (Live Data Google Sheets & Drive)
async function forwardToGoogleAppsScript(functionName, args) {
  const config = readConfig();
  const webAppUrl = process.env.GAS_WEBAPP_URL || config.gasWebAppUrl;
  if (!webAppUrl) {
    throw new Error('GAS Web App URL belum dikonfigurasi di config.json');
  }

  const response = await fetch(webAppUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      functionName: functionName,
      args: args || []
    }),
    redirect: 'follow'
  });

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (err) {
    throw new Error('Respons Google Apps Script sementara tidak berupa JSON: ' + text.slice(0, 100));
  }

  if (data.status === 'error') {
    throw new Error(data.message || 'Error dari Google Apps Script');
  }

  return data.result !== undefined ? data.result : data;
}

// Serve static assets from public/ (tanpa index default agar GET / melayani Index.html asli)
app.use(express.static(path.join(__dirname, 'public'), { index: false }));

// Serve PWA assets (manifest, Service Worker, and icons)
app.get('/manifest.webmanifest', (req, res) => {
  res.sendFile(path.join(__dirname, 'manifest.webmanifest'));
});
app.get('/sw.js', (req, res) => {
  res.setHeader('Service-Worker-Allowed', '/');
  res.sendFile(path.join(__dirname, 'sw.js'));
});
app.use('/icons', express.static(path.join(__dirname, 'icons')));

// Database Helpers
function readDB() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      return { branding: {}, users: [], gridMatrices: {}, archives: [], driveYearFolders: [] };
    }
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error readDB:', err);
    return { branding: {}, users: [], gridMatrices: {}, archives: [], driveYearFolders: [] };
  }
}

function writeDB(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error writeDB:', err);
    return false;
  }
}

// Convert Google Drive share link to direct image URL
function convertDriveUrlToDirectImage(url) {
  if (!url) return '';
  const cleanUrl = String(url).trim();
  const matchFile = cleanUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  const matchIdParam = cleanUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  let fileId = '';
  if (matchFile && matchFile[1]) fileId = matchFile[1];
  else if (matchIdParam && matchIdParam[1]) fileId = matchIdParam[1];
  if (fileId) {
    return 'https://lh3.googleusercontent.com/d/' + fileId;
  }
  return cleanUrl;
}

// ---------------- IMPLEMENTASI FUNGSI-FUNGSI CODE.GS ----------------

function getOfficeBranding() {
  const db = readDB();
  return db.branding || {
    officeName: 'PORTAL KERJA & MONITORING DIGITAL',
    officeTagline: 'Sistem Manajemen Dokumen, Asisten Dikte Suara & Arsip Terpadu Kabupaten Banyuasin',
    logoUrl: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
    bgUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1600&q=80'
  };
}

function saveOfficeBranding(officeName, officeTagline, rawLogoUrl, rawBgUrl, logoBase64, bgBase64) {
  const db = readDB();
  db.branding = db.branding || {};
  db.branding.officeName = officeName || 'PORTAL KERJA & MONITORING DIGITAL';
  db.branding.officeTagline = officeTagline || 'Sistem Manajemen Dokumen, Asisten Dikte Suara & Arsip Terpadu';
  if (logoBase64 && String(logoBase64).startsWith('data:image')) {
    db.branding.logoUrl = logoBase64;
  } else if (rawLogoUrl) {
    db.branding.logoUrl = convertDriveUrlToDirectImage(rawLogoUrl);
  }
  if (bgBase64 && String(bgBase64).startsWith('data:image')) {
    db.branding.bgUrl = bgBase64;
  } else if (rawBgUrl) {
    db.branding.bgUrl = convertDriveUrlToDirectImage(rawBgUrl);
  }
  writeDB(db);
  return {
    success: true,
    message: 'Branding Halaman Login & Logo Kantor berhasil diperbarui!',
    branding: db.branding
  };
}

function loginUser(username, password) {
  const db = readDB();
  const trimmedUser = String(username).trim().toLowerCase();
  const trimmedPass = String(password).trim();
  const passHash = hashPassword(trimmedPass);

  const user = (db.users || []).find(
    u => u.username.toLowerCase() === trimmedUser &&
         (String(u.password).trim() === trimmedPass || String(u.password).trim() === passHash)
  );

  if (!user) {
    return { success: false, message: 'Username atau Password salah!' };
  }

  // Auto-migration: Migrasikan password plaintext ke SHA-256 hash secara otomatis
  if (user.password !== passHash) {
    user.password = passHash;
  }

  user.lastActiveMs = Date.now();
  user.statusManual = 'ONLINE';
  writeDB(db);

  return {
    success: true,
    user: {
      id: user.id,
      nama: user.nama,
      nip: user.nip || '-',
      jabatan: user.jabatan || 'Staf',
      unitKerja: user.unitKerja || 'Unit Kerja',
      noWa: user.noWa || '-',
      fotoUrl: user.fotoUrl || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
      username: user.username,
      role: user.role,
      sheetId: user.sheetId || '-',
      sheetUrl: user.sheetUrl || `/sheet/${user.id}`,
      totalBaris: user.totalBaris || 0
    }
  };
}

function logoutUser(username) {
  const db = readDB();
  const user = (db.users || []).find(u => u.username.toLowerCase() === String(username).trim().toLowerCase());
  if (user) {
    user.lastActiveMs = Date.now();
    user.statusManual = 'OFFLINE';
    writeDB(db);
  }
  return { success: true };
}

function sendHeartbeat(username, countRowsNow) {
  const db = readDB();
  const user = (db.users || []).find(u => u.username.toLowerCase() === String(username).trim().toLowerCase());
  if (!user) return { success: false };

  // Jika status manual staf sudah OFFLINE (karena dipaksa offline oleh Admin atau sudah logout)
  // JANGAN ubah kembali ke ONLINE! Beritahu client staf agar segera logout!
  if (String(user.statusManual).trim().toUpperCase() === 'OFFLINE') {
    return { success: false, forcedOffline: true, message: 'Sesi kerja Anda telah dialihkan ke status Offline oleh Administrator.' };
  }

  const nowMs = Date.now();
  user.lastActiveMs = nowMs;
  user.statusManual = 'ONLINE';

  if (countRowsNow && db.gridMatrices && db.gridMatrices[user.username]) {
    // Count filled rows excluding row 1 (header)
    const m = db.gridMatrices[user.username];
    let filled = 0;
    for (let r = 1; r < m.length; r++) {
      if (m[r] && m[r].some(cell => String(cell).trim() !== '')) {
        filled++;
      }
    }
    user.totalBaris = filled;
  }

  writeDB(db);
  return { success: true, totalBaris: user.totalBaris || 0, timestamp: nowMs };
}

function getAdminDashboardData(forceRefreshRowCounts) {
  const db = readDB();
  const nowMs = Date.now();
  const ONLINE_TIMEOUT_MS = 2 * 60 * 1000;

  const staffList = [];
  let onlineCount = 0;
  let offlineCount = 0;
  let totalKetikanAktif = 0;

  (db.users || []).forEach(u => {
    if (String(u.role).toUpperCase() !== 'STAF') return;

    const diffMs = nowMs - (u.lastActiveMs || 0);
    const isOnline = (u.statusManual === 'ONLINE') && (u.lastActiveMs > 0) && (diffMs <= ONLINE_TIMEOUT_MS);

    let lastSeenText = 'Belum pernah login';
    if (isOnline) {
      lastSeenText = 'Sedang aktif sekarang';
    } else if (u.lastActiveMs > 0) {
      const diffMinutes = Math.floor(diffMs / 60000);
      if (diffMinutes < 1) lastSeenText = 'Baru saja offline';
      else if (diffMinutes < 60) lastSeenText = diffMinutes + ' menit yang lalu';
      else {
        const diffHours = Math.floor(diffMinutes / 60);
        if (diffHours < 24) lastSeenText = diffHours + ' jam yang lalu';
        else lastSeenText = new Date(u.lastActiveMs).toLocaleString('id-ID');
      }
    }

    if (isOnline) onlineCount++;
    else offlineCount++;

    const totalBaris = Number(u.totalBaris) || 0;
    totalKetikanAktif += totalBaris;

    staffList.push({
      id: u.id,
      nama: u.nama,
      nip: u.nip || '-',
      jabatan: u.jabatan || 'Staf',
      unitKerja: u.unitKerja || 'Unit Kerja',
      noWa: u.noWa || '-',
      fotoUrl: u.fotoUrl || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
      username: u.username,
      sheetId: u.sheetId,
      sheetUrl: u.sheetUrl || `/sheet/${u.id}`,
      isOnline: isOnline,
      lastSeenText: lastSeenText,
      totalBaris: totalBaris
    });
  });

  // Rekapitulasi Grafik Arsip Per Tahun
  const archiveByYear = {};
  (db.archives || []).forEach(item => {
    const tahun = String(item.tahun);
    const jmlBaris = Number(item.totalBaris) || 0;
    if (!archiveByYear[tahun]) {
      archiveByYear[tahun] = { files: 0, rows: 0 };
    }
    archiveByYear[tahun].files += 1;
    archiveByYear[tahun].rows += jmlBaris;
  });

  return {
    summary: {
      totalStaf: staffList.length,
      onlineCount: onlineCount,
      offlineCount: offlineCount,
      totalKetikanAktif: totalKetikanAktif,
      totalFileArsip: (db.archives || []).length,
      archiveRootUrl: 'https://drive.google.com'
    },
    staffList: staffList,
    archiveList: db.archives || [],
    archiveByYear: archiveByYear,
    driveYearFolders: db.driveYearFolders || []
  };
}

function registerNewStaff(nama, nip, jabatan, unitKerja, noWa, fotoBase64, username, password) {
  if (!nama || !username || !password) {
    return { success: false, message: 'Semua kolom wajib diisi!' };
  }
  const db = readDB();
  const exists = (db.users || []).some(u => u.username.toLowerCase() === String(username).trim().toLowerCase());
  if (exists) {
    return { success: false, message: 'Username sudah digunakan staf lain!' };
  }

  const idStaf = 'STF-' + Math.floor(1000 + Math.random() * 9000);
  const uName = String(username).trim();

  // Create empty 25x5 grid
  const matrix = [];
  matrix.push(['NO', 'TANGGAL INPUT', 'KATEGORI / KODE', 'URAIAN DATA KETIKAN', 'KETERANGAN / STATUS']);
  for (let r = 1; r < 25; r++) {
    matrix.push(['', '', '', '', '']);
  }

  db.gridMatrices = db.gridMatrices || {};
  db.gridMatrices[uName] = matrix;

  const photoUrl = fotoBase64 ? fotoBase64 : 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png';

  db.users.push({
    id: idStaf,
    nama: String(nama).trim(),
    nip: String(nip || '-').trim(),
    jabatan: String(jabatan || 'Staf Operasional').trim(),
    unitKerja: String(unitKerja || 'Pelayanan Terpadu').trim(),
    noWa: String(noWa || '-').trim(),
    fotoUrl: photoUrl,
    username: uName,
    password: hashPassword(password),
    role: 'STAF',
    sheetId: 'SHEET-' + idStaf,
    sheetUrl: `/sheet/${idStaf}`,
    lastActiveMs: 0,
    statusManual: 'OFFLINE',
    totalBaris: 0
  });

  writeDB(db);

  return {
    success: true,
    message: 'Staf ' + nama + ' berhasil ditambahkan & dibuatkan Google Sheet kerja baru!'
  };
}

function updateStaffData(idStaf, nama, nip, jabatan, unitKerja, noWa, fotoBase64, rawFotoUrl, newPassword, forceOffline) {
  const db = readDB();
  const user = (db.users || []).find(u => String(u.id).trim() === String(idStaf).trim());
  if (!user) {
    return { success: false, message: 'Data staf tidak ditemukan!' };
  }
  if (nama) user.nama = nama;
  if (nip !== undefined) user.nip = nip || '-';
  if (jabatan !== undefined) user.jabatan = jabatan || 'Staf Pelaksana';
  if (unitKerja !== undefined) user.unitKerja = unitKerja || 'Pelayanan Terpadu';
  if (noWa !== undefined) user.noWa = noWa || '-';
  if (fotoBase64 && String(fotoBase64).startsWith('data:image')) {
    user.fotoUrl = fotoBase64;
  } else if (rawFotoUrl && String(rawFotoUrl).trim()) {
    user.fotoUrl = convertDriveUrlToDirectImage(rawFotoUrl);
  }
  if (newPassword && String(newPassword).trim() !== '') {
    user.password = hashPassword(newPassword);
  }
  const isForceOffline = (forceOffline === true || String(forceOffline).toLowerCase() === 'true' || forceOffline === 1 || forceOffline === '1');
  if (isForceOffline) {
    user.statusManual = 'OFFLINE';
    user.lastActiveMs = 0;
  }
  writeDB(db);
  return { success: true, message: 'Data staf ' + (nama || '') + ' berhasil diperbarui!' + (isForceOffline ? ' Status staf berhasil dipaksa Offline.' : '') };
}

function forceAllStaffOffline() {
  const db = readDB();
  let count = 0;
  (db.users || []).forEach(u => {
    if (String(u.role).trim().toUpperCase() === 'STAF') {
      u.statusManual = 'OFFLINE';
      u.lastActiveMs = 0;
      count++;
    }
  });
  writeDB(db);
  return {
    success: true,
    message: count + ' akun staf pegawai berhasil dialihkan ke status Offline!',
    count: count
  };
}

function deleteStaff(idStaf) {
  const db = readDB();
  const idx = (db.users || []).findIndex(u => String(u.id).trim() === String(idStaf).trim());
  if (idx !== -1) {
    const deletedName = db.users[idx].nama;
    db.users.splice(idx, 1);
    writeDB(db);
    return { success: true, message: 'Staf ' + deletedName + ' berhasil dihapus.' };
  }
  return { success: false, message: 'Staf tidak ditemukan.' };
}

function archiveStaffWorkFile(targetStaffId, tahunArsip, catatanPeriode) {
  if (!tahunArsip) {
    return { success: false, message: 'Tahun arsip wajib diisi (contoh: 2026)!' };
  }

  const db = readDB();
  const yearClean = String(tahunArsip).trim();
  const dateStr = new Date().toLocaleString('id-ID');
  const labelPeriode = catatanPeriode ? (' - ' + catatanPeriode) : '';

  // Add year folder if not exists
  db.driveYearFolders = db.driveYearFolders || [];
  if (!db.driveYearFolders.some(f => f.yearName === yearClean)) {
    db.driveYearFolders.push({
      yearName: yearClean,
      url: `https://drive.google.com/drive/folders/ARCHIVE_${yearClean}`
    });
    db.driveYearFolders.sort((a, b) => a.yearName.localeCompare(b.yearName));
  }

  let archivedCount = 0;
  (db.users || []).forEach(u => {
    if (u.role === 'STAF' && (targetStaffId === 'ALL' || u.id === targetStaffId)) {
      const totalBaris = Number(u.totalBaris) || 0;
      const archiveFileName = `[ARSIP ${yearClean}] ${u.nama}${labelPeriode} (${dateStr})`;
      const idArsip = `ARS-${yearClean}-${Math.floor(10000 + Math.random() * 90000)}`;

      db.archives = db.archives || [];
      db.archives.unshift({
        idArsip: idArsip,
        tahun: yearClean,
        idStaf: u.id,
        namaStaf: u.nama,
        namaFile: archiveFileName,
        urlFile: `/sheet/${u.id}?arsip=${idArsip}`,
        urlFolderTahun: `https://drive.google.com/drive/folders/ARCHIVE_${yearClean}`,
        totalBaris: totalBaris,
        waktuArsip: dateStr
      });

      // Reset staff's grid to clean template
      const matrix = [];
      matrix.push(['NO', 'TANGGAL INPUT', 'KATEGORI / KODE', 'URAIAN DATA KETIKAN', 'KETERANGAN / STATUS']);
      for (let r = 1; r < 25; r++) {
        matrix.push(['', '', '', '', '']);
      }
      db.gridMatrices = db.gridMatrices || {};
      db.gridMatrices[u.username] = matrix;
      u.totalBaris = 0;

      archivedCount++;
    }
  });

  writeDB(db);

  return {
    success: true,
    message: archivedCount + ' file kerja staf berhasil diarsipkan ke Folder Tahun "' + yearClean + '"!'
  };
}

function getStaffGridCells(username) {
  const db = readDB();
  const uName = String(username).trim();
  const user = (db.users || []).find(u => u.username.toLowerCase() === uName.toLowerCase());

  let matrix = (db.gridMatrices && db.gridMatrices[uName]) ? db.gridMatrices[uName] : null;

  if (!matrix) {
    matrix = [];
    matrix.push(['NO', 'TANGGAL INPUT', 'KATEGORI / KODE', 'URAIAN DATA KETIKAN', 'KETERANGAN / STATUS']);
    for (let r = 1; r < 35; r++) {
      matrix.push(['', '', '', '', '']);
    }
    db.gridMatrices = db.gridMatrices || {};
    db.gridMatrices[uName] = matrix;
    writeDB(db);
  }

  return {
    success: true,
    matrix: matrix,
    totalBaris: user ? (user.totalBaris || 0) : 0
  };
}

function updateStaffCellByA1(username, coord, val) {
  const db = readDB();
  const uName = String(username).trim();
  const user = (db.users || []).find(u => u.username.toLowerCase() === uName.toLowerCase());

  db.gridMatrices = db.gridMatrices || {};
  let matrix = db.gridMatrices[uName];

  if (!matrix) {
    matrix = [];
    matrix.push(['NO', 'TANGGAL INPUT', 'KATEGORI / KODE', 'URAIAN DATA KETIKAN', 'KETERANGAN / STATUS']);
    for (let r = 1; r < 25; r++) {
      matrix.push(['', '', '', '', '']);
    }
    db.gridMatrices[uName] = matrix;
  }

  // Parse coord like B4, C12
  const colLetter = coord.charAt(0).toUpperCase();
  const rowNum = parseInt(coord.slice(1), 10);
  const cols = ['A', 'B', 'C', 'D', 'E'];
  const colIdx = cols.indexOf(colLetter);

  if (colIdx !== -1 && rowNum >= 1 && rowNum <= 25) {
    if (!matrix[rowNum - 1]) matrix[rowNum - 1] = ['', '', '', '', ''];
    matrix[rowNum - 1][colIdx] = val;

    // Recalculate filled rows
    let filled = 0;
    for (let r = 1; r < matrix.length; r++) {
      if (matrix[r] && matrix[r].some(cell => String(cell).trim() !== '')) {
        filled++;
      }
    }

    if (user) {
      user.totalBaris = filled;
      user.lastActiveMs = Date.now();
      user.statusManual = 'ONLINE';
    }

    writeDB(db);
    return { success: true, totalBaris: filled };
  }

  return { success: false, message: 'Koordinat sel tidak valid' };
}

// ---------------- DRIVE IMAGE PROXY FOR LOCALHOST ----------------
// Google Drive (lh3.googleusercontent.com) memblokir request langsung jika referer berasal dari localhost (HTTP 429).
// Proxy lokal ini mengunduh gambar secara aman dan menyajikannya ke browser localhost.
app.get('/api/drive-proxy', async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).send('Missing url parameter');
  try {
    const upstreamRes = await fetch(targetUrl);
    if (!upstreamRes.ok) {
      return res.status(upstreamRes.status).send('Gagal mengambil gambar: ' + upstreamRes.status);
    }
    const cType = upstreamRes.headers.get('content-type') || 'image/png';
    res.setHeader('Content-Type', cType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    const arrayBuf = await upstreamRes.arrayBuffer();
    return res.send(Buffer.from(arrayBuf));
  } catch (err) {
    console.error('Error proxying drive image:', err.message);
    return res.status(500).send('Proxy error: ' + err.message);
  }
});

// ---------------- GAS ROUTE DISPATCHER ----------------
app.post('/api/gas-call', async (req, res) => {
  const { functionName, args } = req.body;
  const a = args || [];
  const config = readConfig();

  // MODE 1: LIVE SINKRONISASI DENGAN GOOGLE APPS SCRIPT & GOOGLE DRIVE
  if (config.syncMode === 'live' && config.gasWebAppUrl) {
    try {
      console.log(`[GAS Live Sync] ${functionName} -> Mengirim ke Google Apps Script...`);
      const liveResult = await forwardToGoogleAppsScript(functionName, a);
      console.log(`[GAS Live Sync] ${functionName} -> Berhasil direspons dari Google Apps Script.`);

      // Sinkronkan juga perubahan status offline ke database lokal
      if (functionName === 'updateStaffData') {
        try { updateStaffData(a[0], a[1], a[2], a[3], a[4], a[5], a[6], a[7], a[8], a[9]); } catch (e) {}
      } else if (functionName === 'forceAllStaffOffline') {
        try { forceAllStaffOffline(); } catch (e) {}
      }
      return res.json(liveResult);
    } catch (gasErr) {
      console.warn(`[GAS Notice] ${functionName} (${gasErr.message}). Menggunakan penyimpanan lokal cadangan...`);
      // Lanjut otomatis ke MODE 2 (LOCAL MOCK FALLBACK) tanpa menghentikan aplikasi
    }
  }

  // MODE 2: LOCAL MOCK OFFLINE FALLBACK
  try {
    let result;
    switch (functionName) {
      case 'getOfficeBranding':
        result = getOfficeBranding();
        break;
      case 'saveOfficeBranding':
        result = saveOfficeBranding(a[0], a[1], a[2], a[3], a[4], a[5]);
        break;
      case 'loginUser':
        result = loginUser(a[0], a[1]);
        break;
      case 'logoutUser':
        result = logoutUser(a[0]);
        break;
      case 'sendHeartbeat':
        result = sendHeartbeat(a[0], a[1]);
        break;
      case 'getAdminDashboardData':
        result = getAdminDashboardData(a[0]);
        break;
      case 'registerNewStaff':
        result = registerNewStaff(a[0], a[1], a[2], a[3], a[4], a[5], a[6], a[7]);
        break;
      case 'archiveStaffWorkFile':
        result = archiveStaffWorkFile(a[0], a[1], a[2]);
        break;
      case 'getStaffGridCells':
        result = getStaffGridCells(a[0]);
        break;
      case 'updateStaffCellByA1':
        result = updateStaffCellByA1(a[0], a[1], a[2]);
        break;
      case 'updateStaffData':
        result = updateStaffData(a[0], a[1], a[2], a[3], a[4], a[5], a[6], a[7], a[8], a[9]);
        break;
      case 'forceAllStaffOffline':
        result = forceAllStaffOffline();
        break;
      case 'deleteStaff':
        result = deleteStaff(a[0]);
        break;
      default:
        console.warn('Unknown GAS function call:', functionName);
        return res.json({ success: false, message: 'Fungsi tidak ditemukan: ' + functionName });
    }
    return res.json(result);
  } catch (err) {
    console.error('Error in GAS call ' + functionName + ':', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Standalone Spreadsheet Preview for Iframe
// Standalone Spreadsheet Preview for Iframe (Menampilkan UI Google Spreadsheet Otentik)
app.get('/sheet/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const user = (db.users || []).find(u => u.id === id || u.username === id);
  const staffName = user ? user.nama : id;

  // Jika staf memiliki URL Google Spreadsheet asli, langsung redirect ke embedded Google Sheets!
  if (user && user.sheetUrl && user.sheetUrl.includes('docs.google.com/spreadsheets')) {
    let gUrl = user.sheetUrl;
    if (gUrl.includes('/edit')) {
      gUrl = gUrl.replace(/\/edit.*$/, '/edit?rm=embedded');
    } else if (!gUrl.includes('rm=embedded')) {
      gUrl += (gUrl.includes('?') ? '&' : '?') + 'rm=embedded';
    }
    return res.redirect(gUrl);
  }

  const matrix = (user && db.gridMatrices && db.gridMatrices[user.username])
    ? db.gridMatrices[user.username]
    : [
        ['NO', 'TANGGAL INPUT', 'KATEGORI / KODE', 'URAIAN DATA KETIKAN', 'KETERANGAN / STATUS']
      ];

  const headerRow = matrix[0] || ['NO', 'TANGGAL INPUT', 'KATEGORI / KODE', 'URAIAN DATA KETIKAN', 'KETERANGAN / STATUS'];
  
  let gridRowsHtml = '';
  for (let r = 1; r <= 25; r++) {
    const rowData = matrix[r] || ['', '', '', '', ''];
    gridRowsHtml += `<tr>
      <td class="bg-[#f8f9fa] border border-[#dadce0] text-center text-[#5f6368] font-sans text-[11px] select-none py-1">${r}</td>
      <td class="border border-[#dadce0] px-2 py-1 text-center font-mono text-xs">${rowData[0] || ''}</td>
      <td class="border border-[#dadce0] px-2 py-1 text-xs">${rowData[1] || ''}</td>
      <td class="border border-[#dadce0] px-2 py-1 text-xs font-semibold text-indigo-700">${rowData[2] || ''}</td>
      <td class="border border-[#dadce0] px-2 py-1 text-xs text-slate-800">${rowData[3] || ''}</td>
      <td class="border border-[#dadce0] px-2 py-1 text-xs text-slate-600">${rowData[4] || ''}</td>
    </tr>`;
  }

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>KERJA AKTIF - ${staffName} - Google Spreadsheet</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
  <style>
    body { font-family: 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; }
    .sheet-cell { outline: none; }
    .sheet-cell:focus { border: 2px solid #1a73e8 !important; }
  </style>
</head>
<body class="bg-white text-[#202124] flex flex-col h-screen overflow-hidden select-none text-xs">
  
  <!-- GOOGLE SHEETS HEADER BAR -->
  <header class="bg-[#f9fbfd] border-b border-[#dadce0] px-3 py-1.5 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <div class="w-8 h-8 rounded flex items-center justify-center bg-[#0f9d58] text-white shadow-sm shrink-0">
        <i class="fa-solid fa-table text-base"></i>
      </div>
      <div>
        <div class="flex items-center gap-2">
          <span class="font-bold text-sm text-[#202124] tracking-tight">KERJA AKTIF - ${staffName}</span>
          <span class="text-[10px] text-emerald-700 bg-emerald-100 font-semibold px-1.5 py-0.5 rounded flex items-center gap-1">
            <i class="fa-solid fa-cloud-arrow-up"></i> Otomatis Tersimpan di Drive
          </span>
        </div>
        <div class="flex items-center gap-3 text-[11px] text-[#5f6368] mt-0.5">
          <span class="hover:bg-slate-200 px-1 py-0.5 rounded cursor-pointer">File</span>
          <span class="hover:bg-slate-200 px-1 py-0.5 rounded cursor-pointer">Edit</span>
          <span class="hover:bg-slate-200 px-1 py-0.5 rounded cursor-pointer">Tampilan</span>
          <span class="hover:bg-slate-200 px-1 py-0.5 rounded cursor-pointer">Sisipkan</span>
          <span class="hover:bg-slate-200 px-1 py-0.5 rounded cursor-pointer">Format</span>
          <span class="hover:bg-slate-200 px-1 py-0.5 rounded cursor-pointer">Data</span>
          <span class="hover:bg-slate-200 px-1 py-0.5 rounded cursor-pointer">Alat</span>
        </div>
      </div>
    </div>
    <div class="flex items-center gap-2">
      <span class="text-[11px] text-[#5f6368] hidden sm:inline">Siap menerima sinkronisasi dikte suara</span>
      <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" title="Live Online"></span>
    </div>
  </header>

  <!-- FORMULA BAR FX -->
  <div class="bg-white border-b border-[#dadce0] px-3 py-1 flex items-center gap-2 text-xs">
    <span class="font-bold text-[#5f6368] px-2 py-0.5 bg-[#f1f3f4] rounded border border-[#dadce0] font-mono text-[11px]">B2</span>
    <span class="text-[#5f6368] font-serif italic text-sm font-bold">fx</span>
    <div class="flex-1 bg-white border border-[#dadce0] rounded px-2 py-0.5 text-xs text-slate-800">
      ${(matrix[1] && matrix[1][1]) ? matrix[1][1] : ''}
    </div>
  </div>

  <!-- SPREADSHEET TABLE GRID CONTAINER -->
  <div class="flex-1 overflow-auto bg-white">
    <table class="w-full border-collapse">
      <thead>
        <tr class="bg-[#f8f9fa] text-[#5f6368] text-xs font-semibold select-none sticky top-0 z-10">
          <th class="w-10 border border-[#dadce0] p-1 text-center font-normal text-[11px]"></th>
          <th class="w-16 border border-[#dadce0] p-1 text-center font-sans">A</th>
          <th class="w-44 border border-[#dadce0] p-1 text-center font-sans">B</th>
          <th class="w-48 border border-[#dadce0] p-1 text-center font-sans">C</th>
          <th class="min-w-[280px] border border-[#dadce0] p-1 text-center font-sans">D</th>
          <th class="w-48 border border-[#dadce0] p-1 text-center font-sans">E</th>
        </tr>
        <tr class="bg-[#2563eb] text-white text-xs font-bold sticky top-6 z-10 shadow-sm">
          <th class="w-10 border border-blue-400 p-2 text-center text-[10px] bg-blue-700">#</th>
          <th class="w-16 border border-blue-400 p-2 text-center">${headerRow[0] || 'NO'}</th>
          <th class="w-44 border border-blue-400 p-2 text-left">${headerRow[1] || 'TANGGAL INPUT'}</th>
          <th class="w-48 border border-blue-400 p-2 text-left">${headerRow[2] || 'KATEGORI / KODE'}</th>
          <th class="border border-blue-400 p-2 text-left">${headerRow[3] || 'URAIAN DATA KETIKAN'}</th>
          <th class="w-48 border border-blue-400 p-2 text-left">${headerRow[4] || 'KETERANGAN / STATUS'}</th>
        </tr>
      </thead>
      <tbody>
        ${gridRowsHtml}
      </tbody>
    </table>
  </div>

  <!-- SPREADSHEET BOTTOM TABS BAR -->
  <footer class="bg-[#f8f9fa] border-t border-[#dadce0] px-3 py-1 flex items-center justify-between text-xs text-[#5f6368]">
    <div class="flex items-center gap-2">
      <button class="hover:bg-[#dadce0] px-1.5 py-0.5 rounded text-sm"><i class="fa-solid fa-plus"></i></button>
      <button class="hover:bg-[#dadce0] px-1.5 py-0.5 rounded text-sm"><i class="fa-solid fa-bars"></i></button>
      <div class="bg-white border-t-2 border-t-[#0f9d58] border-x border-[#dadce0] px-3 py-1 font-semibold text-[#202124] rounded-t text-xs flex items-center gap-1.5 shadow-sm">
        <span>Lembar_Ketikan</span>
        <i class="fa-solid fa-caret-down text-[10px] text-[#5f6368]"></i>
      </div>
    </div>
    <div class="text-[11px] text-[#5f6368]">
      Live Google Sheets Workspace Simulator
    </div>
  </footer>

</body>
</html>`;

  res.send(html);
});

// Serve gas-bridge.js explicitly and static public assets
app.get('/gas-bridge.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'gas-bridge.js'));
});
app.use(express.static(path.join(__dirname, 'public'), { index: false }));

// Serve the User's EXACT Original Index.html with GAS Bridge Injected
app.get('/', (req, res) => {
  try {
    let html = fs.readFileSync(ORIGINAL_INDEX_PATH, 'utf8');
    // Inject the gas-bridge script right before </head> so google.script.run works seamlessly
    const bridgeTag = '<script src="/gas-bridge.js"></script>\n';
    html = html.replace('</head>', bridgeTag + '</head>');
    res.send(html);
  } catch (err) {
    console.error('Error serving Index.html:', err);
    res.status(500).send('Gagal membaca Index.html: ' + err.message);
  }
});

// Start Server
server.listen(PORT, () => {
  const cfg = readConfig();
  console.log(`=======================================================`);
  console.log(`🚀 Server Localhost Aktif`);
  console.log(`👉 Akses Aplikasi : http://localhost:${PORT}`);
  console.log(`📡 Mode Koneksi   : ${cfg.syncMode === 'live' ? '🟢 LIVE GOOGLE APPS SCRIPT (Google Sheets Asli)' : '🟡 LOCAL MOCK'}`);
  if (cfg.syncMode === 'live') {
    console.log(`🔗 Web App GAS    : ${cfg.gasWebAppUrl}`);
  }
  console.log(`=======================================================`);
});
