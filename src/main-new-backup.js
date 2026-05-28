// Cargar variables de entorno
require('dotenv').config();

const { app } = require('electron');
const ConfigManager = require('./main/config-manager');
const IntegrityService = require('./main/integrity-service');
const LockService = require('./main/lock-service');
const DownloadManager = require('./main/download-manager');
const UpdateManager = require('./main/update-manager');
const AppManager = require('./main/app-manager');

// Instanciar servicios
const configManager = new ConfigManager();
const integrityService = new IntegrityService();
const lockService = new LockService(configManager);
const downloadManager = new DownloadManager(configManager, integrityService);
const updateManager = new UpdateManager(configManager, downloadManager, integrityService, lockService);
const appManager = new AppManager(configManager, lockService, updateManager);

// Configurar logging
const log = require('electron-log');
log.transports.file.level = 'info';
log.info('App iniciada');

// Evento cuando la app está lista
app.whenReady().then(async () => {
  try {
    await appManager.initialize();
    appManager.setupIPCHandlers();
  } catch (error) {
    log.error('Error initializing app:', error);
    app.quit();
  }
});

// Evento cuando todas las ventanas están cerradas
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Evento cuando la app se activa (macOS)
app.on('activate', () => {
  if (appManager.getMainWindow() === null) {
    appManager.createMainWindow();
  }
});

// Evento antes de salir
app.on('before-quit', async () => {
  log.info('App quitting');
});
