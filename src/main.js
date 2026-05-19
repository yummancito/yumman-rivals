const { app, BrowserWindow, ipcMain, dialog, shell, protocol } = require('electron');
const path = require('path');
const fs = require('fs-extra');
const os = require('os');
const log = require('electron-log');
const { convertImageToSkybox, generatePreview } = require('./skyConverter');
const RbxStorageManager = require('./rbxStorageManager');
const AtmosphereManager = require('./atmosphereManager');
const Updater = require('./updater');
const ResourceDownloader = require('./resourceDownloader');

let mainWindow;
let updater;
let downloadWindow;
const rbxStorage = new RbxStorageManager();
const atmosphere = new AtmosphereManager();
const resourceDownloader = new ResourceDownloader();

// Configurar logging
log.transports.file.level = 'info';
log.info('App iniciada');

// Rutas de recursos empaquetados
// En producción, los recursos están en .asar.unpacked o en userData
const isPackaged = app.isPackaged;
let RESOURCES_PATH;

if (isPackaged) {
  // En producción: usar userData para recursos descargados
  RESOURCES_PATH = resourceDownloader.getResourcesPath();
  log.info('Modo empaquetado - Ruta de recursos:', RESOURCES_PATH);
} else {
  // En desarrollo: carpeta resources en la raíz del proyecto (no en src/)
  RESOURCES_PATH = path.join(__dirname, '..', 'resources');
  log.info('Modo desarrollo - Ruta de recursos:', RESOURCES_PATH);
}

// Getters dinámicos — siempre usan el RESOURCES_PATH actual
// (RESOURCES_PATH puede cambiar en checkAndDownloadResources)
function getSkyboxesPath() {
  return path.join(RESOURCES_PATH, 'skyboxes', 'all-skyboxes', 'ALL SKYBOXES');
}
function getTexturesPath() {
  return path.join(RESOURCES_PATH, 'textures', 'ruptic-dark', 'Ruptic Dark');
}
function getUiImagesPath() {
  return path.join(RESOURCES_PATH, 'ui-images');
}

// Mantener compatibilidad con código que usa las constantes directamente
// (se actualizan después de checkAndDownloadResources)
let SKYBOXES_PATH = getSkyboxesPath();
let TEXTURES_PATH = getTexturesPath();
let UI_IMAGES_PATH = getUiImagesPath();

// Log para debugging
console.log('RESOURCES_PATH inicial:', RESOURCES_PATH);
console.log('SKYBOXES_PATH inicial:', SKYBOXES_PATH);
console.log('TEXTURES_PATH inicial:', TEXTURES_PATH);
console.log('Skyboxes existen:', require('fs').existsSync(SKYBOXES_PATH));

// Rutas por defecto
const DEFAULT_PATHS = {
  roblox: path.join(os.homedir(), 'AppData', 'Local', 'Roblox', 'Versions'),
  fishstrap: path.join(os.homedir(), 'AppData', 'Local', 'Fishstrap', 'Versions'),
  fishtrap: path.join(os.homedir(), 'AppData', 'Local', 'Fishstrap', 'Versions'), // Alias
  bloxtrap: path.join(os.homedir(), 'AppData', 'Local', 'Bloxtrap', 'Versions'),
  // Carpeta propia de YUMMAN RIVALS — aquí se guardan texturas y versiones
  yumman: path.join(os.homedir(), 'AppData', 'Local', 'YUMMAN RIVALS', 'Versions'),
  texturesBackup: path.join(app.getPath('userData'), 'backup'),
  customSkybox: path.join(app.getPath('userData'), 'custom_skybox'),
  previews: path.join(app.getPath('userData'), 'previews'),
  // Recursos empaquetados
  resources: RESOURCES_PATH,
  skyboxes: SKYBOXES_PATH,
  textures: TEXTURES_PATH,
  uiImages: UI_IMAGES_PATH
};

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 580,
    height: 280,
    minWidth: 580,
    minHeight: 280,
    resizable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false
    },
    autoHideMenuBar: true,
    icon: path.join(__dirname, '..', 'icon.ico'),
    backgroundColor: '#1D1B17',
    title: 'YUMMAN RIVALS',
    frame: true,
    center: true,
  });

  // Desarrollo: cargar Next.js dev server
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    // Producción: usar nueva interfaz
    let uiPath;
    
    if (app.isPackaged) {
      // En producción empaquetada, la UI está en el ASAR
      uiPath = path.join(__dirname, '..', 'ui', 'out', 'index.html');
    } else {
      // En desarrollo
      uiPath = path.join(__dirname, '..', 'ui', 'out', 'index.html');
    }
    
    console.log('Cargando interfaz desde:', uiPath);
    console.log('Archivo existe:', fs.existsSync(uiPath));
    
    if (fs.existsSync(uiPath)) {
      mainWindow.loadFile(uiPath);
    } else {
      console.error('No se encontró la interfaz en:', uiPath);
      mainWindow.loadURL('data:text/html,<h1 style="color:white;font-family:sans-serif;text-align:center;margin-top:100px;">Error: No se encontró la interfaz<br><small>Ruta: ' + uiPath + '</small></h1>');
    }
  }
  
  // NO abrir DevTools en producción
  // mainWindow.webContents.openDevTools();
  
  // Abrir enlaces externos en el navegador, no en Electron
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// Crear ventana de descarga de recursos
function createDownloadWindow() {
  downloadWindow = new BrowserWindow({
    width: 500,
    height: 300,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    autoHideMenuBar: true,
    resizable: false,
    frame: false,
    icon: path.join(__dirname, '..', 'icon.ico'),
    backgroundColor: '#0a0a0f',
    title: 'Descargando Recursos'
  });

  // Crear HTML simple para la ventana de descarga
  const downloadHTML = `
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
        window.electronAPI.onDownloadProgress((data) => {
          document.getElementById('status').textContent = data.status;
          if (data.progress !== null) {
            document.getElementById('progress').style.width = data.progress + '%';
          }
        });
      </script>
    </body>
    </html>
  `;

  downloadWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(downloadHTML));
  
  return downloadWindow;
}

// Verificar y descargar recursos si es necesario
async function checkAndDownloadResources() {
  try {
    log.info('Verificando recursos...');
    
    // PRIMERO: Intentar usar recursos locales (carpeta resources/ en la raíz)
    const localResourcesPath = path.join(__dirname, '..', 'resources');
    const localSkyboxes = path.join(localResourcesPath, 'skyboxes');
    const localTextures = path.join(localResourcesPath, 'textures');
    
    if (fs.existsSync(localSkyboxes) && fs.existsSync(localTextures)) {
      log.info('✓ Usando recursos locales de la carpeta resources/');
      // Actualizar rutas para usar recursos locales
      RESOURCES_PATH = localResourcesPath;
      SKYBOXES_PATH = getSkyboxesPath();
      TEXTURES_PATH = getTexturesPath();
      UI_IMAGES_PATH = getUiImagesPath();
      DEFAULT_PATHS.resources = RESOURCES_PATH;
      DEFAULT_PATHS.skyboxes = SKYBOXES_PATH;
      DEFAULT_PATHS.textures = TEXTURES_PATH;
      DEFAULT_PATHS.uiImages = UI_IMAGES_PATH;
      log.info('SKYBOXES_PATH actualizado:', SKYBOXES_PATH);
      log.info('TEXTURES_PATH actualizado:', TEXTURES_PATH);
      return true;
    }
    
    log.info('Recursos locales no encontrados, verificando recursos descargados...');
    
    // SEGUNDO: Si no hay recursos locales, verificar recursos descargados
    const hasResources = await resourceDownloader.checkResources();
    
    if (hasResources) {
      log.info('✓ Usando recursos descargados previamente');
      return true;
    }
    
    // TERCERO: Si no hay recursos, descargar desde GitHub (SOLO EN PRODUCCIÓN)
    if (!app.isPackaged) {
      log.warn('Modo desarrollo: No hay recursos locales ni descargados');
      log.warn('Continuando sin recursos (algunas funciones no estarán disponibles)');
      return true; // Continuar de todos modos en desarrollo
    }
    
    log.info('Recursos no encontrados, iniciando descarga desde GitHub...');
    
    // Declarar dlWindow FUERA del try para que sea accesible en el catch externo
    let dlWindow = null;
    
    // Crear ventana de descarga
    dlWindow = createDownloadWindow();
    
    // Timeout de 5 minutos para la descarga (el ZIP es ~272 MB)
    const downloadTimeout = setTimeout(() => {
      log.error('Timeout: La descarga tardó demasiado');
      if (dlWindow && !dlWindow.isDestroyed()) {
        dlWindow.close();
      }
    }, 300000);
    
    try {
      // Descargar recursos
      await resourceDownloader.downloadResources(
        (progress) => {
          // Enviar progreso
          if (dlWindow && !dlWindow.isDestroyed()) {
            dlWindow.webContents.send('download-progress', {
              progress,
              status: null
            });
          }
        },
        (status) => {
          // Enviar estado
          if (dlWindow && !dlWindow.isDestroyed()) {
            dlWindow.webContents.send('download-progress', {
              progress: null,
              status
            });
          }
        }
      );
      
      clearTimeout(downloadTimeout);
      log.info('Recursos descargados correctamente');
      
      // Cerrar ventana de descarga
      if (dlWindow && !dlWindow.isDestroyed()) {
        dlWindow.close();
      }
      
      // Actualizar rutas de recursos
      RESOURCES_PATH = resourceDownloader.getResourcesPath();
      SKYBOXES_PATH = getSkyboxesPath();
      TEXTURES_PATH = getTexturesPath();
      UI_IMAGES_PATH = getUiImagesPath();
      DEFAULT_PATHS.resources = RESOURCES_PATH;
      DEFAULT_PATHS.skyboxes = SKYBOXES_PATH;
      DEFAULT_PATHS.textures = TEXTURES_PATH;
      DEFAULT_PATHS.uiImages = UI_IMAGES_PATH;
      log.info('SKYBOXES_PATH (descargado):', SKYBOXES_PATH);
      
      return true;
    } catch (downloadError) {
      clearTimeout(downloadTimeout);
      throw downloadError;
    }
  } catch (error) {
    log.error('Error descargando recursos:', error);
    
    // Cerrar ventana de descarga si existe
    try {
      if (dlWindow && !dlWindow.isDestroyed()) {
        dlWindow.close();
      }
    } catch (e) { /* ignorar */ }
    
    // Mostrar diálogo con opciones
    const result = await dialog.showMessageBox({
      type: 'error',
      title: 'Error al Descargar Recursos',
      message: 'No se pudieron descargar los recursos necesarios',
      detail: `Error: ${error.message}\n\nLos recursos (skyboxes y texturas) son necesarios para usar la aplicación.\n\n¿Qué deseas hacer?`,
      buttons: ['Reintentar', 'Continuar sin Recursos', 'Salir'],
      defaultId: 0,
      cancelId: 2
    });
    
    if (result.response === 0) {
      // Reintentar
      log.info('Usuario eligió reintentar descarga');
      return await checkAndDownloadResources();
    } else if (result.response === 1) {
      // Continuar sin recursos (modo desarrollo)
      log.warn('Usuario eligió continuar sin recursos');
      dialog.showMessageBox({
        type: 'warning',
        title: 'Modo Sin Recursos',
        message: 'La aplicación continuará sin recursos',
        detail: 'Algunas funciones no estarán disponibles:\n\n' +
                '- No se podrán aplicar skyboxes\n' +
                '- No se podrán aplicar texturas Ruptic Dark\n' +
                '- Las previews no estarán disponibles\n\n' +
                'Puedes descargar los recursos manualmente desde:\n' +
                'https://github.com/mmgb5656/yumman-rivals/releases'
      });
      return true; // Continuar de todos modos
    } else {
      // Salir
      return false;
    }
  }
}

app.whenReady().then(async () => {
  // Verificar y descargar recursos si es necesario
  const resourcesReady = await checkAndDownloadResources();
  
  if (!resourcesReady) {
    app.quit();
    return;
  }
  
  // Crear ventana principal
  createWindow();
  
  // Inicializar auto-updater
  updater = new Updater(mainWindow);
  updater.startAutoCheck();
});

app.on('window-all-closed', () => {
  // Detener verificación automática
  if (updater) {
    updater.stopAutoCheck();
  }
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC Handlers

// Obtener rutas por defecto
ipcMain.handle('get-default-paths', () => {
  return DEFAULT_PATHS;
});

// Seleccionar carpeta
ipcMain.handle('select-folder', async (event, title) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: title || 'Seleccionar carpeta'
  });
  
  return result.canceled ? null : result.filePaths[0];
});

// Verificar si Roblox está instalado
ipcMain.handle('verify-roblox-path', async (event, robloxPath) => {
  try {
    if (!fs.existsSync(robloxPath)) {
      return { valid: false, message: 'La ruta no existe' };
    }
    
    // Buscar la carpeta de versión más reciente (por fecha de modificación)
    const versions = fs.readdirSync(robloxPath)
      .filter(f => f.startsWith('version-'))
      .map(f => ({
        name: f,
        path: path.join(robloxPath, f),
        mtime: fs.statSync(path.join(robloxPath, f)).mtime
      }))
      .sort((a, b) => b.mtime - a.mtime); // Ordenar por fecha más reciente primero
    
    if (versions.length === 0) {
      return { valid: false, message: 'No se encontraron versiones de Roblox' };
    }
    
    const latestVersion = versions[0].name;
    const contentPath = path.join(robloxPath, latestVersion, 'PlatformContent', 'pc', 'textures');
    
    console.log('Versiones encontradas:', versions.map(v => v.name));
    console.log('Versión más reciente (por fecha):', latestVersion);
    console.log('Ruta de texturas:', contentPath);
    
    if (!fs.existsSync(contentPath)) {
      return { valid: false, message: 'No se encontró la carpeta de texturas' };
    }
    
    return { 
      valid: true, 
      message: 'Roblox encontrado correctamente',
      texturePath: contentPath,
      version: latestVersion
    };
  } catch (error) {
    return { valid: false, message: error.message };
  }
});

// Crear backup de texturas originales
ipcMain.handle('create-backup', async (event, texturePath) => {
  try {
    const backupPath = DEFAULT_PATHS.texturesBackup;
    
    // Si ya existe backup, no hacer nada
    if (fs.existsSync(backupPath) && fs.readdirSync(backupPath).length > 0) {
      return { success: true, message: 'Backup ya existe' };
    }
    
    await fs.ensureDir(backupPath);
    await fs.copy(texturePath, backupPath);
    
    return { success: true, message: 'Backup creado correctamente' };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

async function ensureTexturesBackup(texturePath) {
  const backupPath = DEFAULT_PATHS.texturesBackup;
  try {
    if (fs.existsSync(backupPath) && fs.readdirSync(backupPath).length > 0) {
      return { success: true, created: false };
    }
    if (!texturePath || !fs.existsSync(texturePath)) {
      return { success: false, created: false, message: `Ruta de texturas no válida: ${texturePath}` };
    }
    await fs.ensureDir(backupPath);
    await fs.copy(texturePath, backupPath);
    return { success: true, created: true };
  } catch (error) {
    return { success: false, created: false, message: error.message };
  }
}

// Aplicar texturas negras
ipcMain.handle('apply-black-textures', async (event, texturePath) => {
  try {
    console.log('=== APLICANDO TEXTURAS NEGRAS ===');
    
    if (!texturePath || !fs.existsSync(texturePath)) {
      return { success: false, message: `Ruta de texturas no válida: ${texturePath}` };
    }

    const backupResult = await ensureTexturesBackup(texturePath);
    if (!backupResult.success) {
      return { success: false, message: `No se pudo crear backup: ${backupResult.message}` };
    }

    const ruptikDarkPath = TEXTURES_PATH;
    if (!fs.existsSync(ruptikDarkPath)) {
      return { success: false, message: 'No se encontró la carpeta de texturas Ruptic Dark' };
    }
    
    const { exec } = require('child_process');
    const items = fs.readdirSync(ruptikDarkPath);
    let copiedCount = 0;
    
    for (const item of items) {
      const sourcePath = path.join(ruptikDarkPath, item);
      const destPath = path.join(texturePath, item);
      try {
        // Remove read-only recursively first
        await new Promise(resolve => exec(`attrib -R "${destPath}" /S /D`, () => resolve()));
        await fs.copy(sourcePath, destPath, { overwrite: true });
        copiedCount++;
        // Re-protect
        await new Promise(resolve => exec(`attrib +R "${destPath}" /S /D`, () => resolve()));
      } catch (error) {
        log.warn(`Error copiando ${item}:`, error.message);
      }
    }
    
    log.info(`Texturas negras aplicadas: ${copiedCount}/${items.length}`);

    try {
      const existing = fs.existsSync(APP_CONFIG_PATH)
        ? JSON.parse(await fs.readFile(APP_CONFIG_PATH, 'utf8').catch(() => '{}'))
        : {};
      await fs.ensureDir(YUMMAN_RIVALS_PATH);
      await fs.writeFile(APP_CONFIG_PATH, JSON.stringify({ ...existing, darkOn: true, potatoTexOn: false }, null, 2), 'utf8');
    } catch (e) { log.warn('No se pudo persistir darkOn:', e.message); }

    return { success: true, message: `Texturas negras aplicadas: ${copiedCount} items` };
  } catch (error) {
    log.error('Error apply-black-textures:', error);
    return { success: false, message: error.message };
  }
});

// Aplicar texturas oscuras (wrapper que maneja enabled/disabled)
ipcMain.handle('apply-dark-textures', async (event, enabled, texturePath) => {
  try {
    console.log('=== APLICANDO/DESACTIVANDO TEXTURAS OSCURAS ===');
    console.log('Enabled:', enabled);
    console.log('Texture Path:', texturePath);
    
    if (enabled) {
      // Aplicar texturas oscuras (reutilizar lógica de apply-black-textures)
      if (!texturePath || !fs.existsSync(texturePath)) {
        return { success: false, message: `Ruta de texturas no válida: ${texturePath}` };
      }

      const backupResult = await ensureTexturesBackup(texturePath);
      if (!backupResult.success) {
        return { success: false, message: `No se pudo crear backup: ${backupResult.message}` };
      }

      const ruptikDarkPath = TEXTURES_PATH;
      if (!fs.existsSync(ruptikDarkPath)) {
        return { success: false, message: 'No se encontró la carpeta de texturas Ruptic Dark' };
      }
      
      const { exec } = require('child_process');
      const items = fs.readdirSync(ruptikDarkPath);
      let copiedCount = 0;
      
      for (const item of items) {
        // ✅ SKIP: No copiar la carpeta sky (los cielos se aplican por separado)
        if (item === 'sky') {
          log.info('Saltando carpeta sky (los cielos se aplican por separado)');
          continue;
        }
        
        const sourcePath = path.join(ruptikDarkPath, item);
        const destPath = path.join(texturePath, item);
        try {
          // Remove read-only recursively first
          await new Promise(resolve => exec(`attrib -R "${destPath}" /S /D`, () => resolve()));
          await fs.copy(sourcePath, destPath, { overwrite: true });
          copiedCount++;
          // Re-protect
          await new Promise(resolve => exec(`attrib +R "${destPath}" /S /D`, () => resolve()));
        } catch (error) {
          log.warn(`Error copiando ${item}:`, error.message);
        }
      }
      
      log.info(`Texturas oscuras aplicadas: ${copiedCount}/${items.length}`);
      
      // ✅ PERSISTIR ESTADO ACTIVADO
      try {
        const existing = fs.existsSync(APP_CONFIG_PATH)
          ? JSON.parse(await fs.readFile(APP_CONFIG_PATH, 'utf8').catch(() => '{}'))
          : {};
        await fs.ensureDir(YUMMAN_RIVALS_PATH);
        await fs.writeFile(APP_CONFIG_PATH, JSON.stringify({ 
          ...existing, 
          darkOn: true, 
          potatoTexOn: false 
        }, null, 2), 'utf8');
        log.info('Estado darkOn=true persistido');
      } catch (e) { 
        log.warn('No se pudo persistir darkOn:', e.message); 
      }
      
      return { success: true, message: `Texturas oscuras aplicadas: ${copiedCount} items` };
    } else {
      // Desactivar texturas oscuras (restaurar originales)
      const backupPath = DEFAULT_PATHS.texturesBackup;
      
      if (!fs.existsSync(backupPath)) {
        return { success: false, message: 'No se encontró backup de texturas originales' };
      }

      const { exec } = require('child_process');
      await new Promise(resolve => exec(`attrib -R "${texturePath}" /S /D`, () => resolve()));
      await fs.copy(backupPath, texturePath, { overwrite: true });
      
      log.info('Texturas originales restauradas');
      
      // ✅ PERSISTIR ESTADO DESACTIVADO
      try {
        const existing = fs.existsSync(APP_CONFIG_PATH)
          ? JSON.parse(await fs.readFile(APP_CONFIG_PATH, 'utf8').catch(() => '{}'))
          : {};
        await fs.ensureDir(YUMMAN_RIVALS_PATH);
        await fs.writeFile(APP_CONFIG_PATH, JSON.stringify({ 
          ...existing, 
          darkOn: false, 
          potatoTexOn: false 
        }, null, 2), 'utf8');
        log.info('Estado darkOn=false persistido');
      } catch (e) { 
        log.warn('No se pudo persistir darkOn=false:', e.message); 
      }
      
      return { success: true, message: 'Texturas originales restauradas' };
    }
  } catch (error) {
    log.error('Error apply-dark-textures:', error);
    return { success: false, message: error.message };
  }
});

// Aplicar cielo oscuro (intenta rbx-storage primero, luego método tradicional)
ipcMain.handle('apply-dark-sky', async (event, texturePath) => {
  try {
    const darkSkySource = path.join(TEXTURES_PATH, 'sky');
    
    if (!fs.existsSync(darkSkySource)) {
      return { success: false, message: 'No se encontraron texturas de cielo oscuro' };
    }
    
    // Intentar método rbx-storage primero (más rápido)
    const rbxResult = await rbxStorage.applySkybox(darkSkySource);
    
    if (rbxResult.success) {
      return {
        success: true,
        message: 'Cielo oscuro aplicado (método rápido)',
        method: 'rbx-storage'
      };
    }
    
    // Si falla, usar método tradicional
    const skyPath = path.join(texturePath, 'sky');
    await fs.ensureDir(skyPath);
    await fs.copy(darkSkySource, skyPath, { overwrite: true });
    
    return {
      success: true,
      message: 'Cielo oscuro aplicado (método tradicional)',
      method: 'traditional'
    };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

// Restaurar texturas originales
ipcMain.handle('restore-original', async (event, texturePath) => {
  try {
    const backupPath = DEFAULT_PATHS.texturesBackup;
    
    if (!fs.existsSync(backupPath)) {
      try {
        const { spawn } = require('child_process');
        const installerPaths = [
          path.join(RESOURCES_PATH, 'RobloxPlayerInstaller.exe'),
          path.join(__dirname, '..', 'resources', 'RobloxPlayerInstaller.exe'),
          path.join(process.resourcesPath || '', 'resources', 'RobloxPlayerInstaller.exe'),
        ];
        let installerPath = null;
        for (const p of installerPaths) {
          if (fs.existsSync(p)) { installerPath = p; break; }
        }
        if (installerPath) {
          spawn(installerPath, ['/silent'], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
          try {
            const existing = fs.existsSync(APP_CONFIG_PATH)
              ? JSON.parse(await fs.readFile(APP_CONFIG_PATH, 'utf8').catch(() => '{}'))
              : {};
            await fs.ensureDir(YUMMAN_RIVALS_PATH);
            await fs.writeFile(APP_CONFIG_PATH, JSON.stringify({ ...existing, darkOn: false, potatoTexOn: false, potatoOn: false }, null, 2), 'utf8');
          } catch (e) {}
          return { success: true, message: 'Restauración iniciada. Roblox se reinstalará para volver a fábrica.' };
        }
      } catch (e) {}
      return { success: false, message: 'No se encontró backup de texturas originales y no se pudo iniciar el instalador de Roblox.' };
    }

    const { exec } = require('child_process');
    await new Promise(resolve => exec(`attrib -R "${texturePath}" /S /D`, () => resolve()));
    await fs.copy(backupPath, texturePath, { overwrite: true });

    try {
      const existing = fs.existsSync(APP_CONFIG_PATH)
        ? JSON.parse(await fs.readFile(APP_CONFIG_PATH, 'utf8').catch(() => '{}'))
        : {};
      await fs.ensureDir(YUMMAN_RIVALS_PATH);
      await fs.writeFile(APP_CONFIG_PATH, JSON.stringify({ ...existing, darkOn: false, potatoTexOn: false, potatoOn: false }, null, 2), 'utf8');
    } catch (e) {}
    
    return { success: true, message: 'Texturas originales restauradas' };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

// Aplicar preset personalizado
ipcMain.handle('apply-custom-preset', async (event, presetName, texturePath) => {
  try {
    // Buscar el preset en RESOURCES_PATH/presets/<nombre>/
    const presetPath = path.join(RESOURCES_PATH, 'presets', presetName);
    
    if (!fs.existsSync(presetPath)) {
      return { success: false, message: `Preset "${presetName}" no encontrado en ${presetPath}` };
    }
    
    const folders = fs.readdirSync(presetPath);
    
    for (const folder of folders) {
      const src = path.join(presetPath, folder);
      const dest = path.join(texturePath, folder);
      
      if (fs.statSync(src).isDirectory()) {
        await fs.copy(src, dest, { overwrite: true });
      }
    }
    
    return { success: true, message: `Preset "${presetName}" aplicado` };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

// Obtener lista de presets disponibles
ipcMain.handle('get-available-presets', async () => {
  try {
    const presetsDir = path.join(RESOURCES_PATH, 'presets');
    if (!fs.existsSync(presetsDir)) {
      return { success: true, presets: [] };
    }
    
    const presets = fs.readdirSync(presetsDir).filter(item => {
      return fs.statSync(path.join(presetsDir, item)).isDirectory();
    });
    
    return { success: true, presets };
  } catch (error) {
    return { success: false, presets: [], message: error.message };
  }
});

// Seleccionar imagen para skybox personalizado
ipcMain.handle('select-sky-image', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    title: 'Seleccionar imagen para el cielo',
    filters: [
      { name: 'Imágenes', extensions: ['jpg', 'jpeg', 'png', 'bmp'] }
    ]
  });
  
  if (result.canceled) {
    return { success: false, message: 'Selección cancelada' };
  }
  
  const imagePath = result.filePaths[0];
  
  // Generar preview
  await fs.ensureDir(DEFAULT_PATHS.previews);
  const previewPath = path.join(DEFAULT_PATHS.previews, 'current_preview.png');
  const previewResult = await generatePreview(imagePath, previewPath);
  
  if (!previewResult.success) {
    return { success: false, message: 'Error al generar preview' };
  }
  
  return {
    success: true,
    imagePath: imagePath,
    previewPath: previewPath,
    message: 'Imagen cargada correctamente'
  };
});

// Aplicar skybox personalizado (intenta rbx-storage primero)
ipcMain.handle('apply-custom-sky', async (event, imagePath, texturePath) => {
  try {
    // Convertir imagen a skybox
    await fs.ensureDir(DEFAULT_PATHS.customSkybox);
    const conversionResult = await convertImageToSkybox(imagePath, DEFAULT_PATHS.customSkybox);
    
    if (!conversionResult.success) {
      return conversionResult;
    }
    
    // Intentar método rbx-storage primero
    const rbxResult = await rbxStorage.applySkybox(DEFAULT_PATHS.customSkybox);
    
    if (rbxResult.success) {
      return {
        success: true,
        message: 'Cielo personalizado aplicado (método rápido)',
        method: 'rbx-storage'
      };
    }
    
    // Si falla, usar método tradicional
    const skyPath = path.join(texturePath, 'sky');
    await fs.copy(DEFAULT_PATHS.customSkybox, skyPath, { overwrite: true });
    
    return {
      success: true,
      message: 'Cielo personalizado aplicado (método tradicional)',
      method: 'traditional'
    };
    
  } catch (error) {
    return { success: false, message: error.message };
  }
});

// Obtener ruta de preview
ipcMain.handle('get-preview-path', async () => {
  const previewPath = path.join(DEFAULT_PATHS.previews, 'current_preview.png');
  
  if (fs.existsSync(previewPath)) {
    return { success: true, path: previewPath };
  }
  
  return { success: false, path: null };
});

// Detectar ejecutores disponibles
ipcMain.handle('detect-executors', async () => {
  const executors = [];
  
  console.log('=== DETECTANDO EJECUTORES ===');
  
  // Verificar YUMMAN RIVALS
  if (fs.existsSync(DEFAULT_PATHS.yumman)) {
    const versions = fs.readdirSync(DEFAULT_PATHS.yumman)
      .filter(f => f.startsWith('version-'));
    if (versions.length > 0) {
      console.log(`✓ YUMMAN RIVALS encontrado: ${versions.length} versiones`);
      executors.push({
        id: 'yumman',
        name: 'YUMMAN RIVALS',
        path: DEFAULT_PATHS.yumman,
        found: true
      });
    }
  }

  // Verificar Roblox normal
  if (fs.existsSync(DEFAULT_PATHS.roblox)) {
    const versions = fs.readdirSync(DEFAULT_PATHS.roblox)
      .filter(f => f.startsWith('version-'));
    if (versions.length > 0) {
      console.log(`✓ Roblox Normal encontrado: ${versions.length} versiones`);
      executors.push({
        id: 'roblox',
        name: 'Roblox Normal',
        path: DEFAULT_PATHS.roblox,
        found: true
      });
    }
  }
  
  // Verificar Fishstrap/Fishtrap
  if (fs.existsSync(DEFAULT_PATHS.fishstrap)) {
    const versions = fs.readdirSync(DEFAULT_PATHS.fishstrap)
      .filter(f => f.startsWith('version-'));
    if (versions.length > 0) {
      console.log(`✓ Fishstrap encontrado: ${versions.length} versiones`);
      executors.push({
        id: 'fishtrap',
        name: 'Fishtrap',
        path: DEFAULT_PATHS.fishstrap,
        found: true
      });
    }
  }
  
  // Verificar Bloxtrap
  if (fs.existsSync(DEFAULT_PATHS.bloxtrap)) {
    const versions = fs.readdirSync(DEFAULT_PATHS.bloxtrap)
      .filter(f => f.startsWith('version-'));
    if (versions.length > 0) {
      console.log(`✓ Bloxtrap encontrado: ${versions.length} versiones`);
      executors.push({
        id: 'bloxtrap',
        name: 'Bloxtrap',
        path: DEFAULT_PATHS.bloxtrap,
        found: true
      });
    }
  }
  
  console.log(`Total ejecutores encontrados: ${executors.length}`);
  
  return { success: true, executors };
});

// Obtener ruta de texturas según el ejecutor seleccionado
ipcMain.handle('get-executor-texture-path', async (event, executorId, customPath = null) => {
  try {
    console.log('=== OBTENIENDO RUTA DE TEXTURAS ===');
    console.log('Ejecutor:', executorId);
    console.log('Ruta personalizada:', customPath);
    
    let basePath;
    
    // Si hay ruta personalizada, usarla
    if (customPath && executorId === 'other') {
      basePath = customPath;
    } else {
      // Usar ruta predefinida según el ejecutor
      basePath = DEFAULT_PATHS[executorId] || DEFAULT_PATHS.roblox;
    }
    
    console.log('Ruta base:', basePath);
    
    if (!fs.existsSync(basePath)) {
      return { 
        valid: false, 
        message: `No se encontró la carpeta del ejecutor: ${basePath}` 
      };
    }
    
    // Buscar la versión más reciente (por fecha de modificación)
    const versions = fs.readdirSync(basePath)
      .filter(f => f.startsWith('version-'))
      .map(f => ({
        name: f,
        path: path.join(basePath, f),
        mtime: fs.statSync(path.join(basePath, f)).mtime
      }))
      .sort((a, b) => b.mtime - a.mtime); // Ordenar por fecha más reciente primero
    
    if (versions.length === 0) {
      return { 
        valid: false, 
        message: 'No se encontraron versiones en la carpeta' 
      };
    }
    
    const latestVersion = versions[0].name;
    const texturePath = path.join(basePath, latestVersion, 'PlatformContent', 'pc', 'textures');
    
    console.log('Versión más reciente:', latestVersion);
    console.log('Ruta de texturas:', texturePath);
    
    if (!fs.existsSync(texturePath)) {
      return { 
        valid: false, 
        message: 'No se encontró la carpeta de texturas' 
      };
    }
    
    return { 
      valid: true, 
      message: `${executorId} encontrado correctamente`,
      texturePath: texturePath,
      version: latestVersion,
      executor: executorId
    };
  } catch (error) {
    console.error('Error al obtener ruta de texturas:', error);
    return { 
      valid: false, 
      message: error.message 
    };
  }
});

// Abrir enlace de donación
ipcMain.handle('open-donation-link', async () => {
  // Reemplazar con tu enlace de donación (PayPal, Ko-fi, etc.)
  const donationUrl = 'https://ko-fi.com/yumman'; // Cambiar por tu URL
  await shell.openExternal(donationUrl);
  return { success: true };
});

// Función auxiliar para aplicar skybox en una ruta específica
// Función para copiar assets al rbx-storage (equivalente al move.bat)
async function applyRbxStorageAssets() {
  try {
    console.log('=== EJECUTANDO MOVE-SILENT.BAT (SKYFIX) ===');
    log.info('=== EJECUTANDO MOVE-SILENT.BAT (SKYFIX) ===');
    
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    // Buscar el bat en múltiples ubicaciones
    const possibleBatPaths = [
      path.join(app.getPath('userData'), 'resources', 'move-silent.bat'),
      path.join(RESOURCES_PATH, 'move-silent.bat'),
      path.join(__dirname, 'resources', 'move-silent.bat'),
      path.join(process.resourcesPath, 'app.asar.unpacked', 'resources', 'move-silent.bat'),
    ];

    let batPath = null;
    for (const p of possibleBatPaths) {
      console.log('Verificando bat en:', p, '- Existe:', fs.existsSync(p));
      if (fs.existsSync(p)) {
        batPath = p;
        console.log('✓ Bat encontrado en:', batPath);
        log.info('✓ Bat encontrado en:', batPath);
        break;
      }
    }

    if (!batPath) {
      console.error('❌ move-silent.bat NO ENCONTRADO');
      log.warn('move-silent.bat no encontrado');
      return { success: false, message: 'move-silent.bat no encontrado' };
    }

    // Ejecutar el bat silenciosamente
    console.log('Ejecutando bat silenciosamente...');
    const batDir = path.dirname(batPath);
    await execAsync(`"${batPath}"`, { 
      shell: 'cmd.exe',
      windowsHide: true,
      cwd: batDir
    });
    
    console.log('✓ move-silent.bat ejecutado correctamente');
    log.info('✓ move-silent.bat ejecutado correctamente');
    
    return { success: true, message: 'Skyfix aplicado correctamente' };
    
  } catch (error) {
    console.error('❌ Error ejecutando move-silent.bat:', error);
    log.error('Error ejecutando move-silent.bat:', error);
    return { success: false, message: error.message };
  }
}

async function applySkyboxToPath(skyboxPath, texFiles, texturePath) {
  const { exec } = require('child_process');
  const skyPath = path.join(texturePath, 'sky');
  
  try {
    log.info(`Aplicando skybox a ruta: ${skyPath}`);
    
    // Crear carpeta sky
    await fs.ensureDir(skyPath);
    log.info(`Carpeta sky creada/verificada: ${skyPath}`);
    
    // Quitar protección de la carpeta sky completa
    await new Promise((resolve) => {
      exec(`attrib -R "${skyPath}" /S /D`, () => resolve());
    });
    
    // Copiar archivos .tex
    let copiedCount = 0;
    let failedFiles = [];
    for (const file of texFiles) {
      const src = path.join(skyboxPath, file);
      const dest = path.join(skyPath, file);
      
      try {
        await fs.copy(src, dest, { overwrite: true });
        copiedCount++;
      } catch (error) {
        log.warn(`Error copiando ${file}:`, error.message);
        failedFiles.push(file);
      }
    }
    
    if (failedFiles.length > 0) {
      log.warn(`Archivos fallidos: ${failedFiles.join(', ')}`);
    }
    
    log.info(`Archivos copiados: ${copiedCount}/${texFiles.length}`);
    
    // Proteger toda la carpeta sky recursivamente
    await new Promise((resolve) => {
      exec(`attrib +R "${skyPath}" /S /D`, (error) => {
        if (error) {
          log.warn('Advertencia: no se pudo proteger la carpeta sky:', error.message);
        }
        resolve(); // No es crítico si falla la protección
      });
    });
    
    // ✅ VALIDACIÓN: Si todos los archivos fallaron, considerar error
    if (copiedCount === 0) {
      return {
        success: false,
        message: 'No se pudo copiar ningún archivo .tex. Verifica que los archivos no estén corruptos.'
      };
    }
    
    // ✅ VALIDACIÓN: Si faltan archivos críticos, advertir
    if (copiedCount < 6) {
      log.warn(`⚠️ Skybox incompleto: solo ${copiedCount}/6 archivos copiados`);
    }
    
    return {
      success: true,
      filesApplied: copiedCount,
      failedFiles: failedFiles.length > 0 ? failedFiles : undefined,
      complete: copiedCount === 6
    };
  } catch (error) {
    log.error('Error en applySkyboxToPath:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

// Aplicar skybox por nombre de carpeta
ipcMain.handle('apply-skybox-by-name', async (event, skyboxName, texturePath) => {
  try {
    console.log('=== APLICANDO SKYBOX ===');
    console.log('Nombre del skybox:', skyboxName);
    console.log('Ruta de texturas:', texturePath);
    
    const skyboxPath = path.join(SKYBOXES_PATH, skyboxName);
    console.log('Ruta del skybox:', skyboxPath);
    console.log('Skybox existe:', fs.existsSync(skyboxPath));
    
    if (!fs.existsSync(skyboxPath)) {
      return { 
        success: false, 
        message: `Skybox "${skyboxName}" no encontrado en: ${skyboxPath}` 
      };
    }
    
    // Listar todos los archivos en el skybox
    const allFiles = fs.readdirSync(skyboxPath);
    console.log('Archivos en skybox:', allFiles);
    
    // Filtrar: copiar solo archivos .tex
    const texFiles = allFiles.filter(f => f.endsWith('.tex'));
    
    console.log('Archivos .tex a copiar:', texFiles);
    
    if (texFiles.length === 0) {
      return {
        success: false,
        message: `No se encontraron archivos .tex en ${skyboxName}`
      };
    }

    // =====================================================
    // PASO 1: Aplicar via rbx-storage (método principal)
    // Equivalente al move.bat - copia los .tex como hashes
    // al rbx-storage de Roblox
    // =====================================================
    log.info('Aplicando via rbx-storage...');
    const rbxResult = await rbxStorage.applySkyboxFromTexFiles(skyboxPath);
    log.info('Resultado rbx-storage:', rbxResult);

    if (!rbxResult.success) {
      log.warn('rbx-storage falló, usando método tradicional como fallback');
      log.warn('Error rbx-storage:', rbxResult.message);
    } else {
      log.info('✓ rbx-storage aplicado correctamente');
    }

    // =====================================================
    // PASO 2: Copiar assets fijos al rbx-storage
    // Estos son los archivos del move.bat original
    // =====================================================
    log.info('Aplicando assets fijos al rbx-storage...');
    await applyRbxStorageAssets();
    
    // DETECTAR SI HAY MÚLTIPLES VERSIONES Y APLICAR EN TODAS
    // Extraer el ejecutor de la ruta (Roblox, Fishstrap, Bloxtrap)
    const pathParts = texturePath.split(path.sep);
    const versionsIndex = pathParts.indexOf('Versions');
    
    let totalVersionsApplied = 0;
    let versionsWithSky = [];
    
    if (versionsIndex !== -1) {
      // Obtener la ruta base hasta "Versions"
      const basePath = pathParts.slice(0, versionsIndex + 1).join(path.sep);
      console.log('Ruta base de versiones:', basePath);
      
      // Buscar TODAS las versiones
      const allVersions = fs.readdirSync(basePath)
        .filter(f => f.startsWith('version-'))
        .map(f => ({
          name: f,
          path: path.join(basePath, f, 'PlatformContent', 'pc', 'textures'),
          mtime: fs.statSync(path.join(basePath, f)).mtime
        }))
        .sort((a, b) => b.mtime - a.mtime);
      
      console.log(`✓ Encontradas ${allVersions.length} versiones`);
      
      // Aplicar en TODAS las versiones
      let failedVersions = [];
      for (const version of allVersions) {
        if (fs.existsSync(version.path)) {
          console.log(`Aplicando en ${version.name}...`);
          const result = await applySkyboxToPath(skyboxPath, texFiles, version.path);
          if (result.success) {
            totalVersionsApplied++;
            versionsWithSky.push(version.name);
            // ✅ Verificar si el skybox está completo
            if (!result.complete) {
              log.warn(`⚠️ Skybox incompleto en ${version.name}: ${result.filesApplied}/6 archivos`);
            }
          } else {
            failedVersions.push(version.name);
            log.error(`❌ Error aplicando skybox en ${version.name}: ${result.message}`);
          }
        }
      }

      // Aplicar assets al rbx-storage (equivalente al move.bat)
      // Ya se hizo arriba, no repetir
      
      // ✅ Persistir el skybox seleccionado
      try {
        const existing = fs.existsSync(APP_CONFIG_PATH)
          ? JSON.parse(await fs.readFile(APP_CONFIG_PATH, 'utf8').catch(() => '{}'))
          : {};
        await fs.ensureDir(YUMMAN_RIVALS_PATH);
        await fs.writeFile(APP_CONFIG_PATH, JSON.stringify({ 
          ...existing, 
          selectedSky: skyboxName 
        }, null, 2), 'utf8');
        log.info(`Skybox "${skyboxName}" guardado en configuración`);
      } catch (e) { 
        log.warn('No se pudo persistir selectedSky:', e.message); 
      }
      
      return {
        success: true,
        message: `Skybox "${skyboxName}" aplicado en ${totalVersionsApplied} versión(es)`,
        versionsApplied: totalVersionsApplied,
        versions: versionsWithSky
      };
    }
    
    // Si no se detectaron múltiples versiones, aplicar solo en la ruta dada
    console.log('Aplicando en ruta única...');
    const result = await applySkyboxToPath(skyboxPath, texFiles, texturePath);
    // applyRbxStorageAssets ya fue llamado arriba (PASO 2), no repetir
    
    if (result.success) {
      return {
        success: true,
        message: `Skybox "${skyboxName}" aplicado (${result.filesApplied} archivos)`,
        filesApplied: result.filesApplied
      };
    } else {
      return {
        success: false,
        message: `Error al aplicar skybox: ${result.message}`
      };
    }
    
  } catch (error) {
    console.error(`Error al aplicar skybox:`, error);
    return { 
      success: false, 
      message: `Error al aplicar skybox: ${error.message}` 
    };
  }
});

// Obtener información de rbx-storage
ipcMain.handle('get-rbx-storage-info', async () => {
  return await rbxStorage.getInfo();
});


// Obtener presets de atmósfera disponibles
ipcMain.handle('get-atmosphere-presets', async () => {
  try {
    const presets = atmosphere.getAtmospherePresets();
    return { success: true, presets };
  } catch (error) {
    return { success: false, presets: {}, message: error.message };
  }
});

// Aplicar atmósfera oscura
ipcMain.handle('apply-atmosphere', async (event, presetName, texturePath) => {
  try {
    console.log('=== APLICANDO ATMÓSFERA ===');
    console.log('Preset:', presetName);
    console.log('Ruta de texturas:', texturePath);
    
    const presets = atmosphere.getAtmospherePresets();
    const preset = presets[presetName];
    
    if (!preset) {
      return {
        success: false,
        message: `Preset "${presetName}" no encontrado`
      };
    }
    
    const result = await atmosphere.applyDarkAtmosphere(texturePath, preset);
    
    return result;
  } catch (error) {
    console.error('Error al aplicar atmósfera:', error);
    return { success: false, message: error.message };
  }
});


// Handler para verificar actualizaciones manualmente
ipcMain.handle('check-for-updates', () => {
  if (updater) {
    updater.checkForUpdates();
    return { success: true, message: 'Verificando actualizaciones...' };
  }
  return { success: false, message: 'Updater no inicializado' };
});

// Handler para obtener versión de la app
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

// Handler para verificar si hay recursos descargados
ipcMain.handle('check-resources', async () => {
  try {
    const hasResources = await resourceDownloader.checkResources();
    return { success: true, hasResources };
  } catch (error) {
    return { success: false, hasResources: false, message: error.message };
  }
});

// Redimensionar ventana para el launcher o la configuración
ipcMain.handle('resize-window', (event, mode) => {
  if (!mainWindow) return;
  if (mode === 'settings') {
    mainWindow.setResizable(true);
    mainWindow.setMaximizable(true);
    mainWindow.setMinimumSize(760, 480);
    mainWindow.setSize(900, 580, true);
    mainWindow.center();
  } else {
    // Volver al home — quitar maximizado primero
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    mainWindow.setMaximizable(false);
    mainWindow.setResizable(false);
    mainWindow.setMinimumSize(580, 280);
    mainWindow.setSize(580, 280, true);
    mainWindow.center();
  }
});

// Abrir ventana de configuración separada y cerrar la home
ipcMain.handle('open-settings-window', async () => {
  try {
    const uiPath = path.join(__dirname, '..', 'ui', 'out', 'settings.html');
    const uiPathFallback = path.join(__dirname, '..', 'ui', 'out', 'index.html');

    const settingsWindow = new BrowserWindow({
      width: 900,
      height: 580,
      minWidth: 760,
      minHeight: 480,
      resizable: true,
      maximizable: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
        webSecurity: false
      },
      autoHideMenuBar: true,
      icon: path.join(__dirname, '..', 'icon.ico'),
      backgroundColor: '#1D1B17',
      title: 'YUMMAN RIVALS — Configuración',
      frame: true,
      center: true,
    });

    // Load settings page
    const uiBase = path.join(__dirname, '..', 'ui', 'out');
    const settingsHtml = path.join(uiBase, 'settings', 'index.html');
    const fallbackHtml = path.join(uiBase, 'index.html');
    const loadPath = fs.existsSync(settingsHtml) ? settingsHtml : fallbackHtml;
    settingsWindow.loadFile(loadPath);

    settingsWindow.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: 'deny' };
    });

    // Close home window after settings opens
    settingsWindow.once('ready-to-show', () => {
      settingsWindow.show();
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.close();
      }
    });

    return { success: true };
  } catch (error) {
    log.error('Error abriendo ventana de configuración:', error);
    return { success: false, message: error.message };
  }
});

// Re-aplica la configuración guardada antes de lanzar Roblox
// Esto asegura que aunque Roblox se haya actualizado, los ajustes se mantienen
async function reapplyConfigBeforeLaunch(texturePath) {
  try {
    if (!fs.existsSync(APP_CONFIG_PATH)) return;
    const config = JSON.parse(await fs.readFile(APP_CONFIG_PATH, 'utf8'));
    log.info('Re-aplicando configuración antes de lanzar:', JSON.stringify(config));

    // Re-aplicar skybox si había uno seleccionado
    if (config.selectedSky && texturePath && fs.existsSync(texturePath)) {
      const skyboxName = config.selectedSky;
      const skyboxPath = path.join(SKYBOXES_PATH, skyboxName);
      if (fs.existsSync(skyboxPath)) {
        const texFiles = fs.readdirSync(skyboxPath).filter(f => f.endsWith('.tex'));
        if (texFiles.length > 0) {
          await applySkyboxToPath(skyboxPath, texFiles, texturePath);
          await rbxStorage.applySkyboxFromTexFiles(skyboxPath);
          log.info('Skybox re-aplicado:', skyboxName);
        }
      }
    }

    // Re-aplicar dark textures
    if (config.darkOn && texturePath && fs.existsSync(texturePath)) {
      const ruptikDarkPath = TEXTURES_PATH;
      if (fs.existsSync(ruptikDarkPath)) {
        log.info('Re-aplicando dark textures...');
        const { exec } = require('child_process');
        const items = fs.readdirSync(ruptikDarkPath);
        let copiedCount = 0;
        for (const item of items) {
          const src = path.join(ruptikDarkPath, item);
          const dest = path.join(texturePath, item);
          try {
            await new Promise(resolve => exec(`attrib -R "${dest}" /S /D`, () => resolve()));
            await fs.copy(src, dest, { overwrite: true });
            copiedCount++;
          } catch (e) {
            log.warn(`Error re-aplicando dark texture ${item}:`, e.message);
          }
        }
        log.info(`Dark textures re-aplicadas: ${copiedCount}/${items.length}`);
      } else {
        log.warn('Ruptic Dark textures no encontradas para re-aplicar');
      }
    }

    // Re-aplicar potato textures
    if (config.potatoTexOn && texturePath && fs.existsSync(texturePath)) {
      const potatoSrc = path.join(RESOURCES_PATH, 'textures', 'potato', 'PlatformContent', 'pc', 'textures');
      const fallbackSrc = path.join(__dirname, '..', 'resources', 'textures', 'potato', 'PlatformContent', 'pc', 'textures');
      const src = fs.existsSync(potatoSrc) ? potatoSrc : fallbackSrc;
      
      if (fs.existsSync(src)) {
        log.info('Re-aplicando potato textures...');
        const { exec } = require('child_process');
        const files = fs.readdirSync(src);
        let copiedCount = 0;
        for (const file of files) {
          const dest = path.join(texturePath, file);
          try {
            await new Promise(resolve => exec(`attrib -R "${dest}"`, () => resolve()));
            await fs.copy(path.join(src, file), dest, { overwrite: true });
            copiedCount++;
          } catch (e) {
            log.warn(`Error re-aplicando potato texture ${file}:`, e.message);
          }
        }
        log.info(`Potato textures re-aplicadas: ${copiedCount}/${files.length}`);
      } else {
        log.warn('Potato textures no encontradas para re-aplicar');
      }
    }

    // Re-aplicar fuente activa
    if (config.activeFont) {
      const fontsDir = path.join(RESOURCES_PATH, 'fonts');
      const fallbackDir = path.join(__dirname, '..', 'resources', 'fonts');
      const baseDir = fs.existsSync(fontsDir) ? fontsDir : fallbackDir;
      const fontSrc = path.join(baseDir, config.activeFont);
      const robloxFontsPath = getRobloxFontsPath(DEFAULT_PATHS.roblox);
      if (fs.existsSync(fontSrc) && robloxFontsPath && fs.existsSync(robloxFontsPath)) {
        const { exec } = require('child_process');
        const robloxFontFiles = fs.readdirSync(robloxFontsPath).filter(f => f.endsWith('.ttf') || f.endsWith('.otf'));
        for (const rf of robloxFontFiles) {
          const dest = path.join(robloxFontsPath, rf);
          try {
            await new Promise(resolve => exec(`attrib -R "${dest}"`, () => resolve()));
            await fs.copy(fontSrc, dest, { overwrite: true });
          } catch (e) { /* ignorar */ }
        }
        log.info('Fuente re-aplicada:', config.activeFont);
      }
    }

  } catch (error) {
    log.warn('Error re-aplicando configuración:', error.message);
  }
}

// Lanzar Roblox (sin Roblox Studio)
ipcMain.handle('launch-roblox', async (event, executorId, customPath) => {
  try {
    const { exec, spawn } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    log.info('=== LANZANDO ROBLOX ===');
    log.info('Ejecutor:', executorId);

    // Determinar qué ejecutor lanzar
    if (executorId === 'yumman') {
      // Lanzar desde la carpeta YUMMAN RIVALS\Versions
      if (fs.existsSync(DEFAULT_PATHS.yumman)) {
        const versions = fs.readdirSync(DEFAULT_PATHS.yumman)
          .filter(f => f.startsWith('version-'))
          .map(f => ({
            name: f,
            path: path.join(DEFAULT_PATHS.yumman, f),
            mtime: fs.statSync(path.join(DEFAULT_PATHS.yumman, f)).mtime
          }))
          .sort((a, b) => b.mtime - a.mtime);
        if (versions.length > 0) {
          const exePath = path.join(versions[0].path, 'RobloxPlayerBeta.exe');
          if (fs.existsSync(exePath)) {
            log.info('Lanzando desde YUMMAN RIVALS:', exePath);
            spawn(exePath, [], { detached: true, stdio: 'ignore' }).unref();
            setTimeout(() => app.quit(), 1500);
            return { success: true, message: 'YUMMAN RIVALS iniciado', method: 'yumman' };
          }
        }
      }
      // Fallback deeplink
      await shell.openExternal('roblox://');
      setTimeout(() => app.quit(), 1500);
      return { success: true, message: 'Roblox iniciado via deeplink', method: 'deeplink' };
    }

    if (executorId === 'fishtrap' || executorId === 'fishstrap') {
      // Buscar Fishstrap/Fishtrap
      const fishstrapExePaths = [
        path.join(os.homedir(), 'AppData', 'Local', 'Fishstrap', 'Fishstrap.exe'),
        path.join(os.homedir(), 'AppData', 'Local', 'Fishstrap', 'Versions', 'Fishstrap.exe'),
      ];
      for (const exePath of fishstrapExePaths) {
        if (fs.existsSync(exePath)) {
          log.info('Lanzando Fishstrap desde:', exePath);
          spawn(exePath, [], { detached: true, stdio: 'ignore' }).unref();
          setTimeout(() => app.quit(), 1500);
          return { success: true, message: 'Fishstrap iniciado', method: 'fishstrap' };
        }
      }
      await shell.openExternal('roblox://');
      setTimeout(() => app.quit(), 1500);
      return { success: true, message: 'Roblox iniciado via deeplink', method: 'deeplink' };
    }

    if (executorId === 'bloxtrap') {
      const bloxtrapExePaths = [
        path.join(os.homedir(), 'AppData', 'Local', 'Bloxtrap', 'Bloxtrap.exe'),
        path.join(os.homedir(), 'AppData', 'Local', 'Bloxtrap', 'Versions', 'Bloxtrap.exe'),
      ];
      for (const exePath of bloxtrapExePaths) {
        if (fs.existsSync(exePath)) {
          log.info('Lanzando Bloxtrap desde:', exePath);
          spawn(exePath, [], { detached: true, stdio: 'ignore' }).unref();
          setTimeout(() => app.quit(), 1500);
          return { success: true, message: 'Bloxtrap iniciado', method: 'bloxtrap' };
        }
      }
      await shell.openExternal('roblox://');
      setTimeout(() => app.quit(), 1500);
      return { success: true, message: 'Roblox iniciado via deeplink', method: 'deeplink' };
    }

    if (executorId === 'other' && customPath) {
      // Buscar RobloxPlayerBeta.exe en la ruta personalizada
      try {
        const versions = fs.readdirSync(customPath)
          .filter(f => f.startsWith('version-'))
          .map(f => ({
            name: f,
            path: path.join(customPath, f),
            mtime: fs.statSync(path.join(customPath, f)).mtime
          }))
          .sort((a, b) => b.mtime - a.mtime);

        if (versions.length > 0) {
          const exePath = path.join(versions[0].path, 'RobloxPlayerBeta.exe');
          if (fs.existsSync(exePath)) {
            spawn(exePath, [], { detached: true, stdio: 'ignore' }).unref();
            setTimeout(() => app.quit(), 1500);
            return { success: true, message: 'Roblox iniciado', method: 'exe' };
          }
        }
      } catch (e) {
        log.warn('Error buscando exe en ruta personalizada:', e.message);
      }
      // Fallback si no se encontró el exe
      await shell.openExternal('roblox://');
      setTimeout(() => app.quit(), 1500);
      return { success: true, message: 'Roblox iniciado via deeplink', method: 'deeplink' };
    }

    // Roblox Normal: buscar RobloxPlayerBeta.exe en la versión más reciente
    const robloxVersionsPath = DEFAULT_PATHS.roblox;
    if (fs.existsSync(robloxVersionsPath)) {
      const versions = fs.readdirSync(robloxVersionsPath)
        .filter(f => f.startsWith('version-'))
        .map(f => ({
          name: f,
          path: path.join(robloxVersionsPath, f),
          mtime: fs.statSync(path.join(robloxVersionsPath, f)).mtime
        }))
        .sort((a, b) => b.mtime - a.mtime);

      if (versions.length > 0) {
        const exePath = path.join(versions[0].path, 'RobloxPlayerBeta.exe');
        const texturePath = path.join(versions[0].path, 'PlatformContent', 'pc', 'textures');
        log.info('Buscando exe en:', exePath, '- Existe:', fs.existsSync(exePath));
        if (fs.existsSync(exePath)) {
          // Re-aplicar configuración guardada antes de lanzar
          // (Roblox puede haber actualizado y sobreescrito los archivos)
          await reapplyConfigBeforeLaunch(texturePath);
          spawn(exePath, [], { detached: true, stdio: 'ignore' }).unref();
          setTimeout(() => app.quit(), 1500);
          return { success: true, message: 'Roblox iniciado', method: 'exe' };
        }
      }
    }

    // Último fallback: deeplink
    log.info('Usando deeplink como fallback');
    await shell.openExternal('roblox://');
    setTimeout(() => app.quit(), 1500);
    return { success: true, message: 'Roblox iniciado via deeplink', method: 'deeplink' };

  } catch (error) {
    log.error('Error lanzando Roblox:', error);
    return { success: false, message: error.message };
  }
});

// Handler para re-descargar recursos
ipcMain.handle('redownload-resources', async () => {
  const dlWindow = createDownloadWindow();
  try {
    await resourceDownloader.downloadResources(
      (progress) => {
        if (dlWindow && !dlWindow.isDestroyed()) {
          dlWindow.webContents.send('download-progress', { progress, status: null });
        }
      },
      (status) => {
        if (dlWindow && !dlWindow.isDestroyed()) {
          dlWindow.webContents.send('download-progress', { progress: null, status });
        }
      }
    );
    
    if (dlWindow && !dlWindow.isDestroyed()) {
      dlWindow.close();
    }
    
    return { success: true, message: 'Recursos descargados correctamente' };
  } catch (error) {
    if (dlWindow && !dlWindow.isDestroyed()) {
      dlWindow.close();
    }
    log.error('Error re-descargando recursos:', error);
    return { success: false, message: error.message };
  }
});

// ─── INSTALADOR DE ROBLOX EN BACKGROUND ───────────────────────────────────────
ipcMain.handle('install-roblox', async () => {
  try {
    const { spawn } = require('child_process');
    
    // Buscar el instalador en múltiples ubicaciones
    const installerPaths = [
      path.join(RESOURCES_PATH, 'RobloxPlayerInstaller.exe'),
      path.join(__dirname, '..', 'resources', 'RobloxPlayerInstaller.exe'),
      path.join(process.resourcesPath || '', 'resources', 'RobloxPlayerInstaller.exe'),
    ];
    
    let installerPath = null;
    for (const p of installerPaths) {
      if (fs.existsSync(p)) { installerPath = p; break; }
    }
    
    if (!installerPath) {
      return { success: false, message: 'Instalador de Roblox no encontrado' };
    }
    
    log.info('Ejecutando instalador de Roblox:', installerPath);
    // Ejecutar en background, silencioso
    const proc = spawn(installerPath, ['/silent'], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true
    });
    
    return { success: true, message: 'Instalador de Roblox iniciado' };
  } catch (error) {
    log.error('Error instalando Roblox:', error);
    return { success: false, message: error.message };
  }
});

// ─── SISTEMA DE FLAGS (ClientAppSettings.json) ────────────────────────────────

// Carpeta base de YUMMAN RIVALS donde se guardan todos los ajustes
// Estructura: %LOCALAPPDATA%\YUMMAN RIVALS\Versions\<version>\
const YUMMAN_RIVALS_PATH = path.join(os.homedir(), 'AppData', 'Local', 'YUMMAN RIVALS');
const YUMMAN_RIVALS_VERSIONS_PATH = path.join(YUMMAN_RIVALS_PATH, 'Versions');
const YUMMAN_RIVALS_CLIENT_SETTINGS = path.join(YUMMAN_RIVALS_PATH, 'ClientSettings', 'ClientAppSettings.json');

/**
 * Devuelve la ruta del ClientAppSettings.json.
 * Guarda en %LOCALAPPDATA%\YUMMAN RIVALS\ClientSettings\ClientAppSettings.json
 * Y también sincroniza con la ruta oficial de Roblox para que el juego lo lea.
 */
function getClientSettingsPath() {
  return YUMMAN_RIVALS_CLIENT_SETTINGS;
}

/**
 * Sincroniza los flags guardados en YUMMAN RIVALS hacia la ruta oficial de Roblox.
 * Roblox lee de %LOCALAPPDATA%\Roblox\ClientSettings\ClientAppSettings.json
 */
async function syncFlagsToRoblox(flags) {
  try {
    const robloxSettingsPath = path.join(os.homedir(), 'AppData', 'Local', 'Roblox', 'ClientSettings', 'ClientAppSettings.json');
    await fs.ensureDir(path.dirname(robloxSettingsPath));
    await fs.writeFile(robloxSettingsPath, JSON.stringify(flags, null, 2), 'utf8');
    log.info('Flags sincronizados a Roblox ClientSettings');
  } catch (error) {
    log.warn('No se pudo sincronizar flags a Roblox:', error.message);
  }
}

// Leer flags actuales (lee de YUMMAN RIVALS, fallback a Roblox)
ipcMain.handle('get-flags', async () => {
  try {
    const settingsPath = getClientSettingsPath();

    // Si existe en YUMMAN RIVALS, leer de ahí
    if (fs.existsSync(settingsPath)) {
      const content = await fs.readFile(settingsPath, 'utf8');
      let flags = {};
      try {
        flags = JSON.parse(content);
      } catch (parseError) {
        log.warn('ClientAppSettings.json (YUMMAN RIVALS) tiene JSON inválido:', parseError.message);
        return { success: true, flags: {} };
      }
      return { success: true, flags };
    }

    // Fallback: leer de la ruta oficial de Roblox
    const robloxPath = path.join(os.homedir(), 'AppData', 'Local', 'Roblox', 'ClientSettings', 'ClientAppSettings.json');
    if (fs.existsSync(robloxPath)) {
      const content = await fs.readFile(robloxPath, 'utf8');
      let flags = {};
      try { flags = JSON.parse(content); } catch (e) { /* ignorar */ }
      return { success: true, flags };
    }

    return { success: true, flags: {} };
  } catch (error) {
    return { success: false, flags: {}, message: error.message };
  }
});

// Guardar flags en YUMMAN RIVALS y sincronizar a Roblox
ipcMain.handle('save-flags', async (event, flags) => {
  try {
    // 1. Guardar en YUMMAN RIVALS\ClientSettings\
    const settingsPath = getClientSettingsPath();
    await fs.ensureDir(path.dirname(settingsPath));
    await fs.writeFile(settingsPath, JSON.stringify(flags, null, 2), 'utf8');

    // 2. Sincronizar a la ruta oficial de Roblox para que el juego los lea
    await syncFlagsToRoblox(flags);

    log.info('Flags guardados en YUMMAN RIVALS y sincronizados a Roblox:', Object.keys(flags).length, 'flags');
    return { success: true, message: `${Object.keys(flags).length} flags guardados` };
  } catch (error) {
    log.error('Error guardando flags:', error);
    return { success: false, message: error.message };
  }
});

// Limpiar todos los flags (en YUMMAN RIVALS y en Roblox)
ipcMain.handle('clear-flags', async () => {
  try {
    // Limpiar en YUMMAN RIVALS
    const settingsPath = getClientSettingsPath();
    await fs.ensureDir(path.dirname(settingsPath));
    await fs.writeFile(settingsPath, '{}', 'utf8');

    // Limpiar también en Roblox
    await syncFlagsToRoblox({});

    return { success: true, message: 'Flags eliminados' };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

// Obtener flags del potato mode
ipcMain.handle('get-potato-flags', async () => {
  try {
    const potatoPath = path.join(RESOURCES_PATH, 'potatomode.json');
    const fallbackPath = path.join(__dirname, '..', 'resources', 'potatomode.json');
    const p = fs.existsSync(potatoPath) ? potatoPath : fallbackPath;
    const content = await fs.readFile(p, 'utf8');
    return { success: true, flags: JSON.parse(content) };
  } catch (error) {
    return { success: false, flags: {}, message: error.message };
  }
});

// ─── DARK TEXTURES POTATO (fixed: remove read-only before copy) ──────────────
ipcMain.handle('apply-potato-textures', async (event, texturePath) => {
  try {
    if (!texturePath || !fs.existsSync(texturePath)) {
      return { success: false, message: `Ruta de texturas no válida: ${texturePath}` };
    }

    const backupResult = await ensureTexturesBackup(texturePath);
    if (!backupResult.success) {
      return { success: false, message: `No se pudo crear backup: ${backupResult.message}` };
    }

    const potatoSrc = path.join(RESOURCES_PATH, 'textures', 'potato', 'PlatformContent', 'pc', 'textures');
    const fallbackSrc = path.join(__dirname, '..', 'resources', 'textures', 'potato', 'PlatformContent', 'pc', 'textures');
    const src = fs.existsSync(potatoSrc) ? potatoSrc : fallbackSrc;
    
    if (!fs.existsSync(src)) {
      return { success: false, message: 'Texturas potato no encontradas en resources/' };
    }
    
    const { exec } = require('child_process');
    const files = fs.readdirSync(src);
    let copied = 0;
    for (const file of files) {
      const dest = path.join(texturePath, file);
      try {
        // Remove read-only first
        await new Promise(resolve => exec(`attrib -R "${dest}"`, () => resolve()));
        await fs.copy(path.join(src, file), dest, { overwrite: true });
        copied++;
      } catch (e) {
        log.warn('Error copiando textura potato:', file, e.message);
      }
    }
    
    log.info(`Texturas potato aplicadas: ${copied}/${files.length}`);

    // ✅ APLICAR SKYBOX GRIS (Chill gray) para potato mode
    try {
      const graySkyPath = path.join(SKYBOXES_PATH, 'Chill gray');
      if (fs.existsSync(graySkyPath)) {
        log.info('Aplicando skybox gris para potato mode...');
        const texFiles = fs.readdirSync(graySkyPath).filter(f => f.endsWith('.tex'));
        if (texFiles.length > 0) {
          await applySkyboxToPath(graySkyPath, texFiles, texturePath);
          await rbxStorage.applySkyboxFromTexFiles(graySkyPath);
          log.info('✓ Skybox gris aplicado para potato mode');
        }
      } else {
        log.warn('Skybox gris no encontrado, continuando sin él');
      }
    } catch (skyError) {
      log.warn('Error aplicando skybox gris:', skyError.message);
      // No es crítico, continuar
    }

    // Persistir potato mode en app-config
    try {
      const existing = fs.existsSync(APP_CONFIG_PATH)
        ? JSON.parse(await fs.readFile(APP_CONFIG_PATH, 'utf8').catch(() => '{}'))
        : {};
      await fs.ensureDir(YUMMAN_RIVALS_PATH);
      await fs.writeFile(APP_CONFIG_PATH, JSON.stringify({ 
        ...existing, 
        potatoTexOn: true, 
        darkOn: false,
        selectedSky: 'Chill gray' // Guardar el skybox gris
      }, null, 2), 'utf8');
    } catch (e) { log.warn('No se pudo persistir potato:', e.message); }

    return { success: true, message: `Potato mode aplicado (${copied} texturas + skybox gris)` };
  } catch (error) {
    log.error('Error apply-potato-textures:', error);
    return { success: false, message: error.message };
  }
});

// ─── SISTEMA DE FUENTES ───────────────────────────────────────────────────────

// Obtener ruta de fuentes de Roblox
function getRobloxFontsPath(robloxVersionsPath) {
  try {
    if (!fs.existsSync(robloxVersionsPath)) return null;
    const versions = fs.readdirSync(robloxVersionsPath)
      .filter(f => f.startsWith('version-'))
      .map(f => ({ name: f, mtime: fs.statSync(path.join(robloxVersionsPath, f)).mtime }))
      .sort((a, b) => b.mtime - a.mtime);
    if (versions.length === 0) return null;
    return path.join(robloxVersionsPath, versions[0].name, 'content', 'fonts');
  } catch { return null; }
}

// Listar fuentes disponibles en resources/fonts/ (archivos .ttf/.otf individuales)
ipcMain.handle('get-available-fonts', async () => {
  try {
    const fontsDir = path.join(RESOURCES_PATH, 'fonts');
    const fallbackDir = path.join(__dirname, '..', 'resources', 'fonts');
    const dir = fs.existsSync(fontsDir) ? fontsDir : fallbackDir;
    
    if (!fs.existsSync(dir)) {
      return { success: true, fonts: [] };
    }
    
    const fonts = fs.readdirSync(dir).filter(f => {
      const ext = path.extname(f).toLowerCase();
      return ext === '.ttf' || ext === '.otf';
    }).map(f => ({ name: path.basename(f, path.extname(f)), file: f }))
    .sort((a, b) => {
      // Minecraft first
      const aMc = a.name.toLowerCase().includes('minecraft');
      const bMc = b.name.toLowerCase().includes('minecraft');
      if (aMc && !bMc) return -1;
      if (!aMc && bMc) return 1;
      return a.name.localeCompare(b.name);
    });
    
    return { success: true, fonts, fontsDir: dir };
  } catch (error) {
    return { success: false, fonts: [], message: error.message };
  }
});

// Aplicar fuente individual (fixed: verify fonts path exists, handle read-only)
ipcMain.handle('apply-font-pack', async (event, fontFile) => {
  try {
    const fontsDir = path.join(RESOURCES_PATH, 'fonts');
    const fallbackDir = path.join(__dirname, '..', 'resources', 'fonts');
    const baseDir = fs.existsSync(fontsDir) ? fontsDir : fallbackDir;
    const fontSrc = path.join(baseDir, fontFile);
    
    if (!fs.existsSync(fontSrc)) {
      return { success: false, message: `Fuente "${fontFile}" no encontrada en ${baseDir}` };
    }
    
    const robloxFontsPath = getRobloxFontsPath(DEFAULT_PATHS.roblox);
    if (!robloxFontsPath) {
      return { success: false, message: 'No se encontró Roblox instalado' };
    }
    if (!fs.existsSync(robloxFontsPath)) {
      return { success: false, message: `Carpeta de fuentes no existe: ${robloxFontsPath}` };
    }
    
    // Backup si no existe
    const backupPath = path.join(app.getPath('userData'), 'fonts_backup');
    if (!fs.existsSync(backupPath)) {
      await fs.copy(robloxFontsPath, backupPath);
      log.info('Backup de fuentes creado en:', backupPath);
    }
    
    const { exec } = require('child_process');
    const robloxFontFiles = fs.readdirSync(robloxFontsPath)
      .filter(f => f.endsWith('.ttf') || f.endsWith('.otf'));
    
    let copied = 0;
    for (const rf of robloxFontFiles) {
      const dest = path.join(robloxFontsPath, rf);
      try {
        await new Promise(resolve => exec(`attrib -R "${dest}"`, () => resolve()));
        await fs.copy(fontSrc, dest, { overwrite: true });
        copied++;
      } catch (e) {
        log.warn('Error copiando fuente a:', rf, e.message);
      }
    }
    
    log.info('Fuente aplicada:', fontFile, '- archivos:', copied);

    // Persistir fuente activa en app-config
    try {
      const existing = fs.existsSync(APP_CONFIG_PATH)
        ? JSON.parse(await fs.readFile(APP_CONFIG_PATH, 'utf8').catch(() => '{}'))
        : {};
      await fs.ensureDir(YUMMAN_RIVALS_PATH);
      await fs.writeFile(APP_CONFIG_PATH, JSON.stringify({ ...existing, activeFont: fontFile }, null, 2), 'utf8');
    } catch (e) { log.warn('No se pudo persistir fuente:', e.message); }

    return { success: true, message: `Fuente "${fontFile}" aplicada (${copied} archivos)` };
  } catch (error) {
    log.error('Error apply-font-pack:', error);
    return { success: false, message: error.message };
  }
});

// Importar fuente desde archivo del usuario
ipcMain.handle('import-font', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Importar fuente',
      filters: [{ name: 'Fuentes', extensions: ['ttf', 'otf'] }],
      properties: ['openFile']
    });
    if (result.canceled) return { success: false, message: 'Cancelado' };

    const srcPath = result.filePaths[0];
    const fileName = path.basename(srcPath);
    const fontsDir = path.join(RESOURCES_PATH, 'fonts');
    const fallbackDir = path.join(__dirname, '..', 'resources', 'fonts');
    const destDir = fs.existsSync(fontsDir) ? fontsDir : fallbackDir;
    await fs.ensureDir(destDir);
    const destPath = path.join(destDir, fileName);
    await fs.copy(srcPath, destPath, { overwrite: true });
    log.info('Fuente importada:', fileName);
    return { success: true, fontName: path.basename(fileName, path.extname(fileName)), fontFile: fileName };
  } catch (error) {
    log.error('Error import-font:', error);
    return { success: false, message: error.message };
  }
});

// Restaurar fuentes originales
ipcMain.handle('restore-fonts', async () => {
  try {
    const backupPath = path.join(app.getPath('userData'), 'fonts_backup');
    if (!fs.existsSync(backupPath)) {
      return { success: false, message: 'No hay backup de fuentes' };
    }
    const robloxFontsPath = getRobloxFontsPath(DEFAULT_PATHS.roblox);
    if (!robloxFontsPath) {
      return { success: false, message: 'No se encontró Roblox' };
    }
    await fs.copy(backupPath, robloxFontsPath, { overwrite: true });
    return { success: true, message: 'Fuentes originales restauradas' };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

// ─── CIELO PERSONALIZADO DESDE IMAGEN ────────────────────────────────────────
ipcMain.handle('select-and-convert-sky', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Seleccionar imagen para el cielo',
      filters: [{ name: 'Imágenes', extensions: ['jpg', 'jpeg', 'png', 'bmp', 'webp'] }],
      properties: ['openFile']
    });
    
    if (result.canceled) return { success: false, message: 'Cancelado' };
    
    const imagePath = result.filePaths[0];
    const outputDir = path.join(app.getPath('userData'), 'custom_skybox');
    await fs.ensureDir(outputDir);

    // Find a template skybox - search multiple possible paths
    let templateSkybox = null;
    const possibleBases = [
      SKYBOXES_PATH,
      path.join(__dirname, '..', 'resources', 'skyboxes', 'all-skyboxes', 'ALL SKYBOXES'),
      path.join(app.getPath('userData'), 'resources', 'skyboxes', 'all-skyboxes', 'ALL SKYBOXES'),
    ];

    for (const base of possibleBases) {
      if (!fs.existsSync(base)) continue;
      try {
        const entries = fs.readdirSync(base);
        for (const entry of entries) {
          const entryPath = path.join(base, entry);
          try {
            if (fs.statSync(entryPath).isDirectory()) {
              const files = fs.readdirSync(entryPath);
              if (files.some(f => f.endsWith('.tex'))) {
                templateSkybox = entryPath;
                log.info('Template skybox encontrado:', templateSkybox);
                break;
              }
            }
          } catch (e) { /* skip */ }
        }
      } catch (e) { /* skip */ }
      if (templateSkybox) break;
    }

    if (!templateSkybox) {
      return { success: false, message: `No se encontró un skybox plantilla. Rutas buscadas: ${possibleBases.join(', ')}` };
    }

    log.info('Convirtiendo imagen a skybox, plantilla:', templateSkybox);
    const convResult = await convertImageToSkybox(imagePath, outputDir, templateSkybox);
    
    if (!convResult.success) return convResult;
    
    return { success: true, outputDir, message: 'Cielo convertido correctamente' };
  } catch (error) {
    log.error('Error select-and-convert-sky:', error);
    return { success: false, message: error.message };
  }
});

// Aplicar cielo personalizado convertido
ipcMain.handle('apply-converted-sky', async (event, texturePath) => {
  try {
    const outputDir = path.join(app.getPath('userData'), 'custom_skybox');
    if (!fs.existsSync(outputDir)) {
      return { success: false, message: 'No hay cielo personalizado convertido. Selecciona una imagen primero.' };
    }
    const texFiles = fs.readdirSync(outputDir).filter(f => f.endsWith('.tex'));
    if (texFiles.length === 0) {
      return { success: false, message: 'No se encontraron archivos .tex en el cielo personalizado.' };
    }
    // Intentar rbx-storage primero
    const rbxResult = await rbxStorage.applySkyboxFromTexFiles(outputDir);
    if (rbxResult.success) {
      return { success: true, message: 'Cielo personalizado aplicado (rbx-storage)', method: 'rbx-storage' };
    }
    // Fallback: método tradicional
    if (texturePath && fs.existsSync(texturePath)) {
      const skyPath = path.join(texturePath, 'sky');
      await fs.ensureDir(skyPath);
      const { exec } = require('child_process');
      await new Promise(resolve => exec(`attrib -R "${skyPath}" /S /D`, () => resolve()));
      await fs.copy(outputDir, skyPath, { overwrite: true });
      return { success: true, message: 'Cielo personalizado aplicado (método tradicional)', method: 'traditional' };
    }
    return { success: false, message: 'No se pudo aplicar el cielo: rbx-storage no disponible y ruta de texturas inválida.' };
  } catch (error) {
    log.error('Error apply-converted-sky:', error);
    return { success: false, message: error.message };
  }
});

// ─── ABRIR ENLACE EXTERNO ─────────────────────────────────────────────────────
ipcMain.handle('open-external', async (event, url) => {
  try {
    if (!url || (!url.startsWith('https://') && !url.startsWith('http://'))) {
      return { success: false, message: 'URL inválida o protocolo no permitido' };
    }
    await shell.openExternal(url);
    return { success: true };
  } catch (error) {
    log.error('Error abriendo enlace externo:', error);
    return { success: false, message: error.message };
  }
});

// ─── PERSISTENCIA DE CONFIGURACIÓN DE LA APP ─────────────────────────────────
// Guarda el estado completo: ejecutor, skybox activo, texturas, fuente, etc.
const APP_CONFIG_PATH = path.join(YUMMAN_RIVALS_PATH, 'app-config.json');

ipcMain.handle('save-app-config', async (event, config) => {
  try {
    await fs.ensureDir(YUMMAN_RIVALS_PATH);
    const existing = fs.existsSync(APP_CONFIG_PATH)
      ? JSON.parse(await fs.readFile(APP_CONFIG_PATH, 'utf8').catch(() => '{}'))
      : {};
    const merged = { ...existing, ...config, updatedAt: new Date().toISOString() };
    await fs.writeFile(APP_CONFIG_PATH, JSON.stringify(merged, null, 2), 'utf8');
    log.info('Configuración guardada:', Object.keys(config).join(', '));
    return { success: true };
  } catch (error) {
    log.error('Error guardando configuración:', error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle('load-app-config', async () => {
  try {
    if (!fs.existsSync(APP_CONFIG_PATH)) {
      return { success: true, config: {} };
    }
    const content = await fs.readFile(APP_CONFIG_PATH, 'utf8');
    const config = JSON.parse(content);
    return { success: true, config };
  } catch (error) {
    log.warn('Error cargando configuración:', error.message);
    return { success: true, config: {} };
  }
});
// Multi-instance: crea ROBLOX_SingletonEvent antes de lanzar Roblox
// Fuente: github.com/bloxstraplabs/bloxstrap/issues/6054
ipcMain.handle('launch-extra-instance', async (event, executorId, customPath) => {
  try {
    const { spawn } = require('child_process');
    log.info('=== LANZANDO INSTANCIA EXTRA (mutex method) ===');

    let exePath = null;
    const searchPaths = [
      DEFAULT_PATHS.yumman,
      DEFAULT_PATHS.roblox,
      DEFAULT_PATHS.fishstrap,
      DEFAULT_PATHS.bloxtrap,
    ].filter(p => p && fs.existsSync(p));

    for (const basePath of searchPaths) {
      try {
        const versions = fs.readdirSync(basePath)
          .filter(f => f.startsWith('version-'))
          .map(f => ({ name: f, path: path.join(basePath, f), mtime: fs.statSync(path.join(basePath, f)).mtime }))
          .sort((a, b) => b.mtime - a.mtime);
        if (versions.length > 0) {
          const candidate = path.join(versions[0].path, 'RobloxPlayerBeta.exe');
          if (fs.existsSync(candidate)) { exePath = candidate; break; }
        }
      } catch (e) { /* skip */ }
    }

    if (!exePath) {
      return { success: false, message: 'No se encontro RobloxPlayerBeta.exe' };
    }

    log.info('Exe encontrado:', exePath);

    // Crear ROBLOX_SingletonEvent ANTES de lanzar Roblox
    // Cuando Roblox intenta crear ese evento y ya existe, no bloquea la segunda instancia
    const mutexScript = '$e=[System.Threading.EventWaitHandle]::new($false,[System.Threading.EventResetMode]::ManualReset,"ROBLOX_SingletonEvent");Start-Sleep -Seconds 15;$e.Dispose()';

    spawn('powershell.exe', ['-WindowStyle', 'Hidden', '-NonInteractive', '-Command', mutexScript], {
      detached: true, stdio: 'ignore',
    }).unref();

    await new Promise(resolve => setTimeout(resolve, 400));

    const proc = spawn(exePath, [], { detached: true, stdio: 'ignore' });

    log.info('Instancia extra lanzada, PID:', proc.pid);
    return { success: true, message: 'Instancia extra iniciada', pid: proc.pid };

  } catch (error) {
    log.error('Error lanzando instancia extra:', error);
    return { success: false, message: error.message };
  }
});



