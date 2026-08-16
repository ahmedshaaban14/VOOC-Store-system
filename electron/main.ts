import { app, BrowserWindow, protocol, net } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname } from 'node:path';
import { setupIpcHandlers } from './ipc/handlers';
import { initDatabase } from './db/client';
import { AuthService } from './services/AuthService';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Register privileged custom protocol for local product images
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app-media',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
      bypassCSP: true,
    },
  },
]);

process.env.DIST = path.join(__dirname, '../dist');
process.env.VITE_PUBLIC = app.isPackaged
  ? process.env.DIST
  : path.join(__dirname, '../public');

let win: BrowserWindow | null = null;
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];

function createWindow() {
  const preloadPath = path.join(__dirname, 'preload.cjs');
  console.log('[MAIN] Preload path:', preloadPath);
  console.log('[MAIN] Preload file exists:', fs.existsSync(preloadPath));

  const iconPath = app.isPackaged
    ? path.join(process.env.DIST || path.join(__dirname, '../dist'), 'icon.png')
    : path.join(__dirname, '../public/icon.png');

  win = new BrowserWindow({
    title: 'VOOC Store - نظام إدارة متجر الملابس',
    width: 1366,
    height: 768,
    minWidth: 1024,
    minHeight: 600,
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    autoHideMenuBar: true,
    show: false,
  });

  // Listen for preload errors
  win.webContents.on('preload-error', (_event: any, preload: string, error: Error) => {
    console.error('[MAIN] PRELOAD ERROR in:', preload);
    console.error('[MAIN] PRELOAD ERROR:', error.message);
    console.error('[MAIN] PRELOAD STACK:', error.stack);
  });

  // Listen for console messages from renderer
  win.webContents.on('console-message', (_event: any, level: number, message: string) => {
    const levels = ['VERBOSE', 'INFO', 'WARNING', 'ERROR'];
    console.log(`[RENDERER ${levels[level] || level}] ${message}`);
  });

  win.maximize();

  win.once('ready-to-show', () => {
    win?.show();
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(process.env.DIST || path.join(__dirname, '../dist'), 'index.html'));
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
    win = null;
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.whenReady().then(async () => {
  console.log('[MAIN] Electron main process alive');

  // Register protocol handler for app-media://product-image/<filename>
  protocol.handle('app-media', (request) => {
    try {
      const url = new URL(request.url);
      let filename = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
      if (filename.startsWith('product-image/')) {
        filename = filename.substring('product-image/'.length);
      }
      filename = path.basename(filename);

      // Security check: reject empty or path traversal
      if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        return new Response('Forbidden', { status: 403 });
      }

      const imagesDir = path.join(app.getPath('userData'), 'product_images');
      const safeFilePath = path.join(imagesDir, filename);
      const resolvedPath = path.resolve(safeFilePath);

      // Security check: Must reside within userData/product_images
      if (!resolvedPath.startsWith(path.resolve(imagesDir)) || !fs.existsSync(resolvedPath)) {
        return new Response('Not Found', { status: 404 });
      }

      return net.fetch(pathToFileURL(resolvedPath).toString());
    } catch (err) {
      console.error('[MAIN] Error serving app-media protocol:', err);
      return new Response('Error loading media', { status: 500 });
    }
  });

  // 1. Initialize SQLite Database via sql.js + Drizzle ORM
  try {
    await initDatabase();
    console.log('[Main] SQLite Database initialized successfully.');
    AuthService.initDefaultAdmin();
  } catch (err) {
    console.error('[Main] Database initialization failed:', err);
  }

  // 2. Setup IPC handlers for renderer communication
  console.log('[MAIN] Registering IPC handlers');
  setupIpcHandlers();
  console.log('[MAIN] IPC handlers registered');

  // 3. Create Desktop Window
  console.log('[MAIN] Creating BrowserWindow');
  createWindow();
  console.log('[MAIN] BrowserWindow created');
});
