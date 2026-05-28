// API para comunicarse con Electron

// Mapeo de IDs de skybox a nombres de carpetas reales
const skyboxMap: Record<string, string> = {
  'night': 'Night',
  'aurora': 'Aurora',
  'moonlight': 'Moonlight',
  'space-blue': 'Space Blue',
  'universe': 'Universe',
  'pink-sunrise': 'Pink Sunrise',
  'beautiful': 'Beautiful',
  'neonsky': 'NeonSky',
  'neonsky2': 'NeonSky2',
  'hades': 'Hades',
  'spooky': 'Spooky',
  'goodnight': 'Goodnight',
  'overcast': 'Overcast',
  'hazy': 'Hazy',
  'blue': 'Blue',
  'light-blue': 'Light Blue',
  'cyan': 'Cyan',
  'orange': 'Orange',
  'red': 'Red',
  'chill-pink': 'Chill pink',
  'light-pink': 'Light pink',
  'chill-gray': 'Chill gray',
  'pandora': 'Pandora',
  'chromakey': 'ChromaKey',
  'emo': 'Emo',
};

type ApiResult = { success: boolean; message?: string }

export const electronAPI = {
  // Verificar si estamos en Electron
  isElectron() {
    return typeof window !== 'undefined' && !!window.electronAPI
  },

  async getAppVersion(): Promise<string | null> {
    if (!this.isElectron()) return null
    return (await window.electronAPI?.getAppVersion?.()) ?? null
  },

  async checkForUpdates(): Promise<ApiResult> {
    if (!this.isElectron()) return { success: false, message: "No disponible en modo web" }
    const r = await window.electronAPI?.checkForUpdates?.()
    return (r as ApiResult) ?? { success: true }
  },

  async checkAndUpdateResources(): Promise<ApiResult> {
    if (!this.isElectron()) return { success: false, message: "No disponible en modo web" }
    const r = await window.electronAPI?.checkAndUpdateResources?.()
    return (r as ApiResult) ?? { success: true }
  },

  async forceDownloadResources(): Promise<ApiResult> {
    if (!this.isElectron()) return { success: false, message: "No disponible en modo web" }
    const r = await window.electronAPI?.forceDownloadResources?.()
    return (r as ApiResult) ?? { success: true }
  },

  async resizeWindow(mode: string): Promise<ApiResult> {
    if (!this.isElectron()) return { success: false, message: "No disponible en modo web" }
    const r = await window.electronAPI?.resizeWindow?.(mode)
    return (r as ApiResult) ?? { success: true }
  },

  async launchRoblox(executorId: string, customPath?: string): Promise<ApiResult> {
    if (!this.isElectron()) return { success: false, message: "No disponible en modo web" }
    return await window.electronAPI!.launchRoblox(executorId, customPath)
  },

  // Aplicar cielo por ID
  async applySky(skyId: string, texturePath: string) {
    if (!this.isElectron()) {
      console.log('Simulando aplicación de cielo:', skyId);
      return { success: true, message: 'Cielo aplicado (modo web)' };
    }
    
    const api = window.electronAPI!;
    const folderName = skyboxMap[skyId] || skyId;
    
    console.log(`Aplicando skybox: ${skyId} -> ${folderName}`);
    return await api.applySkyboxByName(folderName, texturePath);
  },

  // Aplicar texturas oscuras
  async applyDarkTextures(enabled: boolean, texturePath: string) {
    if (!this.isElectron()) {
      console.log('Simulando texturas oscuras:', enabled);
      return { success: true, message: enabled ? 'Texturas oscuras activadas' : 'Texturas restauradas' };
    }
    
    const api = window.electronAPI!;
    if (enabled) {
      return await api.applyBlackTextures(texturePath);
    } else {
      return await api.restoreOriginal(texturePath);
    }
  },

  // Aplicar cielo personalizado
  async applyCustomSky(imagePath: string, texturePath: string) {
    if (!this.isElectron()) {
      console.log('Simulando cielo personalizado');
      return { success: true, message: 'Cielo personalizado aplicado' };
    }
    
    const api = window.electronAPI!;
    return await api.applyCustomSky(imagePath, texturePath);
  },

  // Seleccionar imagen de cielo
  async selectSkyImage() {
    if (!this.isElectron()) {
      console.log('Simulando selección de imagen');
      return { success: false, message: 'No disponible en modo web' };
    }
    
    const api = window.electronAPI!;
    return await api.selectSkyImage();
  },

  // Obtener rutas por defecto
  async getDefaultPaths() {
    if (!this.isElectron()) {
      return {
        roblox: `C:\\Users\\User\\AppData\\Local\\Roblox\\Versions`,
        fishstrap: `C:\\Users\\User\\AppData\\Local\\Fishstrap\\Versions`,
      };
    }
    
    const api = window.electronAPI!;
    return await api.getDefaultPaths();
  },

  // Verificar ruta de Roblox
  async verifyRobloxPath(path: string) {
    if (!this.isElectron()) {
      return { 
        valid: true, 
        texturePath: path + '\\content\\textures',
        version: 'version-test'
      };
    }
    
    const api = window.electronAPI!;
    return await api.verifyRobloxPath(path);
  },

  // Detectar ejecutores disponibles
  async detectExecutors() {
    if (!this.isElectron()) {
      return {
        success: true,
        executors: [
          { id: 'yumman',  name: 'YUMMAN RIVALS', path: 'C:\\Users\\User\\AppData\\Local\\YUMMAN RIVALS\\Versions', found: true },
          { id: 'roblox',  name: 'Roblox Normal',  path: 'C:\\Users\\User\\AppData\\Local\\Roblox\\Versions',        found: true }
        ]
      };
    }
    
    const api = window.electronAPI!;
    return await api.detectExecutors();
  },

  // Obtener ruta de texturas según ejecutor
  async getExecutorTexturePath(executorId: string, customPath?: string) {
    if (!this.isElectron()) {
      return {
        valid: true,
        texturePath: 'C:\\Users\\User\\AppData\\Local\\Roblox\\Versions\\version-test\\PlatformContent\\pc\\textures',
        version: 'version-test',
        executor: executorId
      };
    }
    
    const api = window.electronAPI!;
    return await api.getExecutorTexturePath(executorId, customPath);
  },

  // Abrir enlace externo
  async openExternal(url: string) {
    if (!this.isElectron()) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }
    
    const api = window.electronAPI!;
    // Usar el handler IPC open-external que llama shell.openExternal de forma segura
    if (api.openExternal) {
      await api.openExternal(url);
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  },

  // Restaurar texturas originales
  async restoreOriginal(texturePath: string) {
    if (!this.isElectron()) {
      console.log('Simulando restauración de texturas originales');
      return { success: true, message: 'Texturas restauradas (modo web)' };
    }
    
    const api = window.electronAPI!;
    return await api.restoreOriginal(texturePath);
  },

  // Lanzar instancia extra de Roblox (sin cerrar el launcher)
  async launchExtraInstance(executorId: string, customPath?: string) {
    if (!this.isElectron()) {
      console.log('Simulando instancia extra');
      return { success: true, message: 'Instancia extra (modo web)' };
    }
    const api = window.electronAPI!;
    return await api.launchExtraInstance(executorId, customPath);
  },

  // Guardar configuración persistente de la app
  async saveAppConfig(config: Record<string, unknown>) {
    if (!this.isElectron()) return { success: true };
    const api = window.electronAPI!;
    return await api.saveAppConfig(config);
  },

  // Cargar configuración persistente de la app
  async loadAppConfig() {
    if (!this.isElectron()) return { success: true, config: {} };
    const api = window.electronAPI!;
    return await api.loadAppConfig();
  },

  // Verificar si es la primera vez que el usuario abre la app
  async isFirstTime() {
    if (!this.isElectron()) return { success: true, isFirstTime: false };
    const api = window.electronAPI!;
    return await api.isFirstTime();
  },

  // Forzar onboarding (para testing o reset)
  async forceOnboarding() {
    if (!this.isElectron()) return { success: false, message: 'No disponible en modo web' };
    const api = window.electronAPI!;
    return await api.forceOnboarding();
  },

  // Backend API integration
  async loginUser(username: string, dataConsent: boolean, appVersion: string, robloxVersion: string) {
    if (!this.isElectron()) return { success: false, error: 'No disponible en modo web' };
    const api = window.electronAPI!;
    return await api.loginUser(username, dataConsent, appVersion, robloxVersion);
  },

  async getRobloxProfile(username: string) {
    if (!this.isElectron()) return { success: false, error: 'No disponible en modo web' };
    const api = window.electronAPI!;
    return await api.getRobloxProfile(username);
  },

  async logUsage(userId: string, event: string, robloxVersion: string, appVersion: string, success: boolean, errorMessage: string, metadata: Record<string, unknown>) {
    if (!this.isElectron()) return { success: true, sampled: true };
    const api = window.electronAPI!;
    return await api.logUsage(userId, event, robloxVersion, appVersion, success, errorMessage, metadata);
  },

  async logCrash(userId: string, appVersion: string, robloxVersion: string, errorType: string, errorMessage: string, stackTrace: string) {
    if (!this.isElectron()) return { success: true };
    const api = window.electronAPI!;
    return await api.logCrash(userId, appVersion, robloxVersion, errorType, errorMessage, stackTrace);
  },

  async checkBackendUpdate(currentVersion: string, channel: string) {
    if (!this.isElectron()) return { success: false, updateAvailable: false };
    const api = window.electronAPI!;
    return await api.checkBackendUpdate(currentVersion, channel);
  },

  // Presets Cloud API
  async createPreset(ownerId: string, name: string, description: string, configJson: Record<string, unknown>, tags: string[], visibility: string) {
    if (!this.isElectron()) return { success: false, error: 'No disponible en modo web' };
    const api = window.electronAPI!;
    return await api.createPreset(ownerId, name, description, configJson, tags, visibility);
  },

  async getPresets(visibility: string, limit: number, offset: number) {
    if (!this.isElectron()) return { success: false, presets: [] };
    const api = window.electronAPI!;
    return await api.getPresets(visibility, limit, offset);
  },

  async getPreset(id: string) {
    if (!this.isElectron()) return { success: false, preset: null };
    const api = window.electronAPI!;
    return await api.getPreset(id);
  },

  async downloadPreset(id: string) {
    if (!this.isElectron()) return { success: false };
    const api = window.electronAPI!;
    return await api.downloadPreset(id);
  },

  async likePreset(id: string, userId: string) {
    if (!this.isElectron()) return { success: false };
    const api = window.electronAPI!;
    return await api.likePreset(id, userId);
  },

  async unlikePreset(id: string, userId: string) {
    if (!this.isElectron()) return { success: false };
    const api = window.electronAPI!;
    return await api.unlikePreset(id, userId);
  },

  async reportPreset(id: string, userId: string, reason: string) {
    if (!this.isElectron()) return { success: false };
    const api = window.electronAPI!;
    return await api.reportPreset(id, userId, reason);
  },

  async getUserPresets(userId: string) {
    if (!this.isElectron()) return { success: false, presets: [] };
    const api = window.electronAPI!;
    return await api.getUserPresets(userId);
  },

  async updatePreset(id: string, userId: string, name: string, description: string, configJson: Record<string, unknown>, tags: string[], visibility: string) {
    if (!this.isElectron()) return { success: false };
    const api = window.electronAPI!;
    return await api.updatePreset(id, userId, name, description, configJson, tags, visibility);
  },

  async deletePreset(id: string, userId: string) {
    if (!this.isElectron()) return { success: false };
    const api = window.electronAPI!;
    return await api.deletePreset(id, userId);
  },

  async getUserStats(username: string) {
    if (!this.isElectron()) return { success: false, stats: null };
    const api = window.electronAPI!;
    return await api.getUserStats(username);
  },
};
