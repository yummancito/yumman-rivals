// Cargar variables de entorno
require('dotenv').config();

const { app, BrowserWindow, ipcMain, dialog, shell, protocol } = require('electron');
const path = require('path');
const fs = require('fs-extra');
const os = require('os');
const log = require('electron-log');
const axios = require('axios');
const { convertImageToSkybox, generatePreview } = require('./skyConverter');
const RbxStorageManager = require('./rbxStorageManager');
const AtmosphereManager = require('./atmosphereManager');
const Updater = require('./updater');
const ResourceDownloader = require('./resourceDownloader');
const ConfigManager = require('./main/config-manager');
const IntegrityService = require('./main/integrity-service');
const LockService = require('./main/lock-service');
const DownloadManager = require('./main/download-manager');
const UpdateManager = require('./main/update-manager');

// Instanciar servicios
const configManager = new ConfigManager();
const integrityService = new IntegrityService();
const lockService = new LockService(configManager);
const downloadManager = new DownloadManager(configManager, integrityService);
const updateManager = new UpdateManager(configManager, downloadManager, integrityService, lockService);

// Crear directorios necesarios al inicio
configManager.ensureDirectories().catch(error => {
  log.error('Error creando directorios iniciales:', error);
});

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
  return path.join(RESOURCES_PATH, 'skyboxes', 'ALL SKYBOXES');
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

// Rutas por defecto
const DEFAULT_PATHS = {
  // Carpeta propia de YUMMAN RIVALS — aquí se guardan texturas y versiones
  yumman: configManager.getPath('YUMMAN_RIVALS_VERSIONS_PATH'),
  texturesBackup: configManager.getPath('TEXTURES_BACKUP_PATH'),
  customSkybox: configManager.getPath('CUSTOM_SKYBOX_PATH'),
  previews: configManager.getPath('PREVIEWS_PATH'),
  // Recursos empaquetados
  resources: RESOURCES_PATH,
  skyboxes: SKYBOXES_PATH,
  textures: TEXTURES_PATH,
  uiImages: UI_IMAGES_PATH
};

// Carpeta base de YUMMAN RIVALS donde se guardan todos los ajustes
// Estructura: %LOCALAPPDATA%\YUMMAN RIVALS\
const YUMMAN_RIVALS_PATH = configManager.getPath('YUMMAN_RIVALS_PATH');
const YUMMAN_RIVALS_VERSIONS_PATH = configManager.getPath('YUMMAN_RIVALS_VERSIONS_PATH');
const YUMMAN_RIVALS_CLIENT_SETTINGS = configManager.getPath('YUMMAN_RIVALS_CLIENT_SETTINGS');

// Ruta de configuración persistente de la app
const APP_CONFIG_PATH = configManager.getPath('YUMMAN_RIVALS_PATH') + '\\app-config.json';
const APP_CONFIG_LOCK_PATH = configManager.getPath('APP_CONFIG_LOCK_PATH');

// Backend URL (configurable via environment variable)
const BACKEND_URL = process.env.BACKEND_URL || 'https://yumman-rivals-ping.onrender.com';

// Función helper para escribir en config con locking simple
async function writeAppConfigWithLock(data) {
  const maxRetries = 5;
  const retryDelay = 100; // ms

  for (let i = 0; i < maxRetries; i++) {
    try {
      // Intentar crear archivo de lock
      const lockData = { pid: process.pid, timestamp: Date.now() };
      await fs.writeFile(APP_CONFIG_LOCK_PATH, JSON.stringify(lockData), { flag: 'wx' });

      // Lock adquirido, escribir config
      await fs.writeFile(APP_CONFIG_PATH, JSON.stringify(data, null, 2), 'utf8');

      // Liberar lock
      await fs.unlink(APP_CONFIG_LOCK_PATH);
      return { success: true };
    } catch (error) {
      if (error.code === 'EEXIST') {
        // Lock ya existe, esperar y reintentar
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        continue;
      }
      // Otro error, liberar lock si existe y retornar error
      try { await fs.unlink(APP_CONFIG_LOCK_PATH); } catch (e) { /* ignore */ }
      throw error;
    }
  }

  throw new Error('No se pudo adquirir lock después de ' + maxRetries + ' intentos');
}

// Verificar si Roblox está ejecutándose
async function isRobloxRunning() {
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execAsync = promisify(exec);

  try {
    // Verificar si hay procesos de Roblox corriendo
    const result = await execAsync('tasklist /FI "IMAGENAME eq RobloxPlayerBeta.exe"');
    return result.stdout.includes('RobloxPlayerBeta.exe');
  } catch (error) {
    // Si falla el comando, asumir que no está corriendo
    return false;
  }
}

// Cerrar Roblox
async function closeRoblox() {
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execAsync = promisify(exec);

  try {
    // Cerrar todos los procesos de Roblox
    await execAsync('taskkill /F /IM RobloxPlayerBeta.exe');
    log.info('Roblox cerrado');
    return { success: true };
  } catch (error) {
    // Si no hay procesos, es un éxito
    if (error.message.includes('not found') || error.message.includes('no se encontr')) {
      log.info('Roblox no estaba corriendo');
      return { success: true };
    }
    log.error('Error cerrando Roblox:', error);
    return { success: false, message: error.message };
  }
}

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
      preload: path.join(__dirname, 'preload.js')
    },
    autoHideMenuBar: true,
    icon: path.join(__dirname, '..', 'icon.ico'),
    backgroundColor: '#1D1B17',
    title: 'YUMMAN RIVALS',
    frame: false,
    center: true,
  });

  // Desarrollo: cargar desde archivos estáticos compilados
  if (process.env.NODE_ENV === 'development') {
    const uiPath = path.join(__dirname, '..', 'ui-source', 'out', 'index.html');

    if (fs.existsSync(uiPath)) {
      mainWindow.loadFile(uiPath);
    } else {
      mainWindow.loadURL('data:text/html,<h1 style="color:white;font-family:sans-serif;text-align:center;margin-top:100px;">Error: Ejecuta "npm run build:ui" primero</h1>');
    }
    mainWindow.webContents.openDevTools();
  } else {
    // Producción: usar nueva interfaz
    let uiPath;
    
    if (app.isPackaged) {
      // En producción empaquetada, la UI está en el ASAR
      uiPath = path.join(__dirname, '..', 'ui-source', 'out', 'index.html');
    } else {
      // En desarrollo
      uiPath = path.join(__dirname, '..', 'ui-source', 'out', 'index.html');
    }

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
    width: 580,
    height: 280,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    autoHideMenuBar: true,
    resizable: false,
    frame: false,
    icon: path.join(__dirname, '..', 'icon.ico'),
    backgroundColor: '#000',
    title: 'YUMMAN RIVALS'
  });

  // Crear HTML simple para la ventana de descarga
  const downloadHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background: #000;
          color: white;
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          position: relative;
        }
        #bg-canvas {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 0;
        }
        .overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(to bottom, transparent, rgba(0,0,0,0.6));
          z-index: 1;
        }
        .container {
          text-align: center;
          padding: 20px;
          width: 100%;
          z-index: 2;
          position: relative;
        }
        .status {
          font-size: 16px;
          font-weight: 500;
          margin-bottom: 20px;
          color: rgba(255,255,255,0.9);
        }
        .progress-text {
          font-size: 24px;
          font-weight: 600;
          margin-bottom: 15px;
          color: #fff;
        }
        .progress-bar-container {
          width: 300px;
          height: 6px;
          background: rgba(255,255,255,0.1);
          border-radius: 3px;
          margin: 0 auto 20px;
          overflow: hidden;
        }
        .progress-bar {
          height: 100%;
          background: #5865F2;
          width: 0%;
          transition: width 0.3s ease;
          border-radius: 3px;
        }
        .eta {
          font-size: 14px;
          color: rgba(255,255,255,0.6);
        }
      </style>
    </head>
    <body>
      <canvas id="bg-canvas"></canvas>
      <div class="overlay"></div>
      <div class="container">
        <div class="status" id="status">Descargando recursos...</div>
        <div class="progress-text" id="progress">0%</div>
        <div class="progress-bar-container">
          <div class="progress-bar" id="progress-bar"></div>
        </div>
        <div class="eta" id="eta">Tiempo estimado: --</div>
      </div>

      <script>
        // Animated background (VenomBeam style)
        const canvas = document.getElementById('bg-canvas');
        const ctx = canvas.getContext('2d');
        let particles = [];
        const mouse = { x: 0, y: 0 };

        function resizeCanvas() {
          canvas.width = window.innerWidth;
          canvas.height = window.innerHeight;
          initParticles();
        }

        function initParticles() {
          particles = [];
          for (let i = 0; i < 80; i++) {
            particles.push({
              x: Math.random() * canvas.width,
              y: Math.random() * canvas.height,
              vx: (Math.random() - 0.5) * 2,
              vy: (Math.random() - 0.5) * 2,
              life: 0,
              maxLife: Math.random() * 100 + 50,
              size: Math.random() * 3 + 1,
              opacity: Math.random() * 0.8 + 0.2,
            });
          }
        }

        document.addEventListener('mousemove', (e) => {
          mouse.x = e.clientX;
          mouse.y = e.clientY;
        });

        function animate() {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          particles.forEach((particle) => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.life++;

            const dx = mouse.x - particle.x;
            const dy = mouse.y - particle.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 150) {
              const force = (150 - distance) / 150;
              particle.vx += (dx / distance) * force * 0.1;
              particle.vy += (dy / distance) * force * 0.1;
            }

            particle.vx *= 0.99;
            particle.vy *= 0.99;

            if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -0.8;
            if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -0.8;

            particle.x = Math.max(0, Math.min(canvas.width, particle.x));
            particle.y = Math.max(0, Math.min(canvas.height, particle.y));

            if (particle.life > particle.maxLife) {
              particle.x = Math.random() * canvas.width;
              particle.y = Math.random() * canvas.height;
              particle.vx = (Math.random() - 0.5) * 2;
              particle.vy = (Math.random() - 0.5) * 2;
              particle.life = 0;
              particle.maxLife = Math.random() * 100 + 50;
            }

            const alpha = particle.opacity * (1 - particle.life / particle.maxLife);
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);

            const gradient = ctx.createRadialGradient(
              particle.x, particle.y, 0,
              particle.x, particle.y, particle.size * 2
            );

            gradient.addColorStop(0, \`rgba(200, 200, 255, \${alpha})\`);
            gradient.addColorStop(0.5, \`rgba(150, 150, 200, \${alpha * 0.8})\`);
            gradient.addColorStop(1, \`rgba(100, 100, 150, \${alpha * 0.3})\`);

            ctx.fillStyle = gradient;
            ctx.fill();
          });

          particles.forEach((particle, i) => {
            particles.slice(i + 1).forEach((otherParticle) => {
              const dx = particle.x - otherParticle.x;
              const dy = particle.y - otherParticle.y;
              const distance = Math.sqrt(dx * dx + dy * dy);

              if (distance < 100) {
                const alpha = ((100 - distance) / 100) * 0.3;
                ctx.beginPath();
                ctx.moveTo(particle.x, particle.y);
                ctx.lineTo(otherParticle.x, otherParticle.y);
                ctx.strokeStyle = \`rgba(150, 150, 200, \${alpha})\`;
                ctx.lineWidth = 0.5;
                ctx.stroke();
              }
            });
          });

          requestAnimationFrame(animate);
        }

        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();
        animate();

        window.electronAPI.onDownloadProgress((data) => {
          const statusEl = document.getElementById('status');
          const progressEl = document.getElementById('progress');
          const progressBarEl = document.getElementById('progress-bar');
          const etaEl = document.getElementById('eta');
          
          if (data.status) {
            statusEl.textContent = data.status;
          }
          
          if (data.progress !== null && data.progress !== undefined) {
            progressEl.textContent = Math.round(data.progress) + '%';
            progressBarEl.style.width = data.progress + '%';
          }
          
          if (data.etaSeconds !== undefined && data.etaSeconds > 0) {
            const mins = Math.floor(data.etaSeconds / 60);
            const secs = Math.floor(data.etaSeconds % 60);
            etaEl.textContent = \`Tiempo estimado: \${mins}:\${secs.toString().padStart(2, '0')}\`;
          } else {
            etaEl.textContent = 'Tiempo estimado: --';
          }
          
          if (data.phase === 'complete') {
            statusEl.textContent = 'Descarga completada';
            etaEl.textContent = '';
            
            // Wait 2 seconds then close
            setTimeout(() => {
              window.close();
            }, 2000);
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
    
    // En producción, NO verificar recursos locales (el setup no incluye resources/)
    // Solo verificar en modo desarrollo
    // NOTA: Para probar la ventana de descarga, comentamos la verificación de recursos locales
    /*if (!app.isPackaged) {
      // PRIMERO: Intentar usar recursos locales (carpeta resources/ en la raíz)
      const localResourcesPath = path.join(__dirname, '..', 'resources');
      const localSkyboxes = path.join(localResourcesPath, 'skyboxes');
      const localTextures = path.join(localResourcesPath, 'textures');
      
      // Verificar NO solo que existan las carpetas, sino que tengan archivos
      let hasValidLocalResources = false;
      if (fs.existsSync(localSkyboxes) && fs.existsSync(localTextures)) {
        try {
          const skyboxesFiles = await fs.readdir(localSkyboxes);
          const texturesFiles = await fs.readdir(localTextures);
          
          // Verificar que haya archivos dentro (no solo carpetas vacías)
          if (skyboxesFiles.length > 0 && texturesFiles.length > 0) {
            hasValidLocalResources = true;
            log.info(`✓ Usando recursos locales de la carpeta resources/ (${skyboxesFiles.length} skyboxes, ${texturesFiles.length} textures)`);
          }
        } catch (e) {
          log.warn('Error verificando archivos de recursos locales:', e);
        }
      }
      
      if (hasValidLocalResources) {
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
    } else {
      log.info('Modo producción - omitiendo verificación de recursos locales');
    }*/
    
    log.info('Verificando recursos descargados en userData...');
    
    // SEGUNDO: Si no hay recursos locales, verificar recursos descargados en userData
    const appResourcesPath = configManager.getPath('APP_RESOURCES');
    const appSkyboxes = path.join(appResourcesPath, 'skyboxes', 'ALL SKYBOXES');
    const appTextures = path.join(appResourcesPath, 'textures', 'ruptic-dark', 'Ruptic Dark');
    
    log.info('APP_RESOURCES:', appResourcesPath);
    log.info('appSkyboxes existe:', fs.existsSync(appSkyboxes));
    log.info('appTextures existe:', fs.existsSync(appTextures));
    
    if (fs.existsSync(appSkyboxes) && fs.existsSync(appTextures)) {
      try {
        const skyboxesFiles = await fs.readdir(appSkyboxes);
        const texturesFiles = await fs.readdir(appTextures);
        
        log.info('skyboxesFiles.length:', skyboxesFiles.length);
        log.info('texturesFiles.length:', texturesFiles.length);
        
        if (skyboxesFiles.length > 0 && texturesFiles.length > 0) {
          log.info('✓ Usando recursos descargados previamente');
          RESOURCES_PATH = appResourcesPath;
          SKYBOXES_PATH = getSkyboxesPath();
          TEXTURES_PATH = getTexturesPath();
          UI_IMAGES_PATH = getUiImagesPath();
          DEFAULT_PATHS.resources = RESOURCES_PATH;
          DEFAULT_PATHS.skyboxes = SKYBOXES_PATH;
          DEFAULT_PATHS.textures = TEXTURES_PATH;
          DEFAULT_PATHS.uiImages = UI_IMAGES_PATH;
          log.info('SKYBOXES_PATH (descargado):', SKYBOXES_PATH);
          log.info('TEXTURES_PATH (descargado):', TEXTURES_PATH);
          return true;
        } else {
          log.info('Carpetas existen pero están vacías, se descargará desde R2');
        }
      } catch (e) {
        log.warn('Error leyendo archivos de recursos:', e);
        log.info('Se descargará desde R2 debido a error');
      }
    } else {
      log.info('Carpetas no existen, se descargará desde R2');
    }
    
    // TERCERO: Si no hay recursos, descargar desde R2
    log.info('Recursos no encontrados, iniciando descarga desde R2...');
    
    // Declarar dlWindow FUERA del try para que sea accesible en el catch externo
    let dlWindow = null;
    
    try {
      // Crear ventana de descarga
      dlWindow = createDownloadWindow();
      log.info('Ventana de descarga creada');
      
      // Timeout de 5 minutos para la descarga
      const downloadTimeout = setTimeout(() => {
        log.error('Timeout: La descarga tardó demasiado');
        if (dlWindow && !dlWindow.isDestroyed()) {
          dlWindow.close();
        }
      }, 300000);
      
      try {
        // Obtener manifest desde R2
        log.info('Obteniendo manifest desde R2...');
        const remoteManifest = await updateManager.fetchRemoteManifest();
        log.info('Manifest obtenido:', remoteManifest);
        
        // Descargar recursos usando updateManager
        log.info('Iniciando descarga de recursos...');
        await updateManager.downloadAndApplyResources(remoteManifest, (progress) => {
          // Enviar progreso con todos los datos
          if (dlWindow && !dlWindow.isDestroyed()) {
            dlWindow.webContents.send('download-progress', {
              progress: progress.percent || 0,
              status: progress.phase || 'Descargando...',
              phase: progress.phase || 'downloading',
              downloadedMB: progress.downloadedMB || 0,
              totalMB: progress.totalMB || 0,
              speedMBps: progress.speedMBps || '0',
              etaSeconds: progress.etaSeconds || 0
            });
          }
        });
        
        clearTimeout(downloadTimeout);
        log.info('Recursos descargados correctamente desde R2');
        
        // Enviar señal de completado al renderer (esperará 2 segundos antes de cerrar)
        if (dlWindow && !dlWindow.isDestroyed()) {
          dlWindow.webContents.send('download-progress', {
            progress: 100,
            status: 'Descarga completada',
            phase: 'complete',
            etaSeconds: 0
          });
        }
        
        // Esperar a que el renderer cierre la ventana después de 2 segundos
        await new Promise(resolve => setTimeout(resolve, 2500));
        
        // Cerrar ventana de descarga explícitamente
        if (dlWindow && !dlWindow.isDestroyed()) {
          dlWindow.close();
        }
        
        // Actualizar rutas de recursos
        RESOURCES_PATH = configManager.getPath('APP_RESOURCES');
        SKYBOXES_PATH = getSkyboxesPath();
        TEXTURES_PATH = getTexturesPath();
        UI_IMAGES_PATH = getUiImagesPath();
        DEFAULT_PATHS.resources = RESOURCES_PATH;
        DEFAULT_PATHS.skyboxes = SKYBOXES_PATH;
        DEFAULT_PATHS.textures = TEXTURES_PATH;
        DEFAULT_PATHS.uiImages = UI_IMAGES_PATH;
        log.info('SKYBOXES_PATH (descargado):', SKYBOXES_PATH);
        log.info('TEXTURES_PATH (descargado):', TEXTURES_PATH);
        
        log.info('Descarga completada, retornando true para iniciar app principal');
        return true;
      } catch (downloadError) {
        clearTimeout(downloadTimeout);
        log.error('Error en descarga:', downloadError);
        throw downloadError;
      }
    } catch (downloadError) {
      log.error('Error en descarga:', downloadError);
      
      // Cerrar ventana de descarga si existe
      try {
        if (dlWindow && !dlWindow.isDestroyed()) {
          dlWindow.close();
        }
      } catch (e) { /* ignorar */ }
      
      // Retornar false para permitir manejo de error en app.whenReady()
      return false;
    }
  } catch (error) {
    log.error('Error descargando recursos:', error);
    
    // Cerrar ventana de descarga si existe
    try {
      if (dlWindow && !dlWindow.isDestroyed()) {
        dlWindow.close();
      }
    } catch (e) { /* ignorar */ }
    
    // Retornar false para permitir manejo de error en app.whenReady()
    return false;
  }
}

app.whenReady().then(async () => {
  // Verificar y descargar recursos si es necesario
  log.info('Iniciando verificación de recursos...');
  const resourcesReady = await checkAndDownloadResources();
  log.info('checkAndDownloadResources retornó:', resourcesReady);
  
  if (!resourcesReady) {
    log.info('Recursos no están listos, cerrando app');
    app.quit();
    return;
  }
  
  // Registrar protocolo de archivo para skyboxes descargados e imágenes de UI
  // IMPORTANTE: Registrar DESPUÉS de actualizar rutas en checkAndDownloadResources
  protocol.registerFileProtocol('skybox', (request, callback) => {
    const url = request.url.replace('skybox://', ''); // Remover 'skybox://'
    
    // Usar las rutas dinámicas actuales (ya actualizadas en checkAndDownloadResources)
    const currentResourcesPath = RESOURCES_PATH;
    const currentSkyboxesPath = SKYBOXES_PATH;
    
    // Primero intentar en ui-images (para previews PNG)
    const uiImagesPath = path.join(currentResourcesPath, 'ui-images', url);
    if (fs.existsSync(uiImagesPath)) {
      callback({ path: uiImagesPath });
      return;
    }
    
    // Luego intentar en skyboxes (para archivos .tex)
    const skyboxPath = path.join(currentSkyboxesPath, url);
    callback({ path: skyboxPath });
  });
  
  log.info('Recursos listos, creando ventana principal...');
  
  // Verificar si es la primera vez que el usuario abre la app
  const isFirstTimeResult = await isFirstTime();
  
  // Crear ventana principal
  createWindow();
  log.info('Ventana principal creada');
  
  if (isFirstTimeResult.success && isFirstTimeResult.isFirstTime) {
    log.info('Primera vez que el usuario abre la app - mostrando onboarding');
    // Cargar index.html (Next.js SPA maneja el routing interno)
    const uiPath = path.join(__dirname, '..', 'ui-source', 'out', 'index.html');
    if (fs.existsSync(uiPath)) {
      mainWindow.loadFile(uiPath);
      // Redimensionar ventana para onboarding (tamaño más adecuado para la interfaz)
      mainWindow.setResizable(false);
      mainWindow.setSize(800, 500, true);
      mainWindow.center();
    }
  } else {
    // No es primera vez, cargar index.html normalmente
    // Asegurar que el ejecutor por defecto sea yumman
    try {
      const existing = fs.existsSync(APP_CONFIG_PATH)
        ? JSON.parse(await fs.readFile(APP_CONFIG_PATH, 'utf8').catch(() => '{}'))
        : {};
      
      if (!existing.executor || existing.executor === 'roblox') {
        log.info('Configurando ejecutor por defecto a yumman');
        await writeAppConfigWithLock({ ...existing, executor: 'yumman' });
      }
    } catch (e) {
      log.warn('Error configurando ejecutor por defecto:', e.message);
    }
  }
  
  // Inicializar auto-updater
  updater = new Updater(mainWindow);
  updater.startAutoCheck();

  // Verificar actualizaciones en background
  checkForUpdatesInBackground();
});

// Verificar actualizaciones en background (no bloquea el inicio de la app)
async function checkForUpdatesInBackground() {
  try {
    log.info('Verificando actualizaciones en background...');
    
    // Obtener manifest local
    const localManifest = await updateManager.loadLocalManifest();
    
    if (!localManifest) {
      log.info('No hay manifest local, omitiendo verificación de actualizaciones');
      return;
    }
    
    // Obtener manifest remoto desde R2
    const remoteManifest = await updateManager.fetchRemoteManifest();
    
    if (!remoteManifest) {
      log.info('No se pudo obtener manifest remoto');
      return;
    }
    
    // Usar checkForUpdates que compara versiones
    const updateCheck = await updateManager.checkForUpdates();
    
    if (updateCheck.needsResourcesUpdate) {
      log.info('Actualización de recursos disponible, descargando en background...');
      
      // Descargar y aplicar actualización en background
      await updateManager.downloadAndApplyResources(remoteManifest, (progress) => {
        log.info(`Progreso de actualización: ${progress.percent}% - ${progress.phase}`);
      });
      
      log.info('Actualización aplicada correctamente en background');
    } else {
      log.info('No hay actualizaciones de recursos disponibles');
    }
  } catch (error) {
    log.error('Error verificando actualizaciones en background:', error);
    // No mostrar error al usuario, es background
  }
}

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
    log.error('Error creando backup:', error);
    // Verificar si es error de permisos
    if (error.code === 'EACCES' || error.code === 'EPERM') {
      return { success: false, message: 'Error de permisos: Ejecuta la app como administrador' };
    }
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
    log.info('Aplicando texturas negras');

    // Cerrar Roblox si está corriendo
    const robloxRunning = await isRobloxRunning();
    if (robloxRunning) {
      log.info('Roblox está corriendo, cerrando...');
      await closeRoblox();
      // Esperar un momento para que Roblox se cierre completamente
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    if (!texturePath || !fs.existsSync(texturePath)) {
      return { success: false, message: `Ruta de texturas no válida: ${texturePath}` };
    }

    const backupResult = await ensureTexturesBackup(texturePath);
    if (!backupResult.success) {
      return { success: false, message: `No se pudo crear backup: ${backupResult.message}` };
    }

    // Usar ruta dinámica actual
    const ruptikDarkPath = getTexturesPath();
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
      await writeAppConfigWithLock({ ...existing, darkOn: true, potatoTexOn: false });
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
    log.info(`Aplicando/desactivando texturas oscuras: enabled=${enabled}`);

    // Cerrar Roblox si está corriendo (tanto para activar como desactivar)
    const robloxRunning = await isRobloxRunning();
    if (robloxRunning) {
      log.info('Roblox está corriendo, cerrando...');
      await closeRoblox();
      // Esperar un momento para que Roblox se cierre completamente
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    if (enabled) {
      log.info('=== ACTIVANDO TEXTURAS OSCURAS ===');
      // Aplicar texturas oscuras (reutilizar lógica de apply-black-textures)
      if (!texturePath || !fs.existsSync(texturePath)) {
        return { success: false, message: `Ruta de texturas no válida: ${texturePath}` };
      }

      const backupResult = await ensureTexturesBackup(texturePath);
      if (!backupResult.success) {
        return { success: false, message: `No se pudo crear backup: ${backupResult.message}` };
      }

      // Usar ruta dinámica actual
      const ruptikDarkPath = getTexturesPath();
      if (!fs.existsSync(ruptikDarkPath)) {
        return { success: false, message: 'No se encontró la carpeta de texturas Ruptic Dark' };
      }
      
      const { exec } = require('child_process');
      const items = fs.readdirSync(ruptikDarkPath);
      let copiedCount = 0;
      
      for (const item of items) {
        // SKIP: No copiar la carpeta sky para mantener el skybox seleccionado
        if (item === 'sky') {
          log.info('Saltando carpeta sky (manteniendo skybox seleccionado)');
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
      
      // Persistir estado activado
      try {
        const existing = fs.existsSync(APP_CONFIG_PATH)
          ? JSON.parse(await fs.readFile(APP_CONFIG_PATH, 'utf8').catch(() => '{}'))
          : {};
        await fs.ensureDir(YUMMAN_RIVALS_PATH);
        await writeAppConfigWithLock({ 
          ...existing, 
          darkOn: true, 
          potatoTexOn: false 
        });
        log.info('Estado darkOn=true persistido');
      } catch (e) { 
        log.warn('No se pudo persistir darkOn:', e.message); 
      }
      
      return { success: true, message: `Texturas oscuras aplicadas: ${copiedCount} items` };
    } else {
      // Desactivar texturas oscuras (restaurar originales)
      const backupPath = DEFAULT_PATHS.texturesBackup;
      
      log.info('Backup path:', backupPath);
      log.info('Backup existe:', fs.existsSync(backupPath));
      
      if (!fs.existsSync(backupPath)) {
        log.error('No se encontró backup de texturas originales');
        return { success: false, message: 'No se encontró backup de texturas originales' };
      }

      log.info('Texture path:', texturePath);
      log.info('Texture path existe:', fs.existsSync(texturePath));

      const { exec } = require('child_process');
      log.info('Quitando read-only de texturas...');
      await new Promise(resolve => exec(`attrib -R "${texturePath}" /S /D`, () => resolve()));
      
      // Copiar backup INCLUYENDO la carpeta sky para restaurar cielo original
      const backupItems = fs.readdirSync(backupPath);
      let copiedCount = 0;
      
      for (const item of backupItems) {
        // SKIP: No copiar la carpeta sky (mantener skybox actual)
        if (item === 'sky') {
          log.info('Saltando carpeta sky (manteniendo skybox actual)');
          continue;
        }
        
        const sourcePath = path.join(backupPath, item);
        const destPath = path.join(texturePath, item);
        
        try {
          await fs.copy(sourcePath, destPath, { overwrite: true });
          copiedCount++;
          log.info(`Copiado: ${item}`);
        } catch (error) {
          log.warn(`Error copiando ${item}:`, error.message);
        }
      }
      
      log.info(`Copia completada: ${copiedCount}/${backupItems.length} items`);
      
      log.info('Texturas originales restauradas (cielo mantenido)');
      
      // Persistir estado desactivado
      try {
        const existing = fs.existsSync(APP_CONFIG_PATH)
          ? JSON.parse(await fs.readFile(APP_CONFIG_PATH, 'utf8').catch(() => '{}'))
          : {};
        await fs.ensureDir(YUMMAN_RIVALS_PATH);
        await writeAppConfigWithLock({ 
          ...existing, 
          darkOn: false, 
          potatoTexOn: false 
        });
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
    // Usar ruta dinámica actual
    const darkSkySource = path.join(getTexturesPath(), 'sky');
    
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
    // Cerrar Roblox si está corriendo
    const robloxRunning = await isRobloxRunning();
    if (robloxRunning) {
      log.info('Roblox está corriendo, cerrando...');
      await closeRoblox();
      // Esperar un momento para que Roblox se cierre completamente
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    const backupPath = DEFAULT_PATHS.texturesBackup;
    
    if (!fs.existsSync(backupPath)) {
      try {
        const { spawn } = require('child_process');
        const installerPaths = [
          path.join(RESOURCES_PATH, 'RobloxPlayerInstaller.exe'),
        ];
        
        // Solo agregar fallbacks de desarrollo en modo desarrollo
        if (!app.isPackaged) {
          installerPaths.push(path.join(__dirname, '..', 'resources', 'RobloxPlayerInstaller.exe'));
        }
        
        // Fallback para producción desde app.asar.unpacked
        if (app.isPackaged) {
          installerPaths.push(path.join(process.resourcesPath || '', 'app.asar.unpacked', 'resources', 'RobloxPlayerInstaller.exe'));
        }
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
            await writeAppConfigWithLock({ ...existing, darkOn: false, potatoTexOn: false, potatoOn: false });
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
      await writeAppConfigWithLock({ ...existing, darkOn: false, potatoTexOn: false, potatoOn: false });
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

  // Verificar YUMMAN RIVALS
  if (fs.existsSync(DEFAULT_PATHS.yumman)) {
    const versions = fs.readdirSync(DEFAULT_PATHS.yumman)
      .filter(f => f.startsWith('version-'));
    if (versions.length > 0) {
      log.info(`YUMMAN RIVALS encontrado: ${versions.length} versiones`);
      executors.push({
        id: 'yumman',
        name: 'YUMMAN RIVALS',
        path: DEFAULT_PATHS.yumman,
        found: true
      });
    }
  }

  log.info(`Total ejecutores encontrados: ${executors.length}`);

  return { success: true, executors };
});

// Obtener ruta de texturas según el ejecutor seleccionado
ipcMain.handle('get-executor-texture-path', async (event, executorId) => {
  try {
    log.info(`Obteniendo ruta de texturas para ejecutor: ${executorId}`);
    
    // Usar Roblox normal directamente
    const localAppData = process.env.LOCALAPPDATA;
    if (!localAppData) {
      return { 
        valid: false, 
        message: 'No se pudo obtener la ruta de LOCALAPPDATA' 
      };
    }
    
    const robloxBasePath = path.join(localAppData, 'Roblox', 'Versions');
    log.info(`Ruta base de Roblox: ${robloxBasePath}`);
    
    if (!fs.existsSync(robloxBasePath)) {
      return { 
        valid: false, 
        message: `No se encontró la carpeta de Roblox: ${robloxBasePath}` 
      };
    }
    
    // Buscar la versión más reciente (por fecha de modificación)
    const versions = fs.readdirSync(robloxBasePath)
      .filter(f => f.startsWith('version-'))
      .map(f => ({
        name: f,
        path: path.join(robloxBasePath, f),
        mtime: fs.statSync(path.join(robloxBasePath, f)).mtime
      }))
      .sort((a, b) => b.mtime - a.mtime); // Ordenar por fecha más reciente primero
    
    if (versions.length === 0) {
      return { 
        valid: false, 
        message: 'No se encontraron versiones en la carpeta' 
      };
    }
    
    const latestVersion = versions[0].name;
    const texturePath = path.join(robloxBasePath, latestVersion, 'PlatformContent', 'pc', 'textures');
    
    if (!fs.existsSync(texturePath)) {
      return { 
        valid: false, 
        message: 'No se encontró la carpeta de texturas' 
      };
    }
    
    return { 
      valid: true, 
      message: 'YUMMAN RIVALS encontrado correctamente',
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
    log.info('=== EJECUTANDO MOVE-SILENT.BAT (SKYFIX) ===');

    const { exec } = require('child_process');
    const { promisify } = require('util');
    const crypto = require('crypto');
    const execAsync = promisify(exec);

    // Buscar el bat en múltiples ubicaciones
    const possibleBatPaths = [
      path.join(app.getPath('userData'), 'resources', 'move-silent.bat'),
      path.join(RESOURCES_PATH, 'move-silent.bat'),
    ];
    
    // Solo agregar fallbacks de desarrollo en modo desarrollo
    if (!app.isPackaged) {
      possibleBatPaths.push(path.join(__dirname, '..', 'resources', 'move-silent.bat'));
    }
    
    // Fallback para producción desde app.asar.unpacked
    if (app.isPackaged) {
      possibleBatPaths.push(path.join(process.resourcesPath, 'app.asar.unpacked', 'resources', 'move-silent.bat'));
    }

    let batPath = null;
    for (const p of possibleBatPaths) {
      if (fs.existsSync(p)) {
        batPath = p;
        log.info('Bat encontrado en:', batPath);
        break;
      }
    }

    if (!batPath) {
      console.error('❌ move-silent.bat NO ENCONTRADO');
      log.warn('move-silent.bat no encontrado');
      return { success: false, message: 'move-silent.bat no encontrado' };
    }

    // Verificar hash del archivo para prevenir ejecución de código malicioso
    const expectedHash = '332E57886186E1E391BDAEEE8B57C779941AC889D25E3EDA20B0B3B7C5C459A3';
    const fileBuffer = await fs.readFile(batPath);
    const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex').toUpperCase();

    if (fileHash !== expectedHash) {
      console.error('❌ Hash del archivo .bat no coincide. Archivo puede estar corrupto o modificado.');
      log.error('Hash del archivo .bat no coincide. Esperado:', expectedHash, 'Obtenido:', fileHash);
      return { success: false, message: 'move-silent.bat no pasó verificación de seguridad' };
    }

    log.info('Hash del archivo .bat verificado correctamente');

    // Ejecutar el bat silenciosamente
    const batDir = path.dirname(batPath);
    await execAsync(`"${batPath}"`, {
      shell: 'cmd.exe',
      windowsHide: true,
      cwd: batDir
    });

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
    
    // Eliminar archivos indoor512_*.tex (archivos originales de Roblox que interfieren con skyboxes personalizados)
    try {
      const existingFiles = fs.readdirSync(skyPath);
      for (const file of existingFiles) {
        if (file.startsWith('indoor512_') && file.endsWith('.tex')) {
          const filePath = path.join(skyPath, file);
          await fs.remove(filePath);
          log.info(`Eliminado archivo original: ${file}`);
        }
      }
    } catch (error) {
      log.warn('Error eliminando archivos indoor512_*.tex:', error.message);
    }
    
    // Copiar archivos .tex usando streams para asegurar copia completa
    let copiedCount = 0;
    let failedFiles = [];
    for (const file of texFiles) {
      const src = path.join(skyboxPath, file);
      const dest = path.join(skyPath, file);
      
      try {
        // Usar streams para copia robusta
        const readStream = fs.createReadStream(src);
        const writeStream = fs.createWriteStream(dest);
        
        await new Promise((resolve, reject) => {
          readStream.pipe(writeStream);
          writeStream.on('finish', resolve);
          writeStream.on('error', reject);
          readStream.on('error', reject);
        });
        
        // Verificar que el archivo se copió completamente
        const srcStats = fs.statSync(src);
        const destStats = fs.statSync(dest);
        
        if (srcStats.size !== destStats.size) {
          log.warn(`⚠️ Tamaño incorrecto para ${file}: origen=${srcStats.size}, destino=${destStats.size}`);
          failedFiles.push(file);
        } else {
          copiedCount++;
          log.info(`✓ Copiado ${file} (${destStats.size} bytes)`);
        }
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
    
    // Validación: Si todos los archivos fallaron, considerar error
    if (copiedCount === 0) {
      return {
        success: false,
        message: 'No se pudo copiar ningún archivo .tex. Verifica que los archivos no estén corruptos.'
      };
    }
    
    // Validación: Si faltan archivos críticos, advertir
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
    log.info(`Aplicando skybox: ${skyboxName}`);
    
    // Buscar la carpeta correcta ignorando mayúsculas/minúsculas
    let skyboxPath = path.join(SKYBOXES_PATH, skyboxName);
    if (!fs.existsSync(skyboxPath)) {
      // Si no existe con el nombre exacto, buscar carpeta que coincida ignorando mayúsculas/minúsculas
      const folders = fs.readdirSync(SKYBOXES_PATH);
      const matchingFolder = folders.find(f => f.toLowerCase().replace(/\s+/g, '-') === skyboxName.toLowerCase());
      if (matchingFolder) {
        skyboxPath = path.join(SKYBOXES_PATH, matchingFolder);
        log.info(`Carpeta encontrada con nombre diferente: ${matchingFolder}`);
      }
    }

    log.info(`Ruta del skybox: ${skyboxPath}`);
    
    if (!fs.existsSync(skyboxPath)) {
      return { 
        success: false, 
        message: `Skybox "${skyboxName}" no encontrado en: ${skyboxPath}` 
      };
    }

    // Listar todos los archivos en el skybox
    const allFiles = fs.readdirSync(skyboxPath);

    // Filtrar: copiar solo archivos .tex
    const texFiles = allFiles.filter(f => f.endsWith('.tex'));

    log.info(`Archivos .tex a copiar: ${texFiles.length}`);
    
    if (texFiles.length === 0) {
      return {
        success: false,
        message: `No se encontraron archivos .tex en ${skyboxName}`
      };
    }

    // =====================================================
    // PASO 1: Aplicar hashes base al rbx-storage
    // Roblox necesita estos hashes para cargar skyboxes personalizados
    // Usamos los hashes del skyboxfix como base
    // =====================================================
    log.info('Aplicando hashes base al rbx-storage...');
    await applyRbxStorageAssets();
    
    // =====================================================
    // PASO 2: Aplicar skybox usando método tradicional
    // Copiar archivos .tex a carpeta sky/ en todas las versiones
    // =====================================================
    log.info('Aplicando skybox via método tradicional (carpeta sky/)...');
    
    // DETECTAR SI HAY MÚLTIPLES VERSIONES Y APLICAR EN TODAS
    // Extraer el ejecutor de la ruta (Roblox, Fishstrap, Bloxtrap)
    const pathParts = texturePath.split(path.sep);
    const versionsIndex = pathParts.indexOf('Versions');
    
    let totalVersionsApplied = 0;
    let versionsWithSky = [];
    
    if (versionsIndex !== -1) {
      // Obtener la ruta base hasta "Versions"
      const basePath = pathParts.slice(0, versionsIndex + 1).join(path.sep);

      // Buscar TODAS las versiones
      const allVersions = fs.readdirSync(basePath)
        .filter(f => f.startsWith('version-'))
        .map(f => ({
          name: f,
          path: path.join(basePath, f, 'PlatformContent', 'pc', 'textures'),
          mtime: fs.statSync(path.join(basePath, f)).mtime
        }))
        .sort((a, b) => b.mtime - a.mtime);

      log.info(`Encontradas ${allVersions.length} versiones`);

      // Aplicar en TODAS las versiones
      let failedVersions = [];
      for (const version of allVersions) {
        if (fs.existsSync(version.path)) {
          log.info(`Aplicando en ${version.name}...`);
          const result = await applySkyboxToPath(skyboxPath, texFiles, version.path);
          if (result.success) {
            totalVersionsApplied++;
            versionsWithSky.push(version.name);
            // Verificar si el skybox está completo
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
      
      // Persistir el skybox seleccionado (usar el nombre exacto de la carpeta)
      try {
        const existing = fs.existsSync(APP_CONFIG_PATH)
          ? JSON.parse(await fs.readFile(APP_CONFIG_PATH, 'utf8').catch(() => '{}'))
          : {};
        await fs.ensureDir(YUMMAN_RIVALS_PATH);
        await writeAppConfigWithLock({ 
          ...existing, 
          selectedSky: skyboxName 
        });
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
    log.info('Aplicando en ruta única...');
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
    log.info(`Aplicando atmósfera: ${presetName}`);
    
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

// Handler para verificar y actualizar recursos
ipcMain.handle('check-and-update-resources', async () => {
  try {
    log.info('Verificando recursos...');
    
    // Verificar si los recursos existen
    const resourcesExist = await resourceDownloader.checkResources();
    
    if (!resourcesExist) {
      log.info('Recursos no encontrados, descargando...');
      return { 
        success: false, 
        needsDownload: true,
        message: 'Recursos no encontrados. Descargando...' 
      };
    }
    
    // Aquí podrías agregar lógica para verificar versión de recursos
    // Por ahora, asumimos que si existen están actualizados
    log.info('Recursos verificados correctamente');
    return { 
      success: true, 
      needsDownload: false,
      message: 'Recursos actualizados' 
    };
    
  } catch (error) {
    log.error('Error verificando recursos:', error);
    return { 
      success: false, 
      needsDownload: false,
      message: 'Error al verificar recursos' 
    };
  }
});

// Handler para forzar descarga de recursos
ipcMain.handle('force-download-resources', async () => {
  try {
    log.info('Forzando descarga de recursos...');
    
    // Crear ventana de descarga si no existe
    if (!downloadWindow || downloadWindow.isDestroyed()) {
      createDownloadWindow();
    }
    
    downloadWindow.show();
    
    // Descargar recursos
    await resourceDownloader.downloadResources(
      (percent) => {
        if (downloadWindow && !downloadWindow.isDestroyed()) {
          downloadWindow.webContents.send('download-progress', percent);
        }
      },
      (status) => {
        if (downloadWindow && !downloadWindow.isDestroyed()) {
          downloadWindow.webContents.send('download-status', status);
        }
      }
    );
    
    // Actualizar RESOURCES_PATH después de descargar
    if (isPackaged) {
      RESOURCES_PATH = resourceDownloader.getResourcesPath();
    }
    
    // Cerrar ventana de descarga
    if (downloadWindow && !downloadWindow.isDestroyed()) {
      setTimeout(() => {
        downloadWindow.close();
      }, 2000);
    }
    
    return { success: true, message: 'Recursos descargados correctamente' };
    
  } catch (error) {
    log.error('Error descargando recursos:', error);
    return { success: false, message: `Error: ${error.message}` };
  }
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
  } else if (mode === 'onboarding') {
    mainWindow.setResizable(true);
    mainWindow.setMaximizable(true);
    mainWindow.setMinimumSize(800, 600);
    mainWindow.setSize(900, 650, true);
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
    const uiPath = path.join(__dirname, '..', 'ui-source', 'out', 'index.html');

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
        preload: path.join(__dirname, 'preload.js')
      },
      autoHideMenuBar: true,
      icon: path.join(__dirname, '..', 'icon.ico'),
      backgroundColor: '#1D1B17',
      title: 'YUMMAN RIVALS — Configuración',
      frame: true,
      center: true,
    });

    // Load index.html (Next.js SPA maneja el routing interno)
    settingsWindow.loadFile(uiPath);

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
    let config;
    try {
      config = JSON.parse(await fs.readFile(APP_CONFIG_PATH, 'utf8'));
    } catch (parseError) {
      log.warn('Error parseando APP_CONFIG_PATH:', parseError.message);
      config = {};
    }
    log.info('Re-aplicando configuración antes de lanzar:', JSON.stringify(config));

    // Primero restaurar texturas originales si darkOn es false (antes de re-aplicar skybox)
    if (config.darkOn === false && texturePath && fs.existsSync(texturePath)) {
      // Restaurar texturas originales si darkOn es false
      const backupPath = DEFAULT_PATHS.texturesBackup;
      if (fs.existsSync(backupPath)) {
        log.info('Restaurando texturas originales (darkOn=false)...');
        log.info('Backup path:', backupPath);
        
        // Restaurar SOLO en la instalación de YUMMAN RIVALS (no afectar Roblox normal)
        const yummanVersionsPath = DEFAULT_PATHS.yumman;
        if (fs.existsSync(yummanVersionsPath)) {
          const versions = fs.readdirSync(yummanVersionsPath)
            .filter(f => f.startsWith('version-'))
            .map(f => ({
              name: f,
              path: path.join(yummanVersionsPath, f, 'PlatformContent', 'pc', 'textures')
            }));
          
          log.info(`Encontradas ${versions.length} versiones en YUMMAN RIVALS`);
          
          for (const version of versions) {
            if (!fs.existsSync(version.path)) continue;
            
            log.info(`Restaurando en ${version.name}...`);
            log.info('Texture path:', version.path);
            
            const { exec } = require('child_process');
            await new Promise(resolve => exec(`attrib -R "${version.path}" /S /D`, () => resolve()));
            
            // Borrar solo carpetas específicas de texturas oscuras (rust, sand, etc.)
            const darkTextureFolders = ['rust', 'sand'];
            for (const folder of darkTextureFolders) {
              const folderPath = path.join(version.path, folder);
              if (fs.existsSync(folderPath)) {
                log.info(`Borrando carpeta de texturas oscuras: ${folder}`);
                try {
                  await fs.remove(folderPath);
                } catch (error) {
                  log.warn(`Error borrando ${folder}:`, error.message);
                }
              }
            }
            
            // Copiar backup excluyendo la carpeta sky (mantener cielo actual del cliente)
            const backupItems = fs.readdirSync(backupPath);
            let copiedCount = 0;
            let failedCount = 0;
            
            for (const item of backupItems) {
              // Skip: No copiar la carpeta sky (mantener cielo actual del cliente)
              if (item === 'sky') {
                continue;
              }
              
              // Skip: No copiar la carpeta ui (mantener puntero y otros elementos UI)
              if (item === 'ui') {
                continue;
              }
              
              const sourcePath = path.join(backupPath, item);
              const destPath = path.join(version.path, item);
              
              try {
                await fs.copy(sourcePath, destPath, { overwrite: true });
                copiedCount++;
              } catch (error) {
                failedCount++;
                log.warn(`✗ Error copiando ${item} en ${version.name}:`, error.message);
              }
            }
            
            log.info(`Texturas originales restauradas en ${version.name}: ${copiedCount}/${backupItems.length} items (fallidos: ${failedCount})`);
            
            // Restaurar carpeta content/textures desde DARK OFF (contiene punteros y UI)
            const contentTexturesBackup = path.join(backupPath, 'content');
            // En YUMMAN RIVALS, los punteros están en PlatformContent/pc/textures/content
            const contentTexturesPath = path.join(yummanVersionsPath, version.name, 'PlatformContent', 'pc', 'textures', 'content');
            // También copiar a content/textures (ubicación normal de Roblox)
            const contentTexturesPathNormal = path.join(yummanVersionsPath, version.name, 'content', 'textures');
            
            log.info(`Verificando content/textures backup: ${contentTexturesBackup} - Existe: ${fs.existsSync(contentTexturesBackup)}`);
            log.info(`Verificando content/textures destino: ${contentTexturesPath} - Existe: ${fs.existsSync(contentTexturesPath)}`);
            
            if (fs.existsSync(contentTexturesBackup)) {
              log.info(`Restaurando content/textures desde backup: ${contentTexturesBackup}`);
              try {
                // Copiar a PlatformContent/pc/textures/content
                if (fs.existsSync(contentTexturesPath)) {
                  await fs.remove(contentTexturesPath);
                }
                await fs.copy(contentTexturesBackup, contentTexturesPath, { overwrite: true });
                log.info(`Content/textures restaurado en PlatformContent/pc/textures/content en ${version.name}`);
                
                // También copiar a content/textures (ubicación normal de Roblox)
                if (fs.existsSync(contentTexturesPathNormal)) {
                  await fs.remove(contentTexturesPathNormal);
                }
                await fs.copy(contentTexturesBackup, contentTexturesPathNormal, { overwrite: true });
                log.info(`Content/textures restaurado en content/textures en ${version.name}`);
              } catch (error) {
                log.warn(`Error restaurando content/textures en ${version.name}:`, error.message);
              }
            } else {
              // Si no hay backup, limpiar cache de texturas de Roblox
              if (fs.existsSync(contentTexturesPath)) {
                log.info(`Limpiando cache de texturas en ${contentTexturesPath}...`);
                try {
                  await fs.remove(contentTexturesPath);
                  log.info(`Cache de texturas eliminado completamente en ${version.name}`);
                } catch (error) {
                  log.warn(`Error limpiando cache en ${version.name}:`, error.message);
                }
              }
            }
          }
        } else {
          log.warn('No se encontró instalación de YUMMAN RIVALS');
        }
      } else {
        log.warn('Backup no encontrado para restaurar texturas originales');
      }
    }

    // Re-aplicar skybox si había uno seleccionado (ANTES de re-aplicar dark textures)
    log.info(`Verificando skybox: selectedSky=${config.selectedSky}, texturePath=${texturePath}, existe=${fs.existsSync(texturePath)}`);
    if (config.selectedSky && texturePath && fs.existsSync(texturePath)) {
      const skyboxName = config.selectedSky;
      // Buscar la carpeta correcta ignorando mayúsculas/minúsculas
      let skyboxPath = path.join(SKYBOXES_PATH, skyboxName);
      if (!fs.existsSync(skyboxPath)) {
        const folders = fs.readdirSync(SKYBOXES_PATH);
        const matchingFolder = folders.find(f => f.toLowerCase().replace(/\s+/g, '-') === skyboxName.toLowerCase());
        if (matchingFolder) {
          skyboxPath = path.join(SKYBOXES_PATH, matchingFolder);
          log.info(`Carpeta encontrada con nombre diferente: ${matchingFolder}`);
        }
      }
      log.info(`Skybox path: ${skyboxPath}, existe: ${fs.existsSync(skyboxPath)}`);
      if (fs.existsSync(skyboxPath)) {
        const texFiles = fs.readdirSync(skyboxPath).filter(f => f.endsWith('.tex'));
        log.info(`Archivos .tex encontrados: ${texFiles.length}`);
        if (texFiles.length > 0) {
          // Aplicar hashes base al rbx-storage (ejecutar move-silent.bat)
          await applyRbxStorageAssets();
          // Aplicar método tradicional (carpeta sky/)
          await applySkyboxToPath(skyboxPath, texFiles, texturePath);
          log.info('Skybox re-aplicado:', skyboxName);
        }
      }
    }

    // Re-aplicar dark textures (DESPUÉS del skybox para no sobrescribirlo)
    if (config.darkOn && texturePath && fs.existsSync(texturePath)) {
      // Usar ruta dinámica actual
      const ruptikDarkPath = getTexturesPath();
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
      let src = potatoSrc;
      
      // Solo usar fallback en desarrollo
      if (!app.isPackaged && !fs.existsSync(potatoSrc)) {
        const fallbackSrc = path.join(__dirname, '..', 'resources', 'textures', 'potato', 'PlatformContent', 'pc', 'textures');
        src = fallbackSrc;
      }
      
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
      let baseDir = fontsDir;
      
      // Solo usar fallback en desarrollo
      if (!app.isPackaged && !fs.existsSync(fontsDir)) {
        const fallbackDir = path.join(__dirname, '..', 'resources', 'fonts');
        baseDir = fallbackDir;
      }
      
      const fontSrc = path.join(baseDir, config.activeFont);
      // Usar Roblox normal para las fuentes
      const localAppData = process.env.LOCALAPPDATA;
      const robloxVersionsPath = localAppData ? path.join(localAppData, 'Roblox', 'Versions') : null;
      const robloxFontsPath = robloxVersionsPath ? getRobloxFontsPath(robloxVersionsPath) : null;
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

// Cerrar Roblox
ipcMain.handle('close-roblox', async () => {
  try {
    const result = await closeRoblox();
    return result;
  } catch (error) {
    log.error('Error cerrando Roblox:', error);
    return { success: false, message: error.message };
  }
});

// Lanzar Roblox (sin Roblox Studio)
ipcMain.handle('launch-roblox', async (event, executorId) => {
  try {
    const { spawn } = require('child_process');

    log.info('=== LANZANDO ROBLOX ===');
    log.info('Ejecutor:', executorId);

    // Cerrar Roblox si está corriendo antes de lanzar nueva instancia
    log.info('Cerrando Roblox existente antes de lanzar nueva instancia...');
    const closeResult = await closeRoblox();
    if (closeResult.success) {
      log.info('Roblox cerrado correctamente');
    } else {
      log.warn('No se pudo cerrar Roblox o no estaba corriendo:', closeResult.message);
    }

    // Solo YUMMAN RIVALS es soportado
    if (executorId !== 'yumman') {
      return { success: false, message: 'Solo YUMMAN RIVALS es soportado como ejecutor' };
    }

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
        const texturePath = path.join(versions[0].path, 'PlatformContent', 'pc', 'textures');
        
        if (fs.existsSync(exePath)) {
          log.info('Lanzando desde YUMMAN RIVALS:', exePath);
          
          // Re-aplicar configuración guardada antes de lanzar
          // (Roblox puede haber actualizado y sobreescrito los archivos)
          await reapplyConfigBeforeLaunch(texturePath);
          
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

  } catch (error) {
    log.error('Error lanzando Roblox:', error);
    return { success: false, message: error.message };
  }
});

// Lanzar instancia extra de Roblox (sin cerrar el launcher)
ipcMain.handle('launch-extra-instance', async (event, executorId) => {
  try {
    const { spawn } = require('child_process');

    log.info('=== LANZANDO INSTANCIA EXTRA DE ROBLOX ===');
    log.info('Ejecutor:', executorId);

    // NOTA: No cerrar Roblox existente para permitir múltiples instancias

    // Solo YUMMAN RIVALS es soportado
    if (executorId !== 'yumman') {
      return { success: false, message: 'Solo YUMMAN RIVALS es soportado como ejecutor' };
    }

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
        const texturePath = path.join(versions[0].path, 'PlatformContent', 'pc', 'textures');
        
        if (fs.existsSync(exePath)) {
          log.info('Lanzando instancia extra desde YUMMAN RIVALS:', exePath);
          
          // Re-aplicar configuración guardada antes de lanzar
          await reapplyConfigBeforeLaunch(texturePath);
          
          spawn(exePath, [], { detached: true, stdio: 'ignore' }).unref();
          // NO llamar a app.quit() - mantener el launcher abierto
          return { success: true, message: 'Instancia extra de YUMMAN RIVALS iniciada' };
        }
      }
    }

    // Fallback deeplink
    await shell.openExternal('roblox://');
    return { success: true, message: 'Instancia extra iniciada via deeplink' };

  } catch (error) {
    log.error('Error lanzando instancia extra:', error);
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
    ];
    
    // Solo agregar fallbacks de desarrollo en modo desarrollo
    if (!app.isPackaged) {
      installerPaths.push(path.join(__dirname, '..', 'resources', 'RobloxPlayerInstaller.exe'));
    }
    
    // Fallback para producción desde app.asar.unpacked
    if (app.isPackaged) {
      installerPaths.push(path.join(process.resourcesPath || '', 'app.asar.unpacked', 'resources', 'RobloxPlayerInstaller.exe'));
    }
    
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
  const robloxSettingsPath = path.join(os.homedir(), 'AppData', 'Local', 'Roblox', 'ClientSettings', 'ClientAppSettings.json');
  await fs.ensureDir(path.dirname(robloxSettingsPath));
  await fs.writeFile(robloxSettingsPath, JSON.stringify(flags, null, 2), 'utf8');
  log.info('Flags sincronizados a Roblox ClientSettings');
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
    let p = potatoPath;
    
    // Solo usar fallback en desarrollo
    if (!app.isPackaged && !fs.existsSync(potatoPath)) {
      const fallbackPath = path.join(__dirname, '..', 'resources', 'potatomode.json');
      p = fallbackPath;
    }
    
    if (!fs.existsSync(p)) {
      return { success: false, message: 'Archivo potatomode.json no encontrado' };
    }
    
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
    let src = potatoSrc;
    
    // Solo usar fallback en desarrollo
    if (!app.isPackaged && !fs.existsSync(potatoSrc)) {
      const fallbackSrc = path.join(__dirname, '..', 'resources', 'textures', 'potato', 'PlatformContent', 'pc', 'textures');
      src = fallbackSrc;
    }
    
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

    // Aplicar skybox gris (Chill gray) para potato mode
    try {
      const graySkyPath = path.join(SKYBOXES_PATH, 'Chill gray');
      log.info(`Buscando skybox gris en: ${graySkyPath}`);
      if (fs.existsSync(graySkyPath)) {
        log.info('Aplicando skybox gris para potato mode...');
        const texFiles = fs.readdirSync(graySkyPath).filter(f => f.endsWith('.tex'));
        log.info(`Archivos .tex encontrados en skybox gris: ${texFiles.length}`);
        if (texFiles.length > 0) {
          // Aplicar a todas las versiones de Roblox
          const pathParts = texturePath.split(path.sep);
          const versionsIndex = pathParts.indexOf('Versions');
          
          if (versionsIndex !== -1) {
            const basePath = pathParts.slice(0, versionsIndex + 1).join(path.sep);
            const allVersions = fs.readdirSync(basePath)
              .filter(f => f.startsWith('version-'))
              .map(f => ({
                name: f,
                path: path.join(basePath, f, 'PlatformContent', 'pc', 'textures'),
                mtime: fs.statSync(path.join(basePath, f)).mtime
              }))
              .sort((a, b) => b.mtime - a.mtime);
            
            log.info(`Aplicando skybox gris a ${allVersions.length} versiones`);
            for (const version of allVersions) {
              if (fs.existsSync(version.path)) {
                log.info(`Aplicando skybox gris en ${version.name}...`);
                await applySkyboxToPath(graySkyPath, texFiles, version.path);
              }
            }
          } else {
            // Fallback: aplicar solo a la ruta proporcionada
            await applySkyboxToPath(graySkyPath, texFiles, texturePath);
          }
          
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
      await writeAppConfigWithLock({ 
        ...existing, 
        potatoTexOn: true, 
        darkOn: false,
        selectedSky: 'Chill gray' // Guardar el skybox gris
      });
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
    let dir = fontsDir;
    
    // Solo usar fallback en desarrollo
    if (!app.isPackaged && !fs.existsSync(fontsDir)) {
      const fallbackDir = path.join(__dirname, '..', 'resources', 'fonts');
      dir = fallbackDir;
    }
    
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
    let baseDir = fontsDir;
    
    // Solo usar fallback en desarrollo
    if (!app.isPackaged && !fs.existsSync(fontsDir)) {
      const fallbackDir = path.join(__dirname, '..', 'resources', 'fonts');
      baseDir = fallbackDir;
    }
    
    const fontSrc = path.join(baseDir, fontFile);
    
    if (!fs.existsSync(fontSrc)) {
      return { success: false, message: `Fuente "${fontFile}" no encontrada en ${baseDir}` };
    }
    
    // Usar Roblox normal para las fuentes
    const localAppData = process.env.LOCALAPPDATA;
    if (!localAppData) {
      return { success: false, message: 'No se pudo obtener la ruta de LOCALAPPDATA' };
    }
    
    const robloxVersionsPath = path.join(localAppData, 'Roblox', 'Versions');
    const robloxFontsPath = getRobloxFontsPath(robloxVersionsPath);
    
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
      await writeAppConfigWithLock({ ...existing, activeFont: fontFile });
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
    let destDir = fontsDir;
    
    // Solo usar fallback en desarrollo
    if (!app.isPackaged && !fs.existsSync(fontsDir)) {
      const fallbackDir = path.join(__dirname, '..', 'resources', 'fonts');
      destDir = fallbackDir;
    }
    
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
    
    // Usar Roblox normal para las fuentes
    const localAppData = process.env.LOCALAPPDATA;
    if (!localAppData) {
      return { success: false, message: 'No se pudo obtener la ruta de LOCALAPPDATA' };
    }
    
    const robloxVersionsPath = path.join(localAppData, 'Roblox', 'Versions');
    const robloxFontsPath = getRobloxFontsPath(robloxVersionsPath);
    
    if (!robloxFontsPath) {
      return { success: false, message: 'No se encontró Roblox instalado' };
    }
    
    await fs.copy(backupPath, robloxFontsPath, { overwrite: true });
    
    // Eliminar activeFont de la configuración
    try {
      if (fs.existsSync(APP_CONFIG_PATH)) {
        const existing = JSON.parse(await fs.readFile(APP_CONFIG_PATH, 'utf8').catch(() => '{}'));
        delete existing.activeFont;
        await writeAppConfigWithLock(existing);
        log.info('activeFont eliminado de la configuración');
      }
    } catch (e) {
      log.warn('No se pudo actualizar configuración:', e.message);
    }
    
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
      path.join(app.getPath('userData'), 'resources', 'skyboxes', 'all-skyboxes', 'ALL SKYBOXES'),
    ];
    
    // Solo agregar fallback de desarrollo en modo desarrollo
    if (!app.isPackaged) {
      possibleBases.push(path.join(__dirname, '..', 'resources', 'skyboxes', 'all-skyboxes', 'ALL SKYBOXES'));
    }

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
// APP_CONFIG_PATH está definido al inicio del archivo (línea 87)

ipcMain.handle('save-app-config', async (event, config) => {
  try {
    await fs.ensureDir(YUMMAN_RIVALS_PATH);
    const existing = fs.existsSync(APP_CONFIG_PATH)
      ? JSON.parse(await fs.readFile(APP_CONFIG_PATH, 'utf8').catch(() => '{}'))
      : {};
    const merged = { ...existing, ...config, updatedAt: new Date().toISOString() };
    await writeAppConfigWithLock(merged);
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
    let config;
    try {
      config = JSON.parse(content);
    } catch (parseError) {
      log.warn('Error parseando APP_CONFIG_PATH:', parseError.message);
      config = {};
    }
    return { success: true, config };
  } catch (error) {
    log.warn('Error cargando configuración:', error.message);
    return { success: true, config: {} };
  }
});

// ─── ONBOARDING (PRIMERA VEZ) ─────────────────────────────────────────────────────

// Función auxiliar para verificar si es la primera vez
async function isFirstTime() {
  try {
    if (!fs.existsSync(APP_CONFIG_PATH)) {
      return { success: true, isFirstTime: true };
    }
    const content = await fs.readFile(APP_CONFIG_PATH, 'utf8');
    let config;
    try {
      config = JSON.parse(content);
    } catch (parseError) {
      log.warn('Error parseando APP_CONFIG_PATH en isFirstTime:', parseError.message);
      config = {};
    }
    return { success: true, isFirstTime: !config.onboardingCompleted };
  } catch (error) {
    log.warn('Error verificando primera vez:', error.message);
    return { success: true, isFirstTime: true };
  }
}

// Verificar si es la primera vez que el usuario abre la app
ipcMain.handle('is-first-time', async () => {
  return await isFirstTime();
});

// Forzar onboarding (para testing o reset)
ipcMain.handle('force-onboarding', async () => {
  try {
    if (fs.existsSync(APP_CONFIG_PATH)) {
      const content = await fs.readFile(APP_CONFIG_PATH, 'utf8');
      let config = {};
      try {
        config = JSON.parse(content);
      } catch (e) {
        config = {};
      }
      config.onboardingCompleted = false;
      await fs.writeFile(APP_CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
      log.info('Onboarding forzado - onboardingCompleted establecido en false');
      return { success: true };
    }
    return { success: true, message: 'No existe configuración, se mostrará onboarding' };
  } catch (error) {
    log.error('Error forzando onboarding:', error);
    return { success: false, message: error.message };
  }
});

// Cerrar aplicación
ipcMain.handle('quit-app', async (event, shouldRelaunch = false) => {
  if (shouldRelaunch) {
    app.relaunch();
  }
  app.quit();
  return { success: true };
});

// Marcar onboarding como completado
ipcMain.handle('complete-onboarding', async (event, userData) => {
  try {
    await fs.ensureDir(YUMMAN_RIVALS_PATH);
    const existing = fs.existsSync(APP_CONFIG_PATH)
      ? JSON.parse(await fs.readFile(APP_CONFIG_PATH, 'utf8').catch(() => '{}'))
      : {};
    
    const merged = {
      ...existing,
      onboardingCompleted: true,
      onboardingCompletedAt: new Date().toISOString(),
      robloxUsername: userData.username,
      termsAccepted: userData.termsAccepted,
      updatedAt: new Date().toISOString()
    };
    
    await writeAppConfigWithLock(merged);
    log.info('Onboarding completado para usuario:', userData.username);
    return { success: true };
  } catch (error) {
    log.error('Error completando onboarding:', error);
    return { success: false, message: error.message };
  }
});

// Validar usuario de Roblox usando la API de backend
ipcMain.handle('validate-roblox-user', async (event, username) => {
  try {
    log.info('Validando usuario de Roblox:', username);
    
    // Usar el handler existente de backend-get-roblox-profile
    const result = await backendRequest(`/api/roblox/profile/${username}`);
    
    if (result.success) {
      log.info('Usuario de Roblox validado:', username);
      return { 
        success: true, 
        valid: true, 
        profile: result.profile 
      };
    } else {
      log.warn('Usuario de Roblox no encontrado:', username);
      return { 
        success: true, 
        valid: false, 
        message: 'Usuario no encontrado en Roblox' 
      };
    }
  } catch (error) {
    log.error('Error validando usuario de Roblox:', error);
    return { 
      success: false, 
      valid: false, 
      message: error.message 
    };
  }
});

// ─── BACKEND API INTEGRATION ──────────────────────────────────────────────────────

// Helper function para hacer requests al backend
async function backendRequest(endpoint, method = 'GET', data = null) {
  try {
    const config = {
      method,
      url: `${BACKEND_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (data) {
      config.data = data;
    }

    log.info('Backend request:', method, `${BACKEND_URL}${endpoint}`);
    const response = await axios(config);
    return { success: true, data: response.data };
  } catch (error) {
    log.error('Backend request error:', error.message);
    if (error.response) {
      log.error('Response status:', error.response.status);
      log.error('Response data:', error.response.data);
    }
    return { success: false, error: error.message };
  }
}

// Login de usuario
ipcMain.handle('backend-login-user', async (event, username, dataConsent, appVersion, robloxVersion) => {
  try {
    const result = await backendRequest('/api/auth/login', 'POST', {
      username,
      data_consent: dataConsent,
      app_version: appVersion,
      roblox_version: robloxVersion,
    });
    return result;
  } catch (error) {
    log.error('Error in backend-login-user:', error);
    return { success: false, error: error.message };
  }
});

// Obtener perfil de Roblox
ipcMain.handle('backend-get-roblox-profile', async (event, username) => {
  try {
    const result = await backendRequest(`/api/roblox/profile/${username}`);
    if (result.success && result.data && result.data.profile) {
      return { success: true, profile: result.data.profile };
    }
    return { success: false, error: 'Profile not found' };
  } catch (error) {
    log.error('Error in backend-get-roblox-profile:', error);
    return { success: false, error: error.message };
  }
});

// Obtener estadísticas de usuario
ipcMain.handle('backend-get-user-stats', async (event, username) => {
  try {
    const result = await backendRequest(`/api/users/stats/${username}`);
    if (result.success && result.stats) {
      return { success: true, stats: result.stats };
    }
    return { success: false, error: 'Stats not found' };
  } catch (error) {
    log.error('Error in backend-get-user-stats:', error);
    return { success: false, error: error.message };
  }
});

// Registrar log de uso
ipcMain.handle('backend-log-usage', async (event, userId, eventType, robloxVersion, appVersion, success, errorMessage, metadata) => {
  try {
    const result = await backendRequest('/api/logs/usage', 'POST', {
      user_id: userId,
      event: eventType,
      roblox_version: robloxVersion,
      app_version: appVersion,
      success,
      error_message: errorMessage,
      metadata,
    });
    return result;
  } catch (error) {
    log.error('Error in backend-log-usage:', error);
    return { success: false, error: error.message };
  }
});

// Registrar crash
ipcMain.handle('backend-log-crash', async (event, userId, appVersion, robloxVersion, errorType, errorMessage, stackTrace) => {
  try {
    const result = await backendRequest('/api/logs/crash', 'POST', {
      user_id: userId,
      app_version: appVersion,
      roblox_version: robloxVersion,
      error_type: errorType,
      error_message: errorMessage,
      stack_trace: stackTrace,
    });
    return result;
  } catch (error) {
    log.error('Error in backend-log-crash:', error);
    return { success: false, error: error.message };
  }
});

// Verificar actualización del backend
ipcMain.handle('backend-check-update', async (event, currentVersion, channel) => {
  try {
    const result = await backendRequest(`/api/updates/check?current_version=${currentVersion}&channel=${channel}`);
    return result;
  } catch (error) {
    log.error('Error in backend-check-update:', error);
    return { success: false, error: error.message };
  }
});

// Crear preset
ipcMain.handle('backend-create-preset', async (event, ownerId, name, description, configJson, tags, visibility) => {
  try {
    const result = await backendRequest('/api/presets', 'POST', {
      owner_id: ownerId,
      name,
      description,
      config_json: configJson,
      tags,
      visibility,
    });
    return result;
  } catch (error) {
    log.error('Error in backend-create-preset:', error);
    return { success: false, error: error.message };
  }
});

// Obtener presets
ipcMain.handle('backend-get-presets', async (event, visibility, limit, offset) => {
  try {
    const result = await backendRequest(`/api/presets?visibility=${visibility}&limit=${limit}&offset=${offset}`);
    return result;
  } catch (error) {
    log.error('Error in backend-get-presets:', error);
    return { success: false, error: error.message };
  }
});

// Obtener preset específico
ipcMain.handle('backend-get-preset', async (event, id) => {
  try {
    const result = await backendRequest(`/api/presets/${id}`);
    return result;
  } catch (error) {
    log.error('Error in backend-get-preset:', error);
    return { success: false, error: error.message };
  }
});

// Descargar preset (incrementar contador)
ipcMain.handle('backend-download-preset', async (event, id) => {
  try {
    const result = await backendRequest(`/api/presets/${id}/download`, 'POST');
    return result;
  } catch (error) {
    log.error('Error in backend-download-preset:', error);
    return { success: false, error: error.message };
  }
});

// Dar like a preset
ipcMain.handle('backend-like-preset', async (event, id, userId) => {
  try {
    const result = await backendRequest(`/api/presets/${id}/like`, 'POST', { user_id: userId });
    return result;
  } catch (error) {
    log.error('Error in backend-like-preset:', error);
    return { success: false, error: error.message };
  }
});

// Quitar like de preset
ipcMain.handle('backend-unlike-preset', async (event, id, userId) => {
  try {
    const result = await backendRequest(`/api/presets/${id}/like`, 'DELETE', { user_id: userId });
    return result;
  } catch (error) {
    log.error('Error in backend-unlike-preset:', error);
    return { success: false, error: error.message };
  }
});

// Reportar preset
ipcMain.handle('backend-report-preset', async (event, id, userId, reason) => {
  try {
    const result = await backendRequest(`/api/presets/${id}/report`, 'POST', {
      user_id: userId,
      reason,
    });
    return result;
  } catch (error) {
    log.error('Error in backend-report-preset:', error);
    return { success: false, error: error.message };
  }
});

// Obtener presets de usuario
ipcMain.handle('backend-get-user-presets', async (event, userId) => {
  try {
    const result = await backendRequest(`/api/presets/user/${userId}`);
    return result;
  } catch (error) {
    log.error('Error in backend-get-user-presets:', error);
    return { success: false, error: error.message };
  }
});

// Actualizar preset
ipcMain.handle('backend-update-preset', async (event, id, userId, name, description, configJson, tags, visibility) => {
  try {
    const result = await backendRequest(`/api/presets/${id}`, 'PUT', {
      user_id: userId,
      name,
      description,
      config_json: configJson,
      tags,
      visibility,
    });
    return result;
  } catch (error) {
    log.error('Error in backend-update-preset:', error);
    return { success: false, error: error.message };
  }
});

// Eliminar preset
ipcMain.handle('backend-delete-preset', async (event, id, userId) => {
  try {
    const result = await backendRequest(`/api/presets/${id}`, 'DELETE', { user_id: userId });
    return result;
  } catch (error) {
    log.error('Error in backend-delete-preset:', error);
    return { success: false, error: error.message };
  }
});


