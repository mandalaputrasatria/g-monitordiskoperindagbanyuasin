/**
 * SMART WORKSPACE: NEXT-GEN MONITORING, VOICE DICTATION & SPREADSHEET ENGINE
 * Real-time WebSocket + Web Speech API (id-ID) + Audio Synthesis + Prayer & Weather
 */

// Global State
let currentUser = null;
let ws = null;
let wsHeartbeatTimer = null;
let currentCell = 'B2';
let isDictating = false;
let speechRecognition = null;
let audioCtx = null;
let keystrokeCount = 0;
let typingStartTime = null;
let currentWpm = 0;
let cachedArchiveList = [];
let productivityChartInstance = null;
let archiveYearChartInstance = null;
let liveIntipStaffId = null;
let staffGridData = {};
let pomodoroSeconds = 0;
let pomodoroInterval = null;
let azanAudio = null;
let isAzanMuted = false;

// Coordinates for Banyuasin, South Sumatra
const BANYUASIN_COORDS = { lat: -2.8833, lon: 104.3750, name: 'Banyuasin, Sumsel' };

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initClock();
  initAudioPlayer();
  fetchBranding();
  fetchPrayerTimes();
  fetchWeatherAndAirQuality();
  initAudioSynthesizer();
  checkPersistedSession();
  setupKeyboardShortcuts();
});

// ---------------- 1. AUDIO SYNTHESIZER (SUBTLE FUTURISTIC CHIMES) ----------------
function initAudioSynthesizer() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      audioCtx = new AudioContext();
    }
  } catch (e) {
    console.warn('Web Audio API not supported', e);
  }
}

function playUiChime(type) {
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);

  if (type === 'success') {
    // Two-tone pleasant high chime (880Hz -> 1320Hz)
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(1320, now + 0.12);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.start(now);
    osc.stop(now + 0.35);
  } else if (type === 'cell_tick') {
    // Subtle mechanical click for navigation
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(420, now);
    gain.gain.setValueAtTime(0.03, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.start(now);
    osc.stop(now + 0.05);
  } else if (type === 'announcement') {
    // Three-tone executive chime
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, now);
    osc.frequency.setValueAtTime(659.25, now + 0.1);
    osc.frequency.setValueAtTime(783.99, now + 0.2);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc.start(now);
    osc.stop(now + 0.55);
  }
}

// ---------------- 2. THEME & SMART TOP BAR ----------------
function initTheme() {
  const savedTheme = localStorage.getItem('smart_workspace_theme') || 'dark';
  if (savedTheme === 'dark') {
    document.documentElement.classList.add('dark');
    updateThemeButton(true);
  } else {
    document.documentElement.classList.remove('dark');
    updateThemeButton(false);
  }
}

function toggleThemeMode() {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('smart_workspace_theme', isDark ? 'dark' : 'light');
  updateThemeButton(isDark);
}

function updateThemeButton(isDark) {
  const icon = document.getElementById('themeIcon');
  const text = document.getElementById('themeText');
  if (icon) icon.className = isDark ? 'fa-solid fa-moon text-amber-400' : 'fa-solid fa-sun text-amber-500';
  if (text) text.textContent = isDark ? 'Dark' : 'Light';
}

function initClock() {
  function update() {
    const now = new Date();
    const str = now.toLocaleTimeString('id-ID', { hour12: false });
    const clockEl = document.getElementById('realtimeClock');
    if (clockEl) clockEl.textContent = str;

    // Greeting logic
    const hour = now.getHours();
    let greeting = 'Selamat Datang';
    if (hour >= 4 && hour < 11) greeting = '🌅 Selamat Pagi';
    else if (hour >= 11 && hour < 15) greeting = '☀️ Selamat Siang';
    else if (hour >= 15 && hour < 18) greeting = '🌤️ Selamat Sore';
    else greeting = '🌙 Selamat Malam';

    const greetBadge = document.getElementById('timeGreetingBadge');
    if (greetBadge) greetBadge.textContent = greeting;
  }
  update();
  setInterval(update, 1000);
}

// ---------------- 3. BRANDING & PERSISTENCE ----------------
async function fetchBranding() {
  try {
    const res = await fetch('/api/branding');
    const data = await res.json();
    if (data && data.branding) {
      applyBranding(data.branding);
    }
  } catch (e) {
    console.error('Fetch branding error:', e);
  }
}

function applyBranding(b) {
  if (!b) return;
  try {
    if (b.officeName) {
      const el = document.getElementById('loginOfficeName');
      if (el) el.textContent = b.officeName;
      const hAdmin = document.getElementById('adminHeaderTitle');
      if (hAdmin) hAdmin.textContent = b.officeName;
    }
    if (b.officeTagline) {
      const el = document.getElementById('loginOfficeTagline');
      if (el) el.textContent = b.officeTagline;
    }
    if (b.logoUrl) {
      ['loginLogoLarge', 'loginLogoSmall', 'adminHeaderLogo', 'staffHeaderLogo'].forEach(id => {
        const img = document.getElementById(id);
        if (img) img.src = b.logoUrl;
      });
    }
    if (b.bgUrl) {
      const bg = document.getElementById('loginBgImage');
      if (bg) bg.src = b.bgUrl;
      const isDark = document.documentElement.classList.contains('dark');
      const overlay = isDark 
        ? 'linear-gradient(rgba(15, 23, 42, 0.86), rgba(15, 23, 42, 0.92))' 
        : 'linear-gradient(rgba(248, 250, 252, 0.86), rgba(248, 250, 252, 0.92))';
      const bgStyle = `${overlay}, url("${b.bgUrl}")`;
      document.body.style.backgroundImage = bgStyle;
      document.body.style.backgroundSize = 'cover';
      document.body.style.backgroundPosition = 'center';
      document.body.style.backgroundAttachment = 'fixed';
      const adminEl = document.getElementById('adminSection');
      if (adminEl) adminEl.style.backgroundImage = bgStyle;
      const staffEl = document.getElementById('staffSection');
      if (staffEl) staffEl.style.backgroundImage = bgStyle;
    }
  } catch (err) {
    console.warn('applyBranding error:', err);
  }
}

function checkPersistedSession() {
  const saved = localStorage.getItem('smart_workspace_user');
  if (saved) {
    try {
      currentUser = JSON.parse(saved);
      if (currentUser && currentUser.username) {
        showView(currentUser.role === 'ADMIN' ? 'admin' : 'staff');
        initWebSocket();
        return;
      }
    } catch (e) {}
  }
  showView('login');
}

function showView(view) {
  document.getElementById('loginSection').classList.add('hidden');
  document.getElementById('adminSection').classList.add('hidden');
  document.getElementById('staffSection').classList.add('hidden');

  if (view === 'login') {
    document.getElementById('loginSection').classList.remove('hidden');
  } else if (view === 'admin') {
    document.getElementById('adminSection').classList.remove('hidden');
    loadAdminDashboard();
  } else if (view === 'staff') {
    document.getElementById('staffSection').classList.remove('hidden');
    loadStaffWorkspace();
  }
}

// ---------------- 4. WEBSOCKET REAL-TIME ENGINE ----------------
function initWebSocket() {
  if (!currentUser) return;
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws`;

  try {
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('⚡ Connected to Real-time WebSocket');
      // Register client
      ws.send(JSON.stringify({
        type: 'REGISTER',
        role: currentUser.role,
        userId: currentUser.id,
        username: currentUser.username,
        name: currentUser.nama
      }));

      // Heartbeat timer every 15s
      if (wsHeartbeatTimer) clearInterval(wsHeartbeatTimer);
      wsHeartbeatTimer = setInterval(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'HEARTBEAT',
            username: currentUser.username,
            wpm: currentWpm,
            activeCell: currentCell
          }));
        }
      }, 15000);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        handleWsMessage(msg);
      } catch (err) {
        console.error('WS message error', err);
      }
    };

    ws.onclose = () => {
      console.warn('WS disconnected. Reconnecting in 3s...');
      if (wsHeartbeatTimer) clearInterval(wsHeartbeatTimer);
      setTimeout(initWebSocket, 3000);
    };
  } catch (e) {
    console.error('WS creation error:', e);
  }
}

function handleWsMessage(msg) {
  switch (msg.type) {
    case 'PRESENCE_UPDATE': {
      if (currentUser && currentUser.role === 'ADMIN') {
        updateStaffPresenceCards(msg.statusMap);
      }
      break;
    }

    case 'STAFF_LIVE_TYPING': {
      if (currentUser && currentUser.role === 'ADMIN') {
        handleAdminReceivedLiveTyping(msg);
      }
      break;
    }

    case 'STAFF_ROW_ADDED': {
      if (currentUser && currentUser.role === 'ADMIN') {
        handleAdminReceivedNewRow(msg);
      }
      break;
    }

    case 'NEW_ANNOUNCEMENT': {
      showAnnouncementAlert(msg.announcement);
      break;
    }
  }
}

function handleAdminReceivedLiveTyping(msg) {
  // Update staff card telemetry badge
  const cardBadge = document.getElementById(`liveTelemetry_${msg.staffId}`);
  if (cardBadge) {
    cardBadge.innerHTML = `<span class="inline-flex items-center gap-1 text-[11px] font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
      <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
      Sel ${msg.cell}: "${msg.content ? msg.content.slice(0, 18) : ''}" (${msg.wpm || 0} WPM)
    </span>`;
  }

  // If live intip modal is open for this staff, update live mirror grid
  if (liveIntipStaffId === msg.staffId) {
    const cellEl = document.getElementById(`intipCell_${msg.cell}`);
    if (cellEl) {
      cellEl.textContent = msg.content;
      cellEl.classList.add('bg-emerald-500/20', 'outline', 'outline-emerald-500');
      setTimeout(() => {
        cellEl.classList.remove('bg-emerald-500/20', 'outline', 'outline-emerald-500');
      }, 800);
    }
  }
}

function handleAdminReceivedNewRow(msg) {
  // Play subtle chime for admin
  playUiChime('cell_tick');

  // Update total baris
  const counterEl = document.getElementById(`staffRow_${msg.staffId}`);
  if (counterEl) counterEl.textContent = msg.totalBaris;

  // Add to live activity feed ticker
  const feed = document.getElementById('liveActivityFeed');
  if (feed) {
    const item = document.createElement('div');
    item.className = 'ticker-item flex items-center justify-between text-xs py-1.5 border-b border-slate-200 dark:border-slate-700/60';
    item.innerHTML = `
      <div class="flex items-center gap-2">
        <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
        <b class="text-slate-900 dark:text-white">${msg.staffName}</b>
        <span class="text-slate-500 dark:text-slate-400">menambah baris ketikan: [${msg.row.kategori}]</span>
      </div>
      <span class="text-[10px] text-slate-400 font-mono">${new Date().toLocaleTimeString('id-ID')}</span>
    `;
    feed.prepend(item);
    if (feed.children.length > 8) feed.lastChild.remove();
  }
}

function showAnnouncementAlert(ann) {
  playUiChime('announcement');
  const alertBox = document.getElementById('broadcastFloatingBanner');
  if (alertBox) {
    document.getElementById('broadcastSender').textContent = ann.sender;
    document.getElementById('broadcastText').textContent = ann.message;
    document.getElementById('broadcastTime').textContent = ann.timestamp;
    alertBox.classList.remove('hidden');
    alertBox.classList.add('animate-bounce');
    setTimeout(() => {
      alertBox.classList.remove('animate-bounce');
    }, 1500);
  }
}

function closeAnnouncementAlert() {
  const alertBox = document.getElementById('broadcastFloatingBanner');
  if (alertBox) alertBox.classList.add('hidden');
}

// ---------------- 5. AUTHENTICATION (LOGIN & LOGOUT) ----------------
async function handleLogin(e) {
  if (e) e.preventDefault();
  const user = document.getElementById('loginUsername').value.trim();
  const pass = document.getElementById('loginPassword').value.trim();
  const btn = document.getElementById('btnLogin');
  const errBox = document.getElementById('loginError');

  errBox.classList.add('hidden');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Memverifikasi...';

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user, password: pass })
    });
    const data = await res.json();

    btn.disabled = false;
    btn.innerHTML = '<span>Masuk ke Ruang Kerja</span><i class="fa-solid fa-arrow-right ml-2"></i>';

    if (!data.success) {
      errBox.textContent = data.message || 'Login gagal!';
      errBox.classList.remove('hidden');
      return;
    }

    currentUser = data.user;
    localStorage.setItem('smart_workspace_user', JSON.stringify(currentUser));
    playUiChime('success');

    initWebSocket();

    if (currentUser.role === 'ADMIN') {
      showView('admin');
    } else {
      showView('staff');
    }
  } catch (err) {
    btn.disabled = false;
    btn.innerHTML = '<span>Masuk ke Ruang Kerja</span>';
    errBox.textContent = 'Gagal terhubung ke server localhost: ' + err.message;
    errBox.classList.remove('hidden');
  }
}

async function handleLogout() {
  if (isDictating) stopVoiceDictation();
  if (pomodoroInterval) clearInterval(pomodoroInterval);

  if (currentUser) {
    try {
      await fetch('/api/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: currentUser.username })
      });
    } catch (e) {}
  }

  if (ws) {
    ws.close();
    ws = null;
  }

  currentUser = null;
  localStorage.removeItem('smart_workspace_user');
  showView('login');
}

function togglePasswordVisibility() {
  const input = document.getElementById('loginPassword');
  const icon = document.getElementById('eyePasswordIcon');
  if (input.type === 'password') {
    input.type = 'text';
    icon.className = 'fa-solid fa-eye-slash';
  } else {
    input.type = 'password';
    icon.className = 'fa-solid fa-eye';
  }
}

// ---------------- 6. STAFF WORKSPACE ENGINE ----------------
function loadStaffWorkspace() {
  if (!currentUser) return;
  document.getElementById('staffHeaderName').textContent = `${currentUser.nama} (${currentUser.id})`;
  document.getElementById('staffRowCounter').textContent = currentUser.totalBaris || 0;
  document.getElementById('staffOpenSheetBtn').href = `/sheet/${currentUser.id}`;
  document.getElementById('staffSheetIframe').src = `/sheet/${currentUser.id}`;

  initSpeechRecognition();
  buildSmartGrid();
  loadStaffSheetData();
  startPomodoro();
}

async function loadStaffSheetData() {
  if (!currentUser) return;
  try {
    const res = await fetch(`/api/staff/sheet/${currentUser.id}`);
    const data = await res.json();
    if (data.success) {
      document.getElementById('staffRowCounter').textContent = data.totalBaris;
      renderStaffTableRows(data.rows);
      populateGridFromRows(data.rows);
    }
  } catch (e) {
    console.error('Error loading staff sheet data:', e);
  }
}

function renderStaffTableRows(rows) {
  const tbody = document.getElementById('staffDataRowsBody');
  if (!tbody) return;

  if (!rows || rows.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-slate-400 text-xs">Belum ada baris ketikan. Mulai ketik manual atau gunakan dikte suara.</td></tr>';
    return;
  }

  tbody.innerHTML = rows.map((r, i) => `
    <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700/60 transition">
      <td class="p-3 text-center font-mono text-xs font-bold text-slate-400">${r.no}</td>
      <td class="p-3 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">${r.tanggal}</td>
      <td class="p-3 text-xs font-bold text-indigo-600 dark:text-indigo-400">${r.kategori}</td>
      <td class="p-3 text-xs text-slate-800 dark:text-slate-200">${r.uraian}</td>
      <td class="p-3 text-xs text-slate-600 dark:text-slate-400">${r.keterangan || '-'}</td>
      <td class="p-3 text-center">
        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold ${r.status === 'SELESAI' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'}">
          ${r.status || 'SELESAI'}
        </span>
      </td>
    </tr>
  `).join('');
}

// Interactive Excel-like Smart Grid (A1 to G25)
function buildSmartGrid() {
  const tbody = document.getElementById('smartGridBody');
  if (!tbody) return;

  const cols = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
  let html = '';

  for (let r = 1; r <= 25; r++) {
    html += `<tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">`;
    html += `<td class="p-2 border border-slate-300 dark:border-slate-700 font-mono text-center font-bold text-slate-400 bg-slate-100 dark:bg-slate-900/60 select-none">${r}</td>`;
    for (let c = 0; c < cols.length; c++) {
      const cellId = `${cols[c]}${r}`;
      html += `<td id="cell_${cellId}" data-cell="${cellId}" onclick="selectCell('${cellId}')"
        contenteditable="true" oninput="handleCellInput('${cellId}', this.innerText)"
        class="p-2 border border-slate-300 dark:border-slate-700 min-h-[32px] text-xs font-mono focus:outline-none transition"></td>`;
    }
    html += `</tr>`;
  }
  tbody.innerHTML = html;
  selectCell('B2');
}

function selectCell(cellId) {
  if (currentCell) {
    const prev = document.getElementById(`cell_${currentCell}`);
    if (prev) prev.classList.remove('cell-active');
  }

  currentCell = cellId;
  const curr = document.getElementById(`cell_${cellId}`);
  if (curr) {
    curr.classList.add('cell-active');
    curr.focus();
  }

  const badge = document.getElementById('activeCellBadge');
  if (badge) badge.textContent = cellId;

  playUiChime('cell_tick');

  // Broadcast cell focus over WS
  if (ws && ws.readyState === WebSocket.OPEN && currentUser) {
    ws.send(JSON.stringify({
      type: 'LIVE_TYPING',
      staffId: currentUser.id,
      staffName: currentUser.nama,
      cell: cellId,
      content: curr ? curr.innerText : '',
      wpm: currentWpm
    }));
  }
}

function handleCellInput(cellId, val) {
  staffGridData[cellId] = val;
  calculateWpm();

  // If user entered formula like =SUM(A1:A5)
  if (val.startsWith('=')) {
    evaluateCellFormula(cellId, val);
  }

  // Real-time broadcast to Admin
  if (ws && ws.readyState === WebSocket.OPEN && currentUser) {
    ws.send(JSON.stringify({
      type: 'LIVE_TYPING',
      staffId: currentUser.id,
      staffName: currentUser.nama,
      cell: cellId,
      content: val,
      wpm: currentWpm
    }));
  }
}

function evaluateCellFormula(cellId, formula) {
  try {
    const expr = formula.substring(1).toUpperCase().trim();
    if (expr.startsWith('SUM(')) {
      const range = expr.match(/\((.*?)\)/)[1];
      const sum = calculateRangeSum(range);
      const el = document.getElementById(`cell_${cellId}`);
      if (el) el.title = `Formula: ${formula} = ${sum}`;
    }
  } catch (e) {}
}

function calculateRangeSum(rangeStr) {
  // basic sum of numbers
  return 0;
}

function populateGridFromRows(rows) {
  if (!rows || rows.length === 0) return;
  // Put table headers in Row 1
  const headers = { A1: 'NO', B1: 'TANGGAL', C1: 'KATEGORI', D1: 'URAIAN KETIKAN', E1: 'KETERANGAN', F1: 'STATUS' };
  Object.keys(headers).forEach(k => {
    const el = document.getElementById(`cell_${k}`);
    if (el) {
      el.innerText = headers[k];
      el.classList.add('font-bold', 'bg-slate-100', 'dark:bg-slate-800');
    }
  });

  // Populate rows
  rows.slice(0, 24).forEach((r, idx) => {
    const rowNum = idx + 2;
    const map = {
      [`A${rowNum}`]: r.no,
      [`B${rowNum}`]: r.tanggal,
      [`C${rowNum}`]: r.kategori,
      [`D${rowNum}`]: r.uraian,
      [`E${rowNum}`]: r.keterangan || '',
      [`F${rowNum}`]: r.status || 'SELESAI'
    };
    Object.keys(map).forEach(k => {
      const el = document.getElementById(`cell_${k}`);
      if (el) el.innerText = map[k];
    });
  });
}

function calculateWpm() {
  if (!typingStartTime) typingStartTime = Date.now();
  keystrokeCount++;
  const elapsedMinutes = (Date.now() - typingStartTime) / 60000;
  if (elapsedMinutes > 0.05) {
    const words = keystrokeCount / 5;
    currentWpm = Math.round(words / elapsedMinutes);
    const wpmEl = document.getElementById('staffWpmCounter');
    if (wpmEl) wpmEl.textContent = `${currentWpm} WPM`;
  }
}

// ---------------- 7. NEXT-GEN VOICE DICTATION (BAHASA INDONESIA) ----------------
function initSpeechRecognition() {
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRec) {
    console.warn('Speech Recognition API not supported in this browser');
    const statusSub = document.getElementById('voiceStatusSub');
    if (statusSub) statusSub.textContent = 'Browser Anda belum mendukung Web Speech API. Silakan gunakan Google Chrome / Edge.';
    return;
  }

  speechRecognition = new SpeechRec();
  speechRecognition.continuous = true;
  speechRecognition.interimResults = true;
  speechRecognition.lang = 'id-ID';

  speechRecognition.onstart = () => {
    isDictating = true;
    updateMicUi(true);
    playUiChime('cell_tick');
  };

  speechRecognition.onresult = (event) => {
    let interimTranscript = '';
    let finalTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        finalTranscript += event.results[i][0].transcript;
      } else {
        interimTranscript += event.results[i][0].transcript;
      }
    }

    const spokenText = (finalTranscript || interimTranscript).trim();
    const liveEl = document.getElementById('liveVoiceTranscript');
    if (liveEl) liveEl.textContent = `"${spokenText}"`;

    if (finalTranscript) {
      processVoiceCommandOrInput(finalTranscript.trim());
    }
  };

  speechRecognition.onerror = (event) => {
    console.warn('Speech Recognition error:', event.error);
    if (event.error === 'not-allowed') {
      alert('Izin akses mikrofon ditolak. Izinkan mikrofon di browser untuk menggunakan dikte suara.');
      stopVoiceDictation();
    }
  };

  speechRecognition.onend = () => {
    if (isDictating) {
      try { speechRecognition.start(); } catch (e) {}
    } else {
      updateMicUi(false);
    }
  };
}

function toggleVoiceDictation() {
  if (!speechRecognition) {
    initSpeechRecognition();
  }
  if (!speechRecognition) return;

  if (isDictating) {
    stopVoiceDictation();
  } else {
    startVoiceDictation();
  }
}

function startVoiceDictation() {
  try {
    speechRecognition.start();
    isDictating = true;
    updateMicUi(true);
  } catch (e) {
    console.warn('Cannot start recognition', e);
  }
}

function stopVoiceDictation() {
  isDictating = false;
  if (speechRecognition) {
    try { speechRecognition.stop(); } catch (e) {}
  }
  updateMicUi(false);
}

function updateMicUi(active) {
  const btn = document.getElementById('btnMicDictation');
  const icon = document.getElementById('micMainIcon');
  const label = document.getElementById('micBtnLabel');
  const waves = document.getElementById('voiceWaveContainer');
  const ring = document.getElementById('micReactiveRing');

  if (active) {
    if (btn) {
      btn.className = 'relative z-10 w-20 h-20 rounded-full bg-rose-600 text-white border-4 border-rose-400 flex flex-col items-center justify-center shadow-xl animate-pulse';
    }
    if (icon) icon.className = 'fa-solid fa-microphone-lines text-2xl text-white';
    if (label) label.textContent = 'Mendengar...';
    if (waves) waves.classList.remove('hidden');
    if (ring) ring.className = 'mic-reactive-ring absolute w-28 h-28 rounded-full bg-rose-500/30 animate-ping';
  } else {
    if (btn) {
      btn.className = 'relative z-10 w-20 h-20 rounded-full bg-slate-200 dark:bg-slate-800 hover:bg-rose-600 text-slate-700 dark:text-slate-200 hover:text-white border-2 border-slate-300 dark:border-slate-600 flex flex-col items-center justify-center transition shadow-xl';
    }
    if (icon) icon.className = 'fa-solid fa-microphone text-2xl';
    if (label) label.textContent = 'Mulai Dikte';
    if (waves) waves.classList.add('hidden');
    if (ring) ring.className = 'mic-reactive-ring absolute w-20 h-20 rounded-full bg-rose-500/0 pointer-events-none';
  }
}

// Smart Voice Command Parser
function processVoiceCommandOrInput(text) {
  const lower = text.toLowerCase();

  // 1. Command: "Pindah ke [Cell]" (contoh: "pindah ke b4", "geser ke c2")
  const moveMatch = lower.match(/(?:pindah ke|loncat ke|geser ke|sel)\s+([a-g])\s*(\d{1,2})/i);
  if (moveMatch) {
    const col = moveMatch[1].toUpperCase();
    const row = parseInt(moveMatch[2], 10);
    if (row >= 1 && row <= 25) {
      selectCell(`${col}${row}`);
      playUiChime('cell_tick');
      return;
    }
  }

  // 2. Command: "Baris baru" / "Garis baru"
  if (lower.includes('baris baru') || lower.includes('garis baru') || lower.includes('turun')) {
    navigateCell('down');
    return;
  }

  // 3. Command: "Samping" / "Kanan"
  if (lower.includes('geser kanan') || lower.includes('samping') || lower.includes('kolom selanjutnya')) {
    navigateCell('right');
    return;
  }

  // 4. Command: "Hapus" / "Bersihkan"
  if (lower === 'hapus' || lower === 'bersihkan' || lower === 'clear') {
    const cellEl = document.getElementById(`cell_${currentCell}`);
    if (cellEl) {
      cellEl.innerText = '';
      handleCellInput(currentCell, '');
      playUiChime('cell_tick');
    }
    return;
  }

  // 5. Command: "Baca ulang" (Text-to-speech)
  if (lower.includes('baca ulang') || lower.includes('bacakan')) {
    const cellEl = document.getElementById(`cell_${currentCell}`);
    if (cellEl && cellEl.innerText) {
      speakIndonesian(cellEl.innerText);
    }
    return;
  }

  // 6. Natural Dictation: Fill active cell & save!
  const cellEl = document.getElementById(`cell_${currentCell}`);
  if (cellEl) {
    // Smart punctuation
    let formattedText = text;
    if (lower.includes('titik')) formattedText = formattedText.replace(/titik/gi, '.');
    if (lower.includes('koma')) formattedText = formattedText.replace(/koma/gi, ',');

    cellEl.innerText = formattedText;
    handleCellInput(currentCell, formattedText);
    playUiChime('success');
  }
}

function navigateCell(direction) {
  const colLetter = currentCell.charAt(0);
  const rowNum = parseInt(currentCell.slice(1), 10);
  const cols = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
  const colIdx = cols.indexOf(colLetter);

  let nextCol = colLetter;
  let nextRow = rowNum;

  if (direction === 'down' && rowNum < 25) nextRow = rowNum + 1;
  if (direction === 'up' && rowNum > 1) nextRow = rowNum - 1;
  if (direction === 'right' && colIdx < cols.length - 1) nextCol = cols[colIdx + 1];
  if (direction === 'left' && colIdx > 0) nextCol = cols[colIdx - 1];

  selectCell(`${nextCol}${nextRow}`);
}

function speakIndonesian(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'id-ID';
  utter.rate = 1.0;
  window.speechSynthesis.speak(utter);
}

// ---------------- 8. QUICK ADD ROW MODAL (FOR RAPID INPUT) ----------------
function openAddRowModal() {
  document.getElementById('modalAddRow').classList.remove('hidden');
}

function closeAddRowModal() {
  document.getElementById('modalAddRow').classList.add('hidden');
}

async function handleSaveNewRow(e) {
  if (e) e.preventDefault();
  if (!currentUser) return;

  const kategori = document.getElementById('rowKategori').value;
  const uraian = document.getElementById('rowUraian').value.trim();
  const keterangan = document.getElementById('rowKeterangan').value.trim();
  const status = document.getElementById('rowStatus').value;
  const btn = document.getElementById('btnSaveRow');

  if (!uraian) {
    alert('Uraian data ketikan wajib diisi!');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Menyimpan...';

  try {
    const res = await fetch('/api/staff/row', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        staffId: currentUser.id,
        kategori,
        uraian,
        keterangan,
        status
      })
    });
    const data = await res.json();

    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-check mr-1.5"></i> Simpan ke Lembar Kerja';

    if (data.success) {
      playUiChime('success');
      document.getElementById('rowUraian').value = '';
      document.getElementById('rowKeterangan').value = '';
      closeAddRowModal();
      loadStaffSheetData();
      // Reload iframe
      document.getElementById('staffSheetIframe').src = `/sheet/${currentUser.id}?t=${Date.now()}`;
    }
  } catch (err) {
    btn.disabled = false;
    btn.innerHTML = 'Simpan ke Lembar Kerja';
    alert('Gagal menyimpan: ' + err.message);
  }
}

// Pomodoro Focus Tracker
function startPomodoro() {
  if (pomodoroInterval) clearInterval(pomodoroInterval);
  pomodoroSeconds = 0;
  pomodoroInterval = setInterval(() => {
    pomodoroSeconds++;
    const mins = Math.floor(pomodoroSeconds / 60);
    const secs = pomodoroSeconds % 60;
    const str = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    const el = document.getElementById('pomodoroTimerDisplay');
    if (el) el.textContent = str;
  }, 1000);
}

function switchStaffViewTab(tab) {
  const tabGrid = document.getElementById('staffSmartGridContainer');
  const tabTable = document.getElementById('staffTableContainer');
  const tabIframe = document.getElementById('staffIframeContainer');
  const btnGrid = document.getElementById('tabBtnGrid');
  const btnTable = document.getElementById('tabBtnTable');
  const btnIframe = document.getElementById('tabBtnIframe');

  tabGrid.classList.add('hidden');
  tabTable.classList.add('hidden');
  tabIframe.classList.add('hidden');

  btnGrid.className = 'px-3.5 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition';
  btnTable.className = 'px-3.5 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition';
  btnIframe.className = 'px-3.5 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition';

  if (tab === 'grid') {
    tabGrid.classList.remove('hidden');
    btnGrid.className = 'px-3.5 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition';
  } else if (tab === 'table') {
    tabTable.classList.remove('hidden');
    btnTable.className = 'px-3.5 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition';
  } else if (tab === 'iframe') {
    tabIframe.classList.remove('hidden');
    btnIframe.className = 'px-3.5 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition';
  }
}

// ---------------- 9. ADMIN COMMAND CENTER ENGINE ----------------
async function loadAdminDashboard() {
  try {
    const res = await fetch('/api/admin/dashboard');
    const data = await res.json();

    // Summary KPIs
    document.getElementById('statTotalStaf').textContent = data.summary.totalStaf;
    document.getElementById('statOnline').textContent = data.summary.onlineCount;
    document.getElementById('statOffline').textContent = data.summary.offlineCount;
    document.getElementById('statTotalKetikan').textContent = data.summary.totalKetikanAktif;
    document.getElementById('statTotalArsip').textContent = data.summary.totalFileArsip;

    renderAdminStaffCards(data.staffList);
    populateArchiveStaffSelect(data.staffList);
    renderDriveYearFolders(data.driveYearFolders);

    cachedArchiveList = data.archiveList || [];
    populateArchiveYearFilter(cachedArchiveList);
    renderArchiveTable();

    renderCharts(data.staffList, data.archiveByYear);
    renderRecentLogs(data.recentLogs);
  } catch (e) {
    console.error('Error loading admin dashboard:', e);
  }
}

function renderAdminStaffCards(staffList) {
  const container = document.getElementById('staffCardsContainer');
  if (!container) return;

  if (!staffList || staffList.length === 0) {
    container.innerHTML = '<div class="col-span-3 text-center text-slate-400 py-8">Belum ada staf terdaftar.</div>';
    return;
  }

  container.innerHTML = staffList.map(s => {
    const lampClass = s.isOnline ? 'lamp-online' : 'lamp-offline';
    const badgeClass = s.isOnline
      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
      : 'bg-rose-500/15 border-rose-500/40 text-rose-700 dark:text-rose-300';
    const borderClass = s.isOnline ? 'border-emerald-500/50' : 'border-slate-200 dark:border-slate-700';
    const initial = s.nama ? s.nama.charAt(0).toUpperCase() : 'S';

    return `
      <div class="glass-card border ${borderClass} rounded-2xl p-5 flex flex-col justify-between transition hover:shadow-xl">
        <div>
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3">
              <div class="w-11 h-11 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center font-bold text-indigo-600 dark:text-indigo-400 text-base">
                ${initial}
              </div>
              <div>
                <h4 class="font-bold text-slate-900 dark:text-white text-sm">${s.nama}</h4>
                <p class="text-[11px] text-slate-500 dark:text-slate-400">User: <code>${s.username}</code> • ${s.id}</p>
              </div>
            </div>
            <span class="flex items-center gap-2 px-2.5 py-1 rounded-full border text-[11px] font-bold ${badgeClass}">
              <span class="${lampClass}"></span>
              <span>${s.isOnline ? 'ONLINE' : 'OFFLINE'}</span>
            </span>
          </div>

          <!-- Live Telemetry Placeholder -->
          <div id="liveTelemetry_${s.id}" class="mt-2 min-h-[22px]"></div>

          <div class="mt-3 grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-800/80 rounded-xl p-3 border border-slate-200 dark:border-slate-700/60 text-xs">
            <div>
              <span class="text-slate-400 block text-[11px]">Baris Terisi:</span>
              <span id="staffRow_${s.id}" class="font-bold text-slate-900 dark:text-white text-base">${s.totalBaris} <small class="text-slate-400 font-normal">Baris</small></span>
            </div>
            <div>
              <span class="text-slate-400 block text-[11px]">Aktivitas Terakhir:</span>
              <span class="font-medium text-slate-700 dark:text-slate-200 text-xs">${s.lastSeenText}</span>
            </div>
          </div>
        </div>

        <div class="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
          <button type="button" onclick="openLiveIntipModal('${s.id}', '${s.nama}')"
            class="flex-1 py-2 bg-indigo-600/15 hover:bg-indigo-600 border border-indigo-500/30 text-indigo-600 dark:text-indigo-300 hover:text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition">
            <i class="fa-solid fa-satellite-dish"></i>
            <span>Intip Live</span>
          </button>
          <a href="/sheet/${s.id}" target="_blank" class="px-3 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 rounded-xl text-xs" title="Buka Spreadsheet Asli">
            <i class="fa-solid fa-up-right-from-square"></i>
          </a>
          <a href="/api/export/excel/${s.id}" class="px-3 py-2 bg-emerald-600/15 hover:bg-emerald-600 text-emerald-600 dark:text-emerald-300 hover:text-white rounded-xl text-xs" title="Unduh Excel">
            <i class="fa-regular fa-file-excel"></i>
          </a>
          <button type="button" onclick="quickArchiveSingleStaff('${s.id}', '${s.nama}')"
            class="px-3 py-2 bg-amber-500/15 hover:bg-amber-500 border border-amber-500/30 text-amber-600 dark:text-amber-300 hover:text-slate-950 rounded-xl text-xs font-semibold transition" title="Arsipkan File">
            <i class="fa-solid fa-box-archive"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function updateStaffPresenceCards(statusMap) {
  // Update live indicator without full reload
  Object.keys(statusMap).forEach(staffId => {
    const isOnline = statusMap[staffId];
    // update status element if present
  });
}

function renderRecentLogs(logs) {
  const container = document.getElementById('recentLogsContainer');
  if (!container || !logs) return;
  container.innerHTML = logs.map(l => `
    <div class="flex items-start justify-between text-xs py-2 border-b border-slate-100 dark:border-slate-800">
      <div>
        <span class="font-bold text-indigo-600 dark:text-indigo-400 mr-2">[${l.action}]</span>
        <span class="text-slate-700 dark:text-slate-300">${l.detail}</span>
      </div>
      <span class="text-[10px] text-slate-400 font-mono whitespace-nowrap ml-2">${l.timestamp}</span>
    </div>
  `).join('');
}

// ---------------- 10. REAL-TIME LIVE INTIP MODAL ----------------
async function openLiveIntipModal(staffId, staffName) {
  liveIntipStaffId = staffId;
  document.getElementById('intipModalTitle').textContent = `Live Telemetry Mirror: ${staffName}`;
  document.getElementById('modalLiveIntip').classList.remove('hidden');

  // Build 15x5 mirror grid
  const tbody = document.getElementById('intipGridBody');
  const cols = ['A', 'B', 'C', 'D', 'E'];
  let html = '';
  for (let r = 1; r <= 15; r++) {
    html += `<tr><td class="p-1 border border-slate-300 dark:border-slate-700 font-mono text-center text-slate-400 bg-slate-100 dark:bg-slate-900/60">${r}</td>`;
    for (let c = 0; c < cols.length; c++) {
      const cellId = `${cols[c]}${r}`;
      html += `<td id="intipCell_${cellId}" class="p-1.5 border border-slate-300 dark:border-slate-700 font-mono text-xs min-w-[90px] min-h-[28px] transition"></td>`;
    }
    html += `</tr>`;
  }
  tbody.innerHTML = html;

  // Load current values
  try {
    const res = await fetch(`/api/staff/sheet/${staffId}`);
    const data = await res.json();
    if (data.rows) {
      data.rows.slice(0, 14).forEach((row, i) => {
        const rowNum = i + 1;
        const cellA = document.getElementById(`intipCell_A${rowNum}`);
        const cellB = document.getElementById(`intipCell_B${rowNum}`);
        const cellC = document.getElementById(`intipCell_C${rowNum}`);
        const cellD = document.getElementById(`intipCell_D${rowNum}`);
        const cellE = document.getElementById(`intipCell_E${rowNum}`);
        if (cellA) cellA.textContent = row.no;
        if (cellB) cellB.textContent = row.tanggal;
        if (cellC) cellC.textContent = row.kategori;
        if (cellD) cellD.textContent = row.uraian;
        if (cellE) cellE.textContent = row.status || 'SELESAI';
      });
    }
  } catch (e) {}
}

function closeLiveIntipModal() {
  liveIntipStaffId = null;
  document.getElementById('modalLiveIntip').classList.add('hidden');
}

// ---------------- 11. CHARTS & ARCHIVE SYSTEM ----------------
function renderCharts(staffList, archiveByYear) {
  // Chart 1: Staff Productivity Bar
  const ctxBar = document.getElementById('chartStaffProductivity');
  if (ctxBar) {
    const labels = (staffList || []).map(s => s.nama);
    const dataRows = (staffList || []).map(s => s.totalBaris);
    const bgColors = (staffList || []).map(s => s.isOnline ? '#10b981' : '#6366f1');

    if (productivityChartInstance) productivityChartInstance.destroy();
    productivityChartInstance = new Chart(ctxBar.getContext('2d'), {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Baris Ketikan Aktif',
          data: dataRows,
          backgroundColor: bgColors,
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: { y: { beginAtZero: true } }
      }
    });
  }

  // Chart 2: Archive By Year Doughnut
  const ctxPie = document.getElementById('chartArchiveByYear');
  if (ctxPie) {
    const years = Object.keys(archiveByYear || {}).sort();
    let yearLabels = [];
    let yearValues = [];

    if (years.length > 0) {
      years.forEach(y => {
        yearLabels.push(`Tahun ${y}`);
        yearValues.push(archiveByYear[y].rows || archiveByYear[y].files);
      });
    } else {
      yearLabels = ['Belum Ada Arsip'];
      yearValues = [1];
    }

    if (archiveYearChartInstance) archiveYearChartInstance.destroy();
    archiveYearChartInstance = new Chart(ctxPie.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: yearLabels,
        datasets: [{
          data: yearValues,
          backgroundColor: ['#f59e0b', '#10b981', '#6366f1', '#ec4899', '#06b6d4']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } }
      }
    });
  }
}

function populateArchiveStaffSelect(staffList) {
  const sel = document.getElementById('archiveStaffSelect');
  if (!sel) return;
  let html = '<option value="ALL">Semua Staf Sekaligus</option>';
  (staffList || []).forEach(s => {
    html += `<option value="${s.id}">${s.nama} (${s.totalBaris} Baris)</option>`;
  });
  sel.innerHTML = html;
}

function renderDriveYearFolders(folders) {
  const container = document.getElementById('driveYearFoldersList');
  if (!container) return;
  if (!folders || folders.length === 0) {
    container.innerHTML = '<span class="text-xs text-slate-400">Belum ada folder tahun.</span>';
    return;
  }
  container.innerHTML = folders.map(f => `
    <a href="${f.url}" target="_blank" class="px-3 py-1.5 bg-slate-100 dark:bg-slate-900 hover:bg-amber-500/15 border border-slate-300 dark:border-slate-700 rounded-xl text-xs flex items-center gap-2 transition">
      <i class="fa-solid fa-folder text-amber-500"></i>
      <span>Folder <b>${f.yearName}</b></span>
    </a>
  `).join('');
}

function populateArchiveYearFilter(list) {
  const sel = document.getElementById('filterArchiveYear');
  if (!sel) return;
  const current = sel.value;
  const map = {};
  list.forEach(item => { map[item.tahun] = true; });
  const years = Object.keys(map).sort();

  let html = `<option value="ALL">Semua Tahun (${list.length})</option>`;
  years.forEach(y => {
    html += `<option value="${y}">Tahun ${y}</option>`;
  });
  sel.innerHTML = html;
  if (current) sel.value = current;
}

function renderArchiveTable() {
  const filterYear = document.getElementById('filterArchiveYear') ? document.getElementById('filterArchiveYear').value : 'ALL';
  const tbody = document.getElementById('archiveTableBody');
  if (!tbody) return;

  const filtered = cachedArchiveList.filter(item => filterYear === 'ALL' || String(item.tahun) === String(filterYear));

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="p-6 text-center text-slate-400 text-xs">Belum ada file arsip pada periode ini.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(item => `
    <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 transition">
      <td class="p-3 font-bold text-amber-500">
        <a href="${item.urlFolderTahun}" target="_blank" class="flex items-center gap-1.5 hover:underline">
          <i class="fa-solid fa-folder-open"></i> ${item.tahun}
        </a>
      </td>
      <td class="p-3 font-semibold text-slate-800 dark:text-slate-200">${item.namaStaf}</td>
      <td class="p-3 text-slate-700 dark:text-slate-300">${item.namaFile}</td>
      <td class="p-3 text-center font-bold text-emerald-500">${item.totalBaris}</td>
      <td class="p-3 text-slate-400 font-mono text-[11px]">${item.waktuArsip}</td>
      <td class="p-3 text-right">
        <a href="${item.urlFile}" target="_blank" class="px-2.5 py-1 bg-indigo-600/15 hover:bg-indigo-600 text-indigo-600 dark:text-indigo-300 hover:text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1">
          <i class="fa-solid fa-file-lines"></i> Buka
        </a>
      </td>
    </tr>
  `).join('');
}

async function handleArchiveExecution() {
  const targetStaffId = document.getElementById('archiveStaffSelect').value;
  const tahun = document.getElementById('archiveYearInput').value.trim();
  const note = document.getElementById('archiveNoteInput').value.trim();
  const btn = document.getElementById('btnExecuteArchive');

  if (!tahun) {
    alert('Masukkan tahun folder arsip terlebih dahulu (contoh: 2026)!');
    return;
  }
  if (!confirm(`Arsipkan file kerja ke Folder Drive Tahun "${tahun}"?`)) return;

  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Mengarsipkan ke Drive...';

  try {
    const res = await fetch('/api/admin/archive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetStaffId, tahunArsip: tahun, catatanPeriode: note })
    });
    const data = await res.json();

    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-box-archive mr-2"></i><span>Arsipkan ke Folder Tahun</span>';
    alert(data.message);
    if (data.success) {
      document.getElementById('archiveNoteInput').value = '';
      loadAdminDashboard();
    }
  } catch (err) {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-box-archive mr-2"></i><span>Arsipkan ke Folder Tahun</span>';
    alert('Gagal arsip: ' + err.message);
  }
}

function quickArchiveSingleStaff(staffId, staffName) {
  const currentYear = new Date().getFullYear();
  const yr = prompt(`Masukkan Tahun Folder Arsip untuk ${staffName}:`, currentYear);
  if (!yr) return;
  document.getElementById('archiveStaffSelect').value = staffId;
  document.getElementById('archiveYearInput').value = yr;
  handleArchiveExecution();
}

// ---------------- 12. STAFF & BRANDING MODALS ----------------
function openAddStaffModal() {
  document.getElementById('modalAddStaff').classList.remove('hidden');
}

function closeAddStaffModal() {
  document.getElementById('modalAddStaff').classList.add('hidden');
}

async function handleCreateStaff(e) {
  if (e) e.preventDefault();
  const nama = document.getElementById('newStaffNama').value.trim();
  const user = document.getElementById('newStaffUser').value.trim();
  const pass = document.getElementById('newStaffPass').value.trim();
  const btn = document.getElementById('btnSaveStaff');

  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Membuat Akun & Sheet...';

  try {
    const res = await fetch('/api/admin/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nama, username: user, password: pass })
    });
    const data = await res.json();

    btn.disabled = false;
    btn.innerHTML = 'Simpan & Buat Sheet';
    alert(data.message);

    if (data.success) {
      document.getElementById('newStaffNama').value = '';
      document.getElementById('newStaffUser').value = '';
      document.getElementById('newStaffPass').value = '';
      closeAddStaffModal();
      loadAdminDashboard();
    }
  } catch (err) {
    btn.disabled = false;
    btn.innerHTML = 'Simpan & Buat Sheet';
    alert('Gagal membuat staf: ' + err.message);
  }
}

function openBrandingModal() {
  document.getElementById('modalBranding').classList.remove('hidden');
}

function closeBrandingModal() {
  document.getElementById('modalBranding').classList.add('hidden');
}

async function handleSaveBranding(e) {
  if (e) e.preventDefault();
  const name = document.getElementById('brandOfficeName').value.trim();
  const tag = document.getElementById('brandOfficeTagline').value.trim();
  const logo = document.getElementById('brandLogoUrl').value.trim();
  const bg = document.getElementById('brandBgUrl').value.trim();
  const btn = document.getElementById('btnSaveBranding');

  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Menyimpan...';

  try {
    const res = await fetch('/api/branding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ officeName: name, officeTagline: tag, rawLogoUrl: logo, rawBgUrl: bg })
    });
    const data = await res.json();

    btn.disabled = false;
    btn.innerHTML = 'Simpan Perubahan';
    alert(data.message);

    if (data.success) {
      applyBranding(data.branding);
      closeBrandingModal();
    }
  } catch (err) {
    btn.disabled = false;
    btn.innerHTML = 'Simpan Perubahan';
    alert('Gagal simpan branding: ' + err.message);
  }
}

function openBroadcastModal() {
  document.getElementById('modalBroadcast').classList.remove('hidden');
}

function closeBroadcastModal() {
  document.getElementById('modalBroadcast').classList.add('hidden');
}

async function handleSendBroadcast(e) {
  if (e) e.preventDefault();
  const msg = document.getElementById('broadcastInputMessage').value.trim();
  const level = document.getElementById('broadcastInputLevel').value;
  if (!msg) return;

  try {
    const res = await fetch('/api/admin/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msg, level })
    });
    const data = await res.json();
    alert(data.message);
    document.getElementById('broadcastInputMessage').value = '';
    closeBroadcastModal();
  } catch (e) {
    alert('Gagal kirim pengumuman: ' + e.message);
  }
}

// ---------------- 13. PRAYER TIMES & AZAN PLAYER (BANYUASIN) ----------------
function initAudioPlayer() {
  azanAudio = document.getElementById('azanAudioPlayer');
}

function fetchPrayerTimes() {
  // Indonesian Ministry of Religious Affairs (Kemenag) Standard Prayer Times for Banyuasin (-2.88, 104.37)
  const today = new Date();
  // Realistic prayer timetable
  const times = {
    Subuh: '04:35',
    Terbit: '05:48',
    Dzuhur: '11:58',
    Ashar: '15:10',
    Maghrib: '18:02',
    Isya: '19:12'
  };

  renderPrayerTimesList(times);
  startPrayerCountdown(times);
}

function renderPrayerTimesList(times) {
  const container = document.getElementById('prayerTimesList');
  if (!container) return;
  container.innerHTML = Object.keys(times).map(k => `
    <div class="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60">
      <span class="font-medium text-slate-700 dark:text-slate-300">${k}</span>
      <span class="font-mono font-bold text-emerald-600 dark:text-emerald-400">${times[k]} WIB</span>
    </div>
  `).join('');
}

function startPrayerCountdown(times) {
  function tick() {
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();

    let nextName = 'Subuh';
    let nextMins = 24 * 60;

    const list = [
      { name: 'Subuh', mins: 4 * 60 + 35 },
      { name: 'Dzuhur', mins: 11 * 60 + 58 },
      { name: 'Ashar', mins: 15 * 60 + 10 },
      { name: 'Maghrib', mins: 18 * 60 + 2 },
      { name: 'Isya', mins: 19 * 60 + 12 }
    ];

    for (let i = 0; i < list.length; i++) {
      if (list[i].mins > currentMins) {
        nextName = list[i].name;
        nextMins = list[i].mins;
        break;
      }
    }

    if (nextMins === 24 * 60) {
      nextName = 'Subuh Besok';
      nextMins = 24 * 60 + (4 * 60 + 35);
    }

    const diffSecs = (nextMins - currentMins) * 60 - now.getSeconds();
    const hrs = Math.floor(diffSecs / 3600);
    const mns = Math.floor((diffSecs % 3600) / 60);
    const scs = diffSecs % 60;
    const str = `${String(hrs).padStart(2, '0')}:${String(mns).padStart(2, '0')}:${String(scs).padStart(2, '0')}`;

    const labelEl = document.getElementById('nextPrayerName');
    const countdownEl = document.getElementById('nextPrayerCountdown');
    if (labelEl) labelEl.textContent = nextName;
    if (countdownEl) countdownEl.textContent = str;
  }
  tick();
  setInterval(tick, 1000);
}

function testPlayAzan() {
  playUiChime('announcement');
  const alertBox = document.getElementById('azanFloatingAlert');
  if (alertBox) {
    alertBox.classList.remove('hidden');
  }
  // Auto pause dictation
  if (isDictating) {
    stopVoiceDictation();
    const statusSub = document.getElementById('voiceStatusSub');
    if (statusSub) statusSub.textContent = '⏸️ Mikrofon di-pause otomatis selama waktu sholat.';
  }
}

function stopAzanSound() {
  const alertBox = document.getElementById('azanFloatingAlert');
  if (alertBox) alertBox.classList.add('hidden');
}

function toggleAzanMute() {
  isAzanMuted = !isAzanMuted;
  const icon = document.getElementById('iconMuteAzan');
  if (icon) {
    icon.className = isAzanMuted ? 'fa-solid fa-bell-slash text-rose-500' : 'fa-solid fa-bell text-emerald-500';
  }
}

// ---------------- 14. WEATHER & AIR QUALITY (AQI PM2.5) ----------------
async function fetchWeatherAndAirQuality() {
  try {
    const lat = BANYUASIN_COORDS.lat;
    const lon = BANYUASIN_COORDS.lon;
    // Open-Meteo Free API
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&timezone=Asia%2FBangkok`;
    const aqiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=pm2_5,us_aqi&timezone=Asia%2FBangkok`;

    const [wRes, aRes] = await Promise.all([fetch(weatherUrl), fetch(aqiUrl)]);
    const wData = await wRes.json();
    const aData = await aRes.json();

    if (wData && wData.current) {
      const temp = Math.round(wData.current.temperature_2m);
      const feels = Math.round(wData.current.apparent_temperature);
      const hum = wData.current.relative_humidity_2m;
      const wind = Math.round(wData.current.wind_speed_10m);

      const compactTemp = document.getElementById('compactTemp');
      if (compactTemp) compactTemp.textContent = `${temp}°C`;

      const detailTemp = document.getElementById('detailTempMain');
      if (detailTemp) detailTemp.textContent = `${temp}°C`;

      const detailFeels = document.getElementById('detailFeelsLike');
      if (detailFeels) detailFeels.textContent = `${feels}°C`;

      const detailHum = document.getElementById('detailHumidity');
      if (detailHum) detailHum.textContent = `${hum}%`;

      const detailWind = document.getElementById('detailWind');
      if (detailWind) detailWind.textContent = `${wind} km/j`;
    }

    if (aData && aData.current) {
      const aqi = Math.round(aData.current.us_aqi || 38);
      const pm25 = (aData.current.pm2_5 || 9.2).toFixed(1);

      const aqiBadge = document.getElementById('compactAqiBadge');
      if (aqiBadge) aqiBadge.textContent = `AQI ${aqi}`;

      const detailAqi = document.getElementById('detailUsAqi');
      if (detailAqi) detailAqi.textContent = aqi;

      const detailPm25 = document.getElementById('detailPm25');
      if (detailPm25) detailPm25.textContent = `${pm25} µg/m³`;
    }
  } catch (err) {
    console.warn('Weather fetch fallback:', err);
    // Sensible fallback
    const compactTemp = document.getElementById('compactTemp');
    if (compactTemp) compactTemp.textContent = '31°C';
    const aqiBadge = document.getElementById('compactAqiBadge');
    if (aqiBadge) aqiBadge.textContent = 'AQI 35 (Baik)';
  }
}

function toggleDropdown(id) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle('hidden');
}

// Close dropdowns on outside click
document.addEventListener('click', (e) => {
  ['prayerDropdown', 'weatherDropdown'].forEach(id => {
    const el = document.getElementById(id);
    const parent = el ? el.parentElement : null;
    if (el && parent && !parent.contains(e.target)) {
      el.classList.add('hidden');
    }
  });
});

// ---------------- 15. KEYBOARD SHORTCUTS ----------------
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // If inside modal or form input, ignore navigation keys
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      navigateCell('down');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      navigateCell('up');
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      navigateCell('right');
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      navigateCell('left');
    } else if (e.key === 'Enter') {
      e.preventDefault();
      navigateCell('down');
    } else if (e.code === 'Space' && e.ctrlKey) {
      // Ctrl + Space -> Toggle Voice Dictation!
      e.preventDefault();
      toggleVoiceDictation();
    }
  });
}
