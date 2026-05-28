const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');
const log = require('electron-log');

class ResourceManager {
  constructor(configManager) {
    this.configManager = configManager;
    log.info('ResourceManager initialized');
  }

  async createBackup(texturePath) {
    try {
      const backupPath = this.configManager.getPath('TEXTURES_BACKUP_PATH');
      
      if (await fs.pathExists(backupPath) && (await fs.readdir(backupPath)).length > 0) {
        return { success: true, message: 'Backup ya existe' };
      }
      
      await fs.ensureDir(backupPath);
      await fs.copy(texturePath, backupPath);
      
      return { success: true, message: 'Backup creado correctamente' };
    } catch (error) {
      log.error('Error creando backup:', error);
      if (error.code === 'EACCES' || error.code === 'EPERM') {
        return { success: false, message: 'Error de permisos: Ejecuta la app como administrador' };
      }
      return { success: false, message: error.message };
    }
  }

  async ensureTexturesBackup(texturePath) {
    const backupPath = this.configManager.getPath('TEXTURES_BACKUP_PATH');
    try {
      if (await fs.pathExists(backupPath) && (await fs.readdir(backupPath)).length > 0) {
        return { success: true, created: false };
      }
      if (!texturePath || !(await fs.pathExists(texturePath))) {
        return { success: false, created: false, message: `Ruta de texturas no válida: ${texturePath}` };
      }
      await fs.ensureDir(backupPath);
      await fs.copy(texturePath, backupPath);
      return { success: true, created: true };
    } catch (error) {
      return { success: false, created: false, message: error.message };
    }
  }

  async applyDarkTextures(texturePath) {
    try {
      log.info('Aplicando texturas oscuras');
      
      const backupResult = await this.ensureTexturesBackup(texturePath);
      if (!backupResult.success) {
        return { success: false, message: `No se pudo crear backup: ${backupResult.message}` };
      }

      const texturesPath = this.configManager.getPath('TEXTURES_PATH');
      if (!(await fs.pathExists(texturesPath))) {
        return { success: false, message: 'No se encontró la carpeta de texturas Ruptic Dark' };
      }
      
      const items = await fs.readdir(texturesPath);
      let copiedCount = 0;
      
      for (const item of items) {
        if (item === 'sky') {
          log.info('Saltando carpeta sky (los cielos se aplican por separado)');
          continue;
        }
        
        const sourcePath = path.join(texturesPath, item);
        const destPath = path.join(texturePath, item);
        try {
          await new Promise(resolve => exec(`attrib -R "${destPath}" /S /D`, () => resolve()));
          await fs.copy(sourcePath, destPath, { overwrite: true });
          copiedCount++;
          await new Promise(resolve => exec(`attrib +R "${destPath}" /S /D`, () => resolve()));
        } catch (error) {
          log.warn(`Error copiando ${item}:`, error.message);
        }
      }
      
      log.info(`Texturas oscuras aplicadas: ${copiedCount}/${items.length}`);
      return { success: true, message: `Texturas oscuras aplicadas: ${copiedCount} items` };
    } catch (error) {
      log.error('Error apply-dark-textures:', error);
      return { success: false, message: error.message };
    }
  }

  async restoreOriginalTextures(texturePath) {
    try {
      const backupPath = this.configManager.getPath('TEXTURES_BACKUP_PATH');
      
      if (!(await fs.pathExists(backupPath))) {
        return { success: false, message: 'No se encontró backup de texturas originales' };
      }

      await new Promise(resolve => exec(`attrib -R "${texturePath}" /S /D`, () => resolve()));
      
      const backupItems = await fs.readdir(backupPath);
      let copiedCount = 0;
      
      for (const item of backupItems) {
        if (item === 'sky') {
          log.info('Saltando carpeta sky (manteniendo cielo actual del cliente)');
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
      
      return { success: true, message: 'Texturas originales restauradas' };
    } catch (error) {
      log.error('Error restore-original:', error);
      return { success: false, message: error.message };
    }
  }

  async applyDarkSky(texturePath, rbxStorage) {
    try {
      const darkSkySource = path.join(this.configManager.getPath('TEXTURES_PATH'), 'sky');
      
      if (!(await fs.pathExists(darkSkySource))) {
        return { success: false, message: 'No se encontraron texturas de cielo oscuro' };
      }
      
      if (rbxStorage) {
        const rbxResult = await rbxStorage.applySkybox(darkSkySource);
        
        if (rbxResult.success) {
          return {
            success: true,
            message: 'Cielo oscuro aplicado (método rápido)',
            method: 'rbx-storage'
          };
        }
      }
      
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
  }

  async applyPreset(presetName, texturePath) {
    try {
      const presetPath = path.join(this.configManager.getPath('RESOURCES_PATH'), 'presets', presetName);
      
      if (!(await fs.pathExists(presetPath))) {
        return { success: false, message: `Preset "${presetName}" no encontrado` };
      }
      
      const folders = await fs.readdir(presetPath);
      
      for (const folder of folders) {
        const src = path.join(presetPath, folder);
        const dest = path.join(texturePath, folder);
        
        const stat = await fs.stat(src);
        if (stat.isDirectory()) {
          await fs.copy(src, dest, { overwrite: true });
        }
      }
      
      return { success: true, message: `Preset "${presetName}" aplicado` };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async getAvailablePresets() {
    try {
      const presetsDir = path.join(this.configManager.getPath('RESOURCES_PATH'), 'presets');
      if (!(await fs.pathExists(presetsDir))) {
        return { success: true, presets: [] };
      }
      
      const items = await fs.readdir(presetsDir);
      const presets = [];
      
      for (const item of items) {
        const itemPath = path.join(presetsDir, item);
        const stat = await fs.stat(itemPath);
        if (stat.isDirectory()) {
          presets.push(item);
        }
      }
      
      return { success: true, presets };
    } catch (error) {
      return { success: false, presets: [], message: error.message };
    }
  }
}

module.exports = ResourceManager;
