const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');

let mainWindow;

// ── Logging ───────────────────────────────────────────────────────────────────
let logStream = null;
function initLog() {
  try {
    const logPath = path.join(app.getPath('userData'), 'app.log');
    logStream = fs.createWriteStream(logPath, { flags: 'a' });
  } catch (_) {}
}
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try { if (logStream) logStream.write(line + '\n'); } catch (_) {}
}

// ── Health check ──────────────────────────────────────────────────────────────
function waitForBackend(retries, delay) {
  return new Promise((resolve, reject) => {
    function attempt() {
      const req = http.get('http://127.0.0.1:3001/api/health', (res) => {
        res.resume();
        if (res.statusCode === 200) { resolve(); } else { retry(); }
      });
      req.on('error', retry);
      req.setTimeout(900, () => { req.destroy(); retry(); });
      function retry() {
        if (--retries <= 0) { reject(new Error('Backend not ready')); return; }
        setTimeout(attempt, delay);
      }
    }
    attempt();
  });
}

// ── Window ────────────────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    backgroundColor: '#111',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());

  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, 'frontend/dist/index.html'));
  } else {
    const tryLoad = () => {
      mainWindow.loadURL('http://localhost:5173').catch(() => setTimeout(tryLoad, 500));
    };
    tryLoad();
    mainWindow.webContents.openDevTools();
  }
}

// ── Backend ───────────────────────────────────────────────────────────────────
async function startBackend() {
  const userData = app.getPath('userData');
  fs.mkdirSync(userData, { recursive: true });
  fs.mkdirSync(path.join(userData, 'archives'), { recursive: true });

  // ── DB path ──
  const dbPath = app.isPackaged
    ? path.join(userData, 'market_tracker.db')
    : path.join(__dirname, 'backend/prisma/dev.db');

  // Copy template DB to userData on first run
  if (app.isPackaged && !fs.existsSync(dbPath)) {
    const templatePaths = [
      path.join(process.resourcesPath, 'backend/prisma/dev.db'),
      path.join(process.resourcesPath, 'backend/dev.db'),
    ];
    for (const src of templatePaths) {
      if (fs.existsSync(src)) {
        log(`Copying DB: ${src} → ${dbPath}`);
        fs.copyFileSync(src, dbPath);
        break;
      }
    }
    if (!fs.existsSync(dbPath)) log('WARNING: No template DB found to copy!');
  }

  // ── Prisma engine ──
  // Must be set BEFORE requiring @prisma/client
  const prismaClientDirs = app.isPackaged
    ? [
        path.join(process.resourcesPath, 'backend/node_modules/.prisma/client'),
      ]
    : [
        path.join(__dirname, 'backend/node_modules/.prisma/client'),
      ];

  for (const dir of prismaClientDirs) {
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir);
    const isWin = process.platform === 'win32';
    let engineFile = files.find(f => f.endsWith('.node') && (isWin ? f.includes('windows') : !f.includes('windows')));
    if (!engineFile) engineFile = files.find(f => f.endsWith('.node')); // fallback

    if (engineFile) {
      process.env.PRISMA_QUERY_ENGINE_LIBRARY = path.join(dir, engineFile);
      log(`Prisma engine set: ${process.env.PRISMA_QUERY_ENGINE_LIBRARY}`);
      break;
    }
  }

  // ── Environment ──
  process.env.DB_PATH = dbPath;
  process.env.ARCHIVE_DIR = path.join(userData, 'archives');
  process.env.PORT = '3001';
  process.env.NODE_ENV = app.isPackaged ? 'production' : 'development';
  process.env.TZ = 'Asia/Kolkata';

  const backendPath = app.isPackaged
    ? path.join(process.resourcesPath, 'backend/dist/index.js')
    : path.join(__dirname, 'backend/dist/index.js');

  log(`Loading backend from: ${backendPath}`);
  log(`DB_PATH: ${process.env.DB_PATH}`);
  log(`PRISMA_QUERY_ENGINE_LIBRARY: ${process.env.PRISMA_QUERY_ENGINE_LIBRARY || 'NOT SET'}`);

  // Require the backend in-process (no child_process needed)
  require(backendPath);
  log('Backend module loaded successfully');
}

// ── App lifecycle ─────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  initLog();
  log(`=== App starting (packaged: ${app.isPackaged}) ===`);

  try {
    await startBackend();
  } catch (err) {
    log(`FATAL: Backend failed to load: ${err.message}\n${err.stack}`);
    // Still open window so user sees an error message rather than nothing
    createWindow();
    return;
  }

  // Wait for the HTTP server to actually bind before loading the UI
  try {
    await waitForBackend(30, 1000);
    log('Backend ready ✓');
  } catch (err) {
    log(`Backend health timeout: ${err.message} — opening anyway`);
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
