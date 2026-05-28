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
  getExecutorTexturePath: (executorId) => ipcRenderer.invoke('get-executor-texture-path', executorId),
  
  // Abrir enlace de donación
  openDonationLink: () => ipcRenderer.invoke('open-donation-link'),
  
  // Auto-updates
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  checkAndUpdateResources: () => ipcRenderer.invoke('check-and-update-resources'),
  forceDownloadResources: () => ipcRenderer.invoke('force-download-resources'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  onUpdateStatus: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('update-status', listener);
    return () => ipcRenderer.removeListener('update-status', listener);
  },

  // Recursos
  checkResources: () => ipcRenderer.invoke('check-resources'),
  redownloadResources: () => ipcRenderer.invoke('redownload-resources'),
  onDownloadProgress: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('download-progress', listener);
    return () => ipcRenderer.removeListener('download-progress', listener);
  },

  // Launcher
  launchRoblox: (executorId) => ipcRenderer.invoke('launch-roblox', executorId),
  resizeWindow: (mode) => ipcRenderer.invoke('resize-window', mode),
  openSettingsWindow: () => ipcRenderer.invoke('open-settings-window'),

  // Instalador de Roblox
  installRoblox: () => ipcRenderer.invoke('install-roblox'),

  // Flags (ClientAppSettings)
  getFlags: () => ipcRenderer.invoke('get-flags'),
  saveFlags: (flags) => ipcRenderer.invoke('save-flags', flags),
  clearFlags: () => ipcRenderer.invoke('clear-flags'),
  getPotatoFlags: () => ipcRenderer.invoke('get-potato-flags'),

  // Texturas
  applyDarkTextures: (enabled, texturePath) => ipcRenderer.invoke('apply-dark-textures', enabled, texturePath),
  restoreOriginal: (texturePath) => ipcRenderer.invoke('restore-original', texturePath),

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

  // Persistencia de configuración de la app (ejecutor, skybox, texturas, etc.)
  saveAppConfig: (config) => ipcRenderer.invoke('save-app-config', config),
  loadAppConfig: () => ipcRenderer.invoke('load-app-config'),

  // Onboarding (primera vez)
  isFirstTime: () => ipcRenderer.invoke('is-first-time'),
  forceOnboarding: () => ipcRenderer.invoke('force-onboarding'),
  completeOnboarding: (userData) => ipcRenderer.invoke('complete-onboarding', userData),
  validateRobloxUser: (username) => ipcRenderer.invoke('validate-roblox-user', username),

  // Backend API integration
  loginUser: (username, dataConsent, appVersion, robloxVersion) => 
    ipcRenderer.invoke('backend-login-user', username, dataConsent, appVersion, robloxVersion),
  
  getRobloxProfile: (username) => 
    ipcRenderer.invoke('backend-get-roblox-profile', username),
  
  logUsage: (userId, event, robloxVersion, appVersion, success, errorMessage, metadata) => 
    ipcRenderer.invoke('backend-log-usage', userId, event, robloxVersion, appVersion, success, errorMessage, metadata),
  
  logCrash: (userId, appVersion, robloxVersion, errorType, errorMessage, stackTrace) => 
    ipcRenderer.invoke('backend-log-crash', userId, appVersion, robloxVersion, errorType, errorMessage, stackTrace),
  
  checkBackendUpdate: (currentVersion, channel) => 
    ipcRenderer.invoke('backend-check-update', currentVersion, channel),

  // Presets Cloud API
  createPreset: (ownerId, name, description, configJson, tags, visibility) => 
    ipcRenderer.invoke('backend-create-preset', ownerId, name, description, configJson, tags, visibility),
  
  getPresets: (visibility, limit, offset) => 
    ipcRenderer.invoke('backend-get-presets', visibility, limit, offset),
  
  getPreset: (id) => 
    ipcRenderer.invoke('backend-get-preset', id),
  
  downloadPreset: (id) => 
    ipcRenderer.invoke('backend-download-preset', id),
  
  likePreset: (id, userId) => 
    ipcRenderer.invoke('backend-like-preset', id, userId),
  
  unlikePreset: (id, userId) => 
    ipcRenderer.invoke('backend-unlike-preset', id, userId),
  
  reportPreset: (id, userId, reason) => 
    ipcRenderer.invoke('backend-report-preset', id, userId, reason),
  
  getUserPresets: (userId) => 
    ipcRenderer.invoke('backend-get-user-presets', userId),
  
  updatePreset: (id, userId, name, description, configJson, tags, visibility) => 
    ipcRenderer.invoke('backend-update-preset', id, userId, name, description, configJson, tags, visibility),
  
  deletePreset: (id, userId) => 
    ipcRenderer.invoke('backend-delete-preset', id, userId),

  getUserStats: (username) => 
    ipcRenderer.invoke('backend-get-user-stats', username),

  // Cerrar aplicación
  quit: () => ipcRenderer.invoke('quit-app'),

  // NUEVOS CANALES (main → renderer):
  onUpdateResourcesAvailable: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('update:resources-available', listener);
    return () => ipcRenderer.removeListener('update:resources-available', listener);
  },

  onUpdateProgress: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('update:progress', listener);
    return () => ipcRenderer.removeListener('update:progress', listener);
  },

  onUpdateCompleted: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('update:completed', listener);
    return () => ipcRenderer.removeListener('update:completed', listener);
  },

  onUpdateFailed: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('update:failed', listener);
    return () => ipcRenderer.removeListener('update:failed', listener);
  },

  onInstallProgress: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('install:progress', listener);
    return () => ipcRenderer.removeListener('install:progress', listener);
  },

  onInstallCompleted: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('install:completed', listener);
    return () => ipcRenderer.removeListener('install:completed', listener);
  },

  // NUEVOS CANALES (renderer → main):
  updateStartDownload: () => ipcRenderer.invoke('update:start-download'),
  updateCheckNow: () => ipcRenderer.invoke('update:check-now'),
});
