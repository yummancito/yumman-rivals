const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const log = require('electron-log');

class AppManager {
  constructor(configManager, lockService, updateManager) {
    this.configManager = configManager;
    this.lockService = lockService;
    this.updateManager = updateManager;
    this.mainWindow = null;
    this.installWindow = null;
    log.info('AppManager initialized');
  }

  async initialize() {
    try {
      log.info('Starting app initialization...');

      // 1. Limpiar locks huérfanos
      await this.lockService.cleanStaleLock();

      // 2. Crear estructura de carpetas
      await this.configManager.ensureDirectories();

      // 3. Cargar manifest local
      const localManifest = await this.updateManager.loadLocalManifest();

      if (!localManifest) {
        // 4. Primera instalación - descargar recursos
        log.info('First time installation - downloading resources');
        await this.showInstallWindowAndDownloadResources();
      } else {
        // 5. Instalación existente - abrir launcher principal
        log.info('Existing installation - opening launcher');
        this.createMainWindow();

        // En background, verificar actualizaciones
        this.checkForUpdatesInBackground();
      }
    } catch (error) {
      log.error('Error during app initialization:', error);
      throw error;
    }
  }

  async showInstallWindowAndDownloadResources() {
    return new Promise((resolve, reject) => {
      try {
        this.installWindow = new BrowserWindow({
          width: 500,
          height: 300,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
          },
          resizable: false,
          frame: false,
          icon: path.join(__dirname, '..', '..', 'icon.ico'),
          backgroundColor: '#0a0a0f',
          title: 'Instalando Recursos'
        });

        const installHTML = `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body {
                margin: 0;
                padding: 0;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100vh;
              }
              .container {
                text-align: center;
                padding: 40px;
              }
              h1 {
                font-size: 24px;
                margin-bottom: 10px;
              }
              .status {
                font-size: 14px;
                opacity: 0.9;
                margin-bottom: 20px;
              }
              .progress-bar {
                width: 100%;
                height: 8px;
                background: rgba(255,255,255,0.2);
                border-radius: 4px;
                overflow: hidden;
                margin-top: 20px;
              }
              .progress-fill {
                height: 100%;
                background: white;
                width: 0%;
                transition: width 0.3s ease;
              }
              .spinner {
                border: 3px solid rgba(255,255,255,0.3);
                border-top: 3px solid white;
                border-radius: 50%;
                width: 40px;
                height: 40px;
                animation: spin 1s linear infinite;
                margin: 20px auto;
              }
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>YUMMAN RIVALS</h1>
              <div class="spinner"></div>
              <div class="status" id="status">Preparando descarga...</div>
              <div class="progress-bar">
                <div class="progress-fill" id="progress"></div>
              </div>
            </div>
            <script>
              const { ipcRenderer } = require('electron');
              
              ipcRenderer.on('install:progress', (event, data) => {
                const progress = document.getElementById('progress');
                const status = document.getElementById('status');
                
                if (data.percent !== undefined) {
                  progress.style.width = data.percent + '%';
                }
                
                if (data.phase) {
                  const phaseText = {
                    'downloading': 'Descargando recursos...',
                    'verifying': 'Verificando integridad...',
                    'extracting': 'Extrayendo archivos...'
                  };
                  status.textContent = phaseText[data.phase] || data.phase || 'Procesando...';
                }
              });
              
              ipcRenderer.on('install:completed', () => {
                const status = document.getElementById('status');
                status.textContent = '¡Instalación completada!';
              });
            </script>
          </body>
          </html>
        `;

        this.installWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(installHTML)}`);

        // Handler para cuando el usuario cierra la ventana manualmente
        this.installWindow.on('closed', () => {
          log.info('Install window closed by user');
          this.installWindow = null;
          // Asegurar que se abra la ventana principal
          if (!this.mainWindow || this.mainWindow.isDestroyed()) {
            log.info('Opening main window after install window closed');
            this.createMainWindow();
          }
        });

        // Descargar recursos
        this.downloadResourcesForFirstTime()
          .then(() => {
            // Cerrar ventana de instalación
            this.installWindow.close();
            this.installWindow = null;

            // Abrir launcher principal
            this.createMainWindow();
            resolve();
          })
          .catch((error) => {
            log.error('Error downloading resources:', error);
            this.installWindow.close();
            this.installWindow = null;
            // Asegurar que se abra la ventana principal incluso si falla la descarga
            this.createMainWindow();
            reject(error);
          });
      } catch (error) {
        log.error('Error showing install window:', error);
        reject(error);
      }
    });
  }

  async downloadResourcesForFirstTime() {
    try {
      const remoteManifest = await this.updateManager.fetchRemoteManifest();

      await this.updateManager.downloadAndApplyResources(remoteManifest, (progress) => {
        if (this.installWindow && !this.installWindow.isDestroyed()) {
          this.installWindow.webContents.send('install:progress', progress);
        }
      });

      if (this.installWindow && !this.installWindow.isDestroyed()) {
        this.installWindow.webContents.send('install:completed');
      }

      log.info('Resources downloaded successfully for first time');
    } catch (error) {
      log.error('Error downloading resources for first time:', error);
      
      // Si es error 404 (manifest no encontrado), intentar usar recursos locales
      if (error.message.includes('HTTP 404') || error.message.includes('Not Found')) {
        log.warn('Remote manifest not found (404), checking for local resources...');
        
        // Solo verificar recursos locales en desarrollo
        if (!app.isPackaged) {
          const localResourcesPath = path.join(__dirname, '..', '..', 'resources');
          const localSkyboxes = path.join(localResourcesPath, 'skyboxes');
          const localTextures = path.join(localResourcesPath, 'textures');
          const fs = require('fs-extra');
        
          if (await fs.pathExists(localSkyboxes) && await fs.pathExists(localTextures)) {
            log.info('✓ Using local resources from resources/ folder');
            
            // Crear un manifest local falso para evitar que vuelva a intentar descargar
            const localManifest = {
              appVersion: '2.0.1',
              resourcesVersion: '2.0.1',
              resources: {
                url: '',
                sha256: '',
                size: 0,
                compressedSize: 0
              },
              app: {
                url: '',
                sha256: '',
                size: 0
              },
              releaseDate: new Date().toISOString(),
              changelog: []
            };
            
            await this.updateManager.saveLocalManifest(localManifest);
            log.info('Local manifest created to skip future downloads');
            
            if (this.installWindow && !this.installWindow.isDestroyed()) {
              this.installWindow.webContents.send('install:completed');
            }
            
            return;
          } else {
            log.warn('No local resources found either');
            throw error;
          }
        }
      }
      
      throw error;
    }
  }

  createMainWindow() {
    try {
      this.mainWindow = new BrowserWindow({
        width: 580,
        height: 280,
        minWidth: 580,
        minHeight: 280,
        resizable: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          preload: path.join(__dirname, '..', 'preload.js')
        },
        autoHideMenuBar: true,
        icon: path.join(__dirname, '..', '..', 'icon.ico'),
        backgroundColor: '#1D1B17',
        title: 'YUMMAN RIVALS',
        frame: false,
        center: true
      });

      // Cargar UI
      const uiPath = path.join(__dirname, '..', '..', 'ui-source', 'out', 'index.html');
      this.mainWindow.loadFile(uiPath);

      log.info('Main window created');
    } catch (error) {
      log.error('Error creating main window:', error);
      throw error;
    }
  }

  async checkForUpdatesInBackground() {
    try {
      const { needsResourcesUpdate, needsAppUpdate, remoteManifest } = await this.updateManager.checkForUpdates();

      if (needsResourcesUpdate) {
        log.info('Resources update available');
        // TODO: Mostrar notificación en UI
        // Por ahora, solo loggear
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.mainWindow.webContents.send('update:resources-available', {
            resourcesVersion: remoteManifest.resourcesVersion,
            changelog: remoteManifest.changelog
          });
        }
      }

      if (needsAppUpdate) {
        log.info('App update available');
        // TODO: Usar electron-updater como antes
        // Por ahora, solo loggear
      }
    } catch (error) {
      log.error('Error checking for updates in background:', error);
      // No lanzar error, es background
    }
  }

  getMainWindow() {
    return this.mainWindow;
  }

  getInstallWindow() {
    return this.installWindow;
  }

  setupIPCHandlers() {
    // NUEVOS CANALES (renderer → main):
    ipcMain.handle('update:start-download', async () => {
      try {
        const remoteManifest = await this.updateManager.fetchRemoteManifest();
        await this.updateManager.downloadAndApplyResources(remoteManifest, (progress) => {
          if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send('update:progress', progress);
          }
        });

        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.mainWindow.webContents.send('update:completed', {
            version: remoteManifest.resourcesVersion
          });
        }
      } catch (error) {
        log.error('Error downloading resources update:', error);
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.mainWindow.webContents.send('update:failed', {
            error: error.message
          });
        }
        throw error;
      }
    });

    ipcMain.handle('update:check-now', async () => {
      try {
        const result = await this.updateManager.checkForUpdates();
        return result;
      } catch (error) {
        log.error('Error checking for updates:', error);
        throw error;
      }
    });
  }
}

module.exports = AppManager;
