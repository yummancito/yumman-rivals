const { app } = require('electron');
const path = require('path');
const fs = require('fs-extra');
const os = require('os');
const log = require('electron-log');

class ConfigManager {
  constructor() {
    // Rutas dinámicas usando app.getPath()
    this.APP_USER_DATA = app.getPath('userData');
    this.APP_RESOURCES = path.join(this.APP_USER_DATA, 'resources');
    this.TEXTURES_PATH = path.join(this.APP_RESOURCES, 'textures');
    this.SKYBOXES_PATH = path.join(this.APP_RESOURCES, 'skyboxes');
    this.FONTS_PATH = path.join(this.APP_RESOURCES, 'fonts');
    this.VERSIONS_PATH = path.join(this.APP_RESOURCES, 'Versions');
    this.CACHE_PATH = path.join(this.APP_USER_DATA, 'cache');
    this.TEMP_PATH = path.join(this.APP_USER_DATA, 'cache', 'temp');
    this.CONFIG_PATH = path.join(this.APP_USER_DATA, 'config');
    this.LOGS_PATH = path.join(this.APP_USER_DATA, 'logs');
    this.MANIFEST_PATH = path.join(this.CONFIG_PATH, 'manifest.json');
    this.APP_CONFIG_PATH = path.join(this.CONFIG_PATH, 'app-config.json');
    this.LOCK_PATH = path.join(this.CONFIG_PATH, 'lock.json');
    this.BACKUP_PATH = path.join(this.APP_USER_DATA, 'resources-backup');

    // Rutas adicionales para compatibilidad con main.js existente
    this.YUMMAN_RIVALS_PATH = path.join(os.homedir(), 'AppData', 'Local', 'YUMMAN RIVALS');
    this.YUMMAN_RIVALS_VERSIONS_PATH = path.join(this.YUMMAN_RIVALS_PATH, 'Versions');
    this.YUMMAN_RIVALS_CLIENT_SETTINGS = path.join(this.YUMMAN_RIVALS_PATH, 'ClientSettings', 'ClientAppSettings.json');
    this.APP_CONFIG_LOCK_PATH = path.join(this.YUMMAN_RIVALS_PATH, 'app-config.lock');
    this.TEXTURES_BACKUP_PATH = path.join(this.APP_RESOURCES, 'textures', 'DARK OFF');
    this.CUSTOM_SKYBOX_PATH = path.join(this.APP_USER_DATA, 'custom_skybox');
    this.PREVIEWS_PATH = path.join(this.APP_USER_DATA, 'previews');

    // Configuración de R2 (URL pública, no secreta)
    this.R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || 'https://pub-6fe6ab5451da4b06907a0496a047fd83.r2.dev';

    log.info('ConfigManager initialized with dynamic paths');
  }

  async ensureDirectories() {
    try {
      const directories = [
        this.APP_RESOURCES,
        this.TEXTURES_PATH,
        this.SKYBOXES_PATH,
        this.FONTS_PATH,
        this.VERSIONS_PATH,
        this.CACHE_PATH,
        this.TEMP_PATH,
        this.CONFIG_PATH,
        this.LOGS_PATH,
        this.BACKUP_PATH
      ];

      for (const dir of directories) {
        await fs.ensureDir(dir);
      }

      log.info('All directories ensured');
    } catch (error) {
      log.error('Error ensuring directories:', error);
      throw error;
    }
  }

  getPath(name) {
    const pathMap = {
      'APP_USER_DATA': this.APP_USER_DATA,
      'APP_RESOURCES': this.APP_RESOURCES,
      'TEXTURES_PATH': this.TEXTURES_PATH,
      'SKYBOXES_PATH': this.SKYBOXES_PATH,
      'FONTS_PATH': this.FONTS_PATH,
      'VERSIONS_PATH': this.VERSIONS_PATH,
      'CACHE_PATH': this.CACHE_PATH,
      'TEMP_PATH': this.TEMP_PATH,
      'CONFIG_PATH': this.CONFIG_PATH,
      'LOGS_PATH': this.LOGS_PATH,
      'MANIFEST_PATH': this.MANIFEST_PATH,
      'APP_CONFIG_PATH': this.APP_CONFIG_PATH,
      'LOCK_PATH': this.LOCK_PATH,
      'BACKUP_PATH': this.BACKUP_PATH,
      'YUMMAN_RIVALS_PATH': this.YUMMAN_RIVALS_PATH,
      'YUMMAN_RIVALS_VERSIONS_PATH': this.YUMMAN_RIVALS_VERSIONS_PATH,
      'YUMMAN_RIVALS_CLIENT_SETTINGS': this.YUMMAN_RIVALS_CLIENT_SETTINGS,
      'APP_CONFIG_LOCK_PATH': this.APP_CONFIG_LOCK_PATH,
      'TEXTURES_BACKUP_PATH': this.TEXTURES_BACKUP_PATH,
      'CUSTOM_SKYBOX_PATH': this.CUSTOM_SKYBOX_PATH,
      'PREVIEWS_PATH': this.PREVIEWS_PATH,
      'R2_PUBLIC_URL': this.R2_PUBLIC_URL
    };

    if (!pathMap[name]) {
      throw new Error(`Unknown path name: ${name}`);
    }

    return pathMap[name];
  }
}

module.exports = ConfigManager;
