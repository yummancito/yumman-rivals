   const { contextBridge, ipcRenderer } = require('electron');

// Exponer API segura al renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Obtener rutas por defecto
  getDefaultPaths: () => ipcRenderer.invoke('get-default-paths'),
  
  // Seleccionar carpeta
  selectFolder: (title) => ipcRenderer.invoke('select-folder', title),
  
  // Verificar ruta de Roblox
  verifyRobloxPath: (path) => ipcRenderer.invoke('verify-roblox-path', path),
  
  // Crear backup
  createBackup: (texturePath) => ipcRenderer.invoke('create-backup', texturePath),
  
  // Aplicar texturas negras
  applyBlackTextures: (texturePath) => ipcRenderer.invoke('apply-black-textures', texturePath),
  
  // Aplicar cielo oscuro
  applyDarkSky: (texturePath) => ipcRenderer.invoke('apply-dark-sky', texturePath),
  
  // Restaurar originales
  restoreOriginal: (texturePath) => ipcRenderer.invoke('restore-original', texturePath),
  
  // Aplicar preset personalizado
  applyCustomPreset: (presetName, texturePath) => ipcRenderer.invoke('apply-custom-preset', presetName, texturePath),
  
  // Obtener presets disponibles
  getAvailablePresets: () => ipcRenderer.invoke('get-available-presets'),
  
  // Seleccionar imagen para skybox
  selectSkyImage: () => ipcRenderer.invoke('select-sky-image'),
  
  // Aplicar skybox personalizado
  applyCustomSky: (imagePath, texturePath) => ipcRenderer.invoke('apply-custom-sky', imagePath, texturePath),
  
  // Aplicar skybox por nombre de carpeta
  applySkyboxByName: (skyboxName, texturePath) => ipcRenderer.invoke('apply-skybox-by-name', skyboxName, texturePath),
  
  // Alias para compatibilidad con el frontend
  applySky: (skyboxName, texturePath) => ipcRenderer.invoke('apply-skybox-by-name', skyboxName, texturePath),
  
  // Obtener ruta de preview
  getPreviewPath: () => ipcRenderer.invoke('get-preview-path'),
  
  // Detectar ejecutores disponibles
  detectExecutors: () => ipcRenderer.invoke('detect-executors'),
  
  // Obtener ruta de texturas según ejecutor
  getExecutorTexturePath: (executorId, customPath) => ipcRenderer.invoke('get-executor-texture-path', executorId, customPath),
  
  // Abrir enlace de donación
  openDonationLink: () => ipcRenderer.invoke('open-donation-link'),
  
  // Auto-updates
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  checkAndUpdateResources: () => ipcRenderer.invoke('check-and-update-resources'),
  forceDownloadResources: () => ipcRenderer.invoke('force-download-resources'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  onUpdateStatus: (callback) => ipcRenderer.on('update-status', (event, data) => callback(data)),
  
  // Recursos
  checkResources: () => ipcRenderer.invoke('check-resources'),
  redownloadResources: () => ipcRenderer.invoke('redownload-resources'),
  onDownloadProgress: (callback) => ipcRenderer.on('download-progress', (event, data) => callback(data)),

  // Launcher
  launchRoblox: (executorId, customPath) => ipcRenderer.invoke('launch-roblox', executorId, customPath),
  resizeWindow: (mode) => ipcRenderer.invoke('resize-window', mode),
  openSettingsWindow: () => ipcRenderer.invoke('open-settings-window'),

  // Instalador de Roblox
  installRoblox: () => ipcRenderer.invoke('install-roblox'),

  // Flags (ClientAppSettings)
  getFlags: () => ipcRenderer.invoke('get-flags'),
  saveFlags: (flags) => ipcRenderer.invoke('save-flags', flags),
  clearFlags: () => ipcRenderer.invoke('clear-flags'),
  getPotatoFlags: () => ipcRenderer.invoke('get-potato-flags'),

  // Potato textures
  applyPotatoTextures: (texturePath) => ipcRenderer.invoke('apply-potato-textures', texturePath),

  // Fuentes
  getAvailableFonts: () => ipcRenderer.invoke('get-available-fonts'),
  applyFontPack: (packName) => ipcRenderer.invoke('apply-font-pack', packName),
  restoreFonts: () => ipcRenderer.invoke('restore-fonts'),
  importFont: () => ipcRenderer.invoke('import-font'),

  // Cielo personalizado desde imagen
  selectAndConvertSky: () => ipcRenderer.invoke('select-and-convert-sky'),
  applyConvertedSky: (texturePath) => ipcRenderer.invoke('apply-converted-sky', texturePath),

  // Abrir enlace externo en el navegador del sistema
  openExternal: (url) => ipcRenderer.invoke('open-external', url),

  // Múltiples instancias de Roblox
  launchExtraInstance: (executorId, customPath) => ipcRenderer.invoke('launch-extra-instance', executorId, customPath),

  // Persistencia de configuración de la app (ejecutor, skybox, texturas, etc.)
  saveAppConfig: (config) => ipcRenderer.invoke('save-app-config', config),
  loadAppConfig: () => ipcRenderer.invoke('load-app-config'),
});
