<div align="center">

# 🏛️ G-Monitor Diskoperindag Banyuasin
### Smart Workspace: Monitoring Staf Real-Time, Asisten Dikte Suara Pintar (id-ID), Luckysheet Document Grid & Pengarsipan Google Drive Terpadu

[![Google Apps Script](https://img.shields.io/badge/Google%20Apps%20Script-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://developers.google.com/apps-script)
[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Live%20Demo-brightgreen?style=for-the-badge&logo=github)](https://mandalaputrasatria.github.io/g-monitordiskoperindagbanyuasin/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Web Audio API](https://img.shields.io/badge/Web%20Audio%20API-FF6F00?style=for-the-badge&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
[![Luckysheet](https://img.shields.io/badge/Luckysheet-Document_Grid-10B981?style=for-the-badge&logo=microsoftexcel&logoColor=white)](https://github.com/mengshukeji/Luckysheet)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

<p align="center">
  🌐 <b>Live Web URL (GitHub Pages)</b>: <a href="https://mandalaputrasatria.github.io/g-monitordiskoperindagbanyuasin/">https://mandalaputrasatria.github.io/g-monitordiskoperindagbanyuasin/</a>
</p>

<p align="center">
  <b>Sistem Administrasi Kerja & Monitoring Produktivitas Pegawai Dinas Koperasi, Usaha Kecil dan Menengah, Perindustrian dan Perdagangan Kabupaten Banyuasin.</b>
</p>

---

</div>

## 📌 Ringkasan Proyek

**G-Monitor Diskoperindag Banyuasin** adalah platform digital *enterprise* berbasis **Google Workspace Cloud** dan **Google Apps Script (GAS)** yang dirancang untuk mempermudah pekerjaan administratif staf, penginputan data dokumen dengan perintah suara lisan, pemantauan status aktivitas kerja secara *real-time*, serta pengarsipan berkas tahunan otomatis ke dalam folder Google Drive dinas.

---

## ✨ Fitur-Fitur Unggulan

### 1. 🎙️ Real Web Audio Waveform & Asisten Dikte Suara Pintar
- **Visualizer Spektrum Gelombang Suara Nyata**: Menggunakan **Web Audio API** (`AudioContext` + `AnalyserNode`) untuk membaca desibel vokal asli dari mikrofon dan merendernya ke `<canvas>` (28 bilah spektrum dinamis: hening &rarr; ungu bicara normal &rarr; merah menyala saat vokal lantang).
- **Akumulasi Dikte Berkelanjutan**: Mampu mendengarkan ucapan terus-menerus tanpa memotong kalimat saat staf mengambil napas sejenak.
- **Penyimpanan Otomatis Saat Pindah Sel / Kolom**: Teks dikte dirangkai langsung di sel aktif secara *live* dan **baru disimpan ke Google Spreadsheet saat kursor berpindah sel** (melalui perintah suara navigasi, klik mouse, maupun tombol panah keyboard), menghemat kuota transmisi API dan mencegah *race condition*.
- **Pemetaan Tanda Baca Lisan Bahasa Indonesia**: Mengonversi otomatis ucapan lisan seperti *"koma"* &rarr; `, `, *"titik"* &rarr; `. `, *"titik dua"* &rarr; `: `, *"tanda tanya"* &rarr; `? `, *"persen"* &rarr; `%`, *"rupiah"* &rarr; `Rp `, dll.
- **Perintah Suara Navigasi Cerdas**: *"Pindah ke B4"*, *"Baris baru"*, *"Samping"*, *"Geser kiri"*, *"Hapus sel"*, *"Baca ulang"*.

### 2. 📊 Smart Grid Dokumen Kerja Staf (Luckysheet)
- **Tampilan Spreadsheet Responsif**: Mengintegrasikan *engine* dokumen spreadsheet Luckysheet langsung di dalam portal tanpa perlu membuka tab Google Sheets eksternal.
- **Dual-View Switcher**: Staf dapat berpindah secara fleksibel antara **Smart Grid Luckysheet (dengan widget dikte floating draggable)** dan **Tampilan Asli Google Spreadsheet (Embedded View)**.
- **Floating Draggable Widget**: Widget asisten suara dapat digeser bebas (*drag & drop*) ke mana saja di atas lembar kerja dan dapat di-*minimize* (*dropdown/collapse*).

### 3. 🌟 The Cosmic Pulse (Glow Orbit) Confirmation Toast
- **Dual Neon Orbit**: Logo resmi kantor dikelilingi dua cincin cahaya neon tipis (*cyan & indigo*) yang berputar konstan.
- **Shockwave Ripple & Particle Burst**: Gelombang kejut denyutan kosmik dengan letupan 12 partikel bintang radial saat konfirmasi berhasil.
- **3D Card Flip**: Logo kantor melakukan putaran 3D 180° berbalik menjadi lencana centang hijau (*emerald checkmark* ✓).
- **Avatar Pegawai & Emotikon Melambai (👋)**: Menampilkan foto profil Google Drive staf dan animasi emotikon tangan bergerak saat login (*"LOGIN BERHASIL! 👋"*) dan saat logout (*"SAMPAI JUMPA! 👋"*).
- **Integrasi Universal**: Digunakan pada konfirmasi Login, Logout, Tambah Pegawai, Edit Profil, Simpan Branding, dan Arsip Drive.

### 4. 🌧️ Halaman Login Sinematik (Atmospheric Weather & Glassmorphism)
- **Floating Glassmorphic Card**: Panel form login mengambang dengan latar belakang kaca tebal, border neon indigo transparan, dan bayangan *ambient glow*.
- **Partikel Gerimis Hujan Halus (*Rain Streaks*)**: Render canvas berakselerasi GPU 60 FPS yang otomatis di-*pause* saat masuk ruang kerja demi efisiensi daya.
- **Lapisan Kabut Melayang (*Drifting Fog/Mist Overlays*)**: Efek kabut atmosferik 3D yang lembut dan elegan.
- **Optimasi Foto Gedung & Bendera Merah Putih**: Latar belakang foto gedung kantor dan bendera merah putih tampak terang, jernih, dan megah di sisi kiri, lalu perlahan menggelap ke arah form login.
- **Keamanan Privasi**: Tidak menampilkan kredensial akun bawaan di layar publik demi keamanan data kantor.

### 5. 👥 Dashboard Eksekutif Monitoring Admin
- **Status Online/Offline Real-Time**: Indikator lampu berkedip (*pulsating lamp*) hijau (online) dan merah (offline) mendeteksi kehadiran staf berdasarkan *heartbeat ping*.
- **Penghitung Baris Ketikan Staf**: Memantau progres produktivitas ketikan data setiap staf secara langsung.
- **Live Spreadsheet Preview**: Fitur pratinjau lembar kerja staf secara langsung dari jendela modal admin.
- **Manajemen Akun Staf Lengkap**: Registrasi pegawai baru (otomatis membuat file spreadsheet baru dan folder foto profil di Drive), edit data staf, reset password, hingga opsi hapus akun.

### 6. 📂 Pengarsipan Folder Tahunan Google Drive
- Admin dapat mengarsipkan spreadsheet kerja staf yang telah selesai ke dalam folder arsip tahunan di Google Drive (`04_Arsip_Tahunan_Staf/[Tahun]`) dengan catatan periode yang terdokumentasi rapi.

### 7. 🕌 Pengingat Waktu Sholat & Auto-Pause Adzan
- Integrasi API jadwal sholat resmi Kemenag / Aladhan berdasarkan koordinat lintang-bujur Kabupaten Banyuasin.
- Notifikasi floating banner waktu sholat dan **otomatis menjeda (pause) mikrofon dikte** saat adzan berkumandang.

### 8. 📱 Progressive Web App (PWA) & Mode Dikte Offline-First
- **Aplikasi Terinstal Mandiri**: Dapat dipasang (*Install App*) langsung ke Windows Desktop, macOS, maupun smartphone Android/iOS dengan ikon resmi Diskoperindag Banyuasin.
- **Service Worker (`sw.js`) & Caching Cerdas**: Aplikasi dapat dibuka dan digunakan dengan cepat tanpa internet, bebas galat "No Internet".
- **Antrean Dikte Offline (*Offline Queue*)**: Ketika koneksi WiFi atau internet kantor sedang terputus, staf tetap dapat mendikte dan mengetik data kerja. Seluruh perubahan disimpan secara aman di memori lokal perangkat (`localStorage`).
- **Sinkronisasi Otomatis (*Auto-Sync*)**: Begitu internet kembali online, sistem secara otomatis mengunggah seluruh draf sel ke Google Sheets dan memunculkan konfirmasi *Cosmic Pulse Toast*.

### 9. 📊 e-Digital Kinerja Pegawai G-MONITOR & Generator Laporan Resmi
- **Modul Khusus Admin Eksekutif**: Terintegrasi eksklusif pada Dashboard Administrator untuk memantau, merekapitulasi, dan mendokumentasikan kinerja harian seluruh pegawai Diskoperindag.
- **Pemilihan Periode & Target Pegawai Fleksibel**: Menyaring rekaman kerja berdasarkan Hari Ini, 7 Hari Terakhir, Bulan Berjalan, Semua Waktu, maupun rentang tanggal kustom (date picker); serta pilihan agregat dinas ("Semua Pegawai") atau pemantauan individual per staf.
- **Rekapitulasi Metode Input & Rasio Adopsi Suara**: Menghitung secara presisi perbandingan aktivitas pengetikan manual (keyboard) vs dikte suara vokal (STT), dilengkapi *visual progress bar* dua warna dan **narasi evaluasi otomatis** berdasarkan indeks efisiensi kerja.
- **Tabel Komparatif Capaian & Sampel Aktivitas**: Menyajikan matriks produktivitas staf (Total Sel, Manual, Dikte, Rasio STT %, status performa dinamis) serta sampel cuplikan entri pekerjaan terbaru dengan lencana metode input.
- **Dua Format Berkas Resmi**:
  1. **Cetak PDF Resmi Standar Naskah Dinas**: KOP Surat Resmi Pemkab Banyuasin dengan logo asli, garis ganda dinas, simulasi kertas presisi (A4 & F4 / Folio, Potret / Lanskap), tanda tangan ganda (Supervisor & Admin), watermark naskah asli, dan QR-Code validasi elektronik (TTE).
  2. **Ekspor Lembar Kerja Excel (`.xlsx`)**: Ekspor multi-sheet instan via SheetJS (Sheet 1: Rekapitulasi Kinerja & Sheet 2: Log Detail Entri Aktivitas).
- **Pengesahan Supervisor & Manajemen Arsip Digital**: Menentukan pejabat penilai internal (Kadis, Sekdin, Kabid Koperasi, Kabid Perdagangan, Kabid Perindustrian, atau kustom), status pengesahan (Disetujui, Menunggu, Dibatalkan), serta pencatatan audit hash ke riwayat arsip naskah dinas.
- **Portal Verifikasi Keaslian Publik (`?verify=...`)**: Pemindaian kode QR di lembar fisik atau file PDF langsung mengarahkan ke sertifikat digital resmi Pemkab Banyuasin yang dapat diakses publik tanpa perlu login.
- **Catatan Disclaimer Legal**: Penjelasan eksplisit bahwa angka aktivitas merekam operasional sistem digital G-MONITOR dan bukan pengganti otomatis penilaian SKP resmi ASN.

### 10. 🛡️ Keamanan Siber Terintegrasi (Cybersecurity & Data Hardening Suite)
- **Pencegahan Cross-Site Scripting (XSS)**: Seluruh perenderan data pengguna ke dalam DOM telah disanitasi menggunakan fungsi `escapeHtml()` dan pemfilteran protokol URL berbahaya via `sanitizeUrl()`.
- **Proteksi Serangan Reverse Tabnabbing**: 100% tautan eksternal (`target="_blank"`) dipersenjatai dengan atribut `rel="noopener noreferrer"`.
- **Sistem Pertahanan Anti-Brute Force Lockout**: Form login diproteksi dari tebakan kata sandi berulang; akun dikunci otomatis selama 60 detik jika terjadi 5 kali kegagalan login berturut-turut, lengkap dengan indikator *live countdown timer*.
- **Pemantau Inaktivitas Sesi Otomatis (Inactivity Auto-Logout 5 Menit - Admin & Staf)**: Sistem mendeteksi ketiadaan interaksi pengguna (Administrator maupun Staf Pegawai) selama 5 menit dan otomatis mengunci sesi kerja dinas, dengan notifikasi peringatan dini 60 detik sebelumnya.
- **Pembersihan Memori & State DOM Saat Logout**: Seluruh variabel sesi, daftar staf, dan elemen tabel dihapus bersih dari memori peramban saat pengguna menekan tombol keluar.
- **Banner Peringatan Anti Self-XSS & Anti-Clickjacking**: Console browser memunculkan peringatan bahaya social engineering bagi pengguna awam, serta mekanisme *frame-busting* untuk menangkal eksploitasi pembajakan iframe.
- **Hashing Password Standar SHA-256 & Auto-Migration**: Password pengguna disimpan dalam format hash kriptografi SHA-256 satu arah (baik pada backend Node.js maupun Google Apps Script). Sistem mendukung *auto-migration* transparan sehingga pengguna lama dapat langsung login tanpa perlu reset kata sandi.
- **Header Keamanan Respons HTTP**: Dilengkapi `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `X-XSS-Protection: 1; mode=block`, dan `Referrer-Policy: strict-origin-when-cross-origin`.

---

## 🛠️ Arsitektur & Teknologi

| Komponen | Teknologi yang Digunakan |
| :--- | :--- |
| **Frontend Framework** | HTML5, Vanilla JavaScript (ES6+), Tailwind CSS (CDN), FontAwesome 6 |
| **Spreadsheet Engine** | Mengshukeji / Luckysheet (UMD CDN) |
| **Audio Processing** | Web Audio API (`AudioContext`, `AnalyserNode`), Web Speech API (`id-ID`) |
| **Backend & Database** | Google Apps Script (GAS), Google Sheets (`DB_USERS`), Google Drive API |
| **Local Proxy Server** | Node.js, Express.js |
| **Deployment CLI** | Google Clasp (`@google/clasp`) |

---

## 🚀 Panduan Menjalankan Secara Lokal (Local Development)

### 1. Prasyarat
- [Node.js](https://nodejs.org/) versi 18 atau yang lebih baru.
- Akun Google dengan akses ke Google Spreadsheet & Google Drive.

### 2. Kloning Repositori
```bash
git clone https://github.com/mandalaputrasatria/g-monitordiskoperindagbanyuasin.git
cd g-monitordiskoperindagbanyuasin
```

### 3. Instalasi Dependensi
```bash
npm install
```

### 4. Konfigurasi Endpoint (`config.json`)
Pastikan file `config.json` mengarah ke Web App Google Apps Script Anda:
```json
{
  "gasWebAppUrl": "https://script.google.com/macros/s/AKfycbzXVA-mCJFlZecMADLziVjjqk4WnMwIn0MpOCXSco_dA4QrTMfSiRRCsqLD-Oi3ElW2GQ/exec",
  "syncMode": "live"
}
```

### 5. Jalankan Server Lokal
```bash
node server.js
```
Buka peramban Anda di: **`http://localhost:3000`**

---

## ☁️ Panduan Deployment ke Google Apps Script (GAS)

Proyek ini telah dikonfigurasi dengan Google Clasp sehingga sinkronisasi kode ke Google Apps Script dapat dilakukan secara langsung dari terminal:

1. **Login ke Akun Google Anda via Clasp**:
   ```bash
   npx @google/clasp login
   ```
2. **Kirim Perubahan Kode ke Google Apps Script**:
   ```bash
   npx @google/clasp push -f
   ```
3. **Rilis / Deploy Versi Baru ke Web App**:
   ```bash
   npx @google/clasp deploy --description "Release Version"
   ```

---

## 📁 Struktur Direktori Proyek

```text
├── .clasp.json          # Konfigurasi Script ID Google Apps Script
├── .claspignore        # Daftar file yang diabaikan saat push ke GAS
├── .gitignore           # Daftar file yang diabaikan oleh Git
├── .nojekyll            # Bypass pemrosesan Jekyll di GitHub Pages
├── 404.html             # Smart redirector rute tidak dikenal di GitHub Pages
├── appsscript.json      # Manifest konfigurasi runtime Google Apps Script
├── Code.gs              # Backend server Google Apps Script (Database & Drive Handler)
├── config.json          # Konfigurasi proxy lokal server & endpoint Web App
├── icons/               # Ikon resmi Progressive Web App (PNG & SVG)
├── index.html           # Frontend SPA (UI, Luckysheet, Visualizer, PWA, PDF Generator)
├── manifest.webmanifest # Manifest PWA untuk instalasi desktop & mobile
├── package.json         # Konfigurasi paket Node.js
├── README.md            # Dokumentasi utama proyek
├── server.js            # Node.js Express local proxy server
└── sw.js                # Service Worker PWA (Offline caching & background sync)
```

---

## 📄 Lisensi

Proyek ini dilisensikan di bawah lisensi **MIT License** - silakan lihat berkas [LICENSE](LICENSE) untuk ketentuan selengkapnya.

---

<div align="center">
  <sub>Dikembangkan dengan ❤️ untuk kemajuan tata kelola digital <b>Dinas Koperasi, Usaha Kecil dan Menengah, Perindustrian dan Perdagangan Kabupaten Banyuasin</b>.</sub>
</div>
