const { autoUpdater } = require('electron-updater');
const { app, dialog, BrowserWindow } = require('electron');
const log = require('electron-log');
const fs = require('fs');
const path = require('path');

class Updater {
  constructor(mainWindow) {
    this.mainWindow = mainWindow;
    this.checkInterval = null;
    this.setupAutoUpdater();
    this.setupLogging();
  }

  setupLogging() {
    // Configurar logging
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
  }

  setupAutoUpdater() {
    // Configuración
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;

    // Eventos
    autoUpdater.on('checking-for-update', () => {
      log.info('Verificando actualizaciones...');
      this.sendStatusToWindow('Verificando actualizaciones...');
    });

    autoUpdater.on('update-available', (info) => {
      log.info('Actualización disponible:', info.version);
      this.onUpdateAvailable(info);
    });

    autoUpdater.on('update-not-available', () => {
      log.info('La app está actualizada');
      this.sendStatusToWindow('App actualizada');
    });

    autoUpdater.on('download-progress', (progress) => {
      this.onDownloadProgress(progress);
    });

    autoUpdater.on('update-downloaded', (info) => {
      log.info('Actualización descargada');
      this.onUpdateDownloaded(info);
    });

    autoUpdater.on('error', (error) => {
      log.error('Error en actualización:', error);
      this.sendStatusToWindow('Error al verificar actualizaciones');
    });
  }

  // Verificar actualizaciones
  checkForUpdates() {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      return;
    }

    // En modo desarrollo, mostrar mensaje informativo
    if (!app.isPackaged) {
      log.info('Modo desarrollo - actualizaciones no disponibles');
      this.sendStatusToWindow('Actualizaciones solo en versión instalada');
      
      // Mostrar diálogo informativo
      setTimeout(() => {
        dialog.showMessageBox(this.mainWindow, {
          type: 'info',
          title: 'Modo Desarrollo',
          message: 'Actualizaciones automáticas',
          detail: 'Las actualizaciones automáticas solo están disponibles en la versión instalada de la aplicación.\n\nEn modo desarrollo, descarga la última versión desde GitHub.',
          buttons: ['Entendido'],
          defaultId: 0
        });
      }, 500);
      return;
    }

    const updateConfigPath = path.join(process.resourcesPath, 'app-update.yml');
    if (!fs.existsSync(updateConfigPath)) {
      this.sendStatusToWindow('Actualizaciones disponibles solo en la versión instalada');
      return;
    }
    
    autoUpdater.checkForUpdates().catch(err => {
      log.error('Error al verificar actualizaciones:', err);
    });
  }

  // Iniciar verificación automática cada 30 minutos
  startAutoCheck() {
    // Verificar al iniciar
    setTimeout(() => {
      this.checkForUpdates();
    }, 5000); // 5 segundos después de iniciar

    // Verificar cada 30 minutos
    this.checkInterval = setInterval(() => {
      this.checkForUpdates();
    }, 30 * 60 * 1000); // 30 minutos
  }

  // Detener verificación automática
  stopAutoCheck() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  // Cuando hay actualización disponible
  onUpdateAvailable(info) {
    const message = `Nueva versión ${info.version} disponible\n\nVersión actual: ${app.getVersion()}\n\n¿Descargar e instalar ahora?`;
    
    dialog.showMessageBox(this.mainWindow, {
      type: 'info',
      title: 'Actualización Disponible',
      message: 'Nueva versión disponible',
      detail: message,
      buttons: ['Descargar', 'Más Tarde'],
      defaultId: 0,
      cancelId: 1
    }).then(result => {
      if (result.response === 0) {
        this.sendStatusToWindow('Descargando actualización...');
        autoUpdater.downloadUpdate();
      }
    });
  }

  // Progreso de descarga
  onDownloadProgress(progress) {
    const percent = Math.round(progress.percent);
    const message = `Descargando actualización: ${percent}%`;
    
    log.info(message);
    this.sendStatusToWindow(message, percent);
  }

  // Actualización descargada
  onUpdateDownloaded(info) {
    const message = `Versión ${info.version} descargada\n\nLa actualización se instalará al cerrar la aplicación.\n\n¿Reiniciar ahora?`;
    
    dialog.showMessageBox(this.mainWindow, {
      type: 'info',
      title: 'Actualización Lista',
      message: 'Actualización lista para instalar',
      detail: message,
      buttons: ['Reiniciar Ahora', 'Más Tarde'],
      defaultId: 0,
      cancelId: 1
    }).then(result => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall(false, true);
      }
    });
  }

  // Enviar estado a la ventana
  sendStatusToWindow(message, progress = null) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('update-status', {
        message,
        progress
      });
    }
  }
}

module.exports = Updater;
