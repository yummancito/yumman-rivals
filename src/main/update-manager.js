const fetch = require('node-fetch');
const fs = require('fs-extra');
const path = require('path');
const semver = require('semver');
const AdmZip = require('adm-zip');
const log = require('electron-log');

class UpdateManager {
  constructor(configManager, downloadManager, integrityService, lockService) {
    this.configManager = configManager;
    this.downloadManager = downloadManager;
    this.integrityService = integrityService;
    this.lockService = lockService;

    this.rollbackService = {
      createBackup: this.createBackup.bind(this),
      restore: this.restore.bind(this),
      cleanBackup: this.cleanBackup.bind(this)
    };

    log.info('UpdateManager initialized');
  }

  async fetchRemoteManifest() {
    try {
      const r2PublicUrl = this.configManager.getPath('R2_PUBLIC_URL');
      const manifestUrl = `${r2PublicUrl}/manifest.json`;
      log.info(`Fetching remote manifest from ${manifestUrl}`);

      const response = await fetch(manifestUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const manifest = await response.json();
      log.info('Remote manifest fetched successfully');
      return manifest;
    } catch (error) {
      log.error('Error fetching remote manifest:', error);
      throw error;
    }
  }

  async loadLocalManifest() {
    try {
      const manifestPath = this.configManager.getPath('MANIFEST_PATH');

      if (!(await fs.pathExists(manifestPath))) {
        log.info('No local manifest found');
        return null;
      }

      const manifest = await fs.readJson(manifestPath);
      log.info('Local manifest loaded successfully');
      return manifest;
    } catch (error) {
      log.error('Error loading local manifest:', error);
      return null;
    }
  }

  async saveLocalManifest(manifest) {
    try {
      const manifestPath = this.configManager.getPath('MANIFEST_PATH');
      await fs.writeJson(manifestPath, manifest, { spaces: 2 });
      log.info('Local manifest saved successfully');
    } catch (error) {
      log.error('Error saving local manifest:', error);
      throw error;
    }
  }

  async checkForUpdates() {
    try {
      const remoteManifest = await this.fetchRemoteManifest();
      const localManifest = await this.loadLocalManifest();

      let needsAppUpdate = false;
      let needsResourcesUpdate = false;

      if (localManifest) {
        needsAppUpdate = semver.gt(remoteManifest.appVersion, localManifest.appVersion);
        needsResourcesUpdate = semver.gt(remoteManifest.resourcesVersion, localManifest.resourcesVersion);
      } else {
        // No local manifest, need initial download
        needsResourcesUpdate = true;
      }

      log.info(`Update check complete. App update: ${needsAppUpdate}, Resources update: ${needsResourcesUpdate}`);

      return {
        needsAppUpdate,
        needsResourcesUpdate,
        remoteManifest
      };
    } catch (error) {
      log.error('Error checking for updates:', error);
      throw error;
    }
  }

  async downloadAndApplyResources(remoteManifest, onProgress) {
    let lockAcquired = false;
    try {
      await this.lockService.acquire('update-resources');
      lockAcquired = true;

      const resourcesUrl = remoteManifest.resources.url;
      const expectedSHA256 = remoteManifest.resources.sha256;
      const tempPath = this.configManager.getPath('TEMP_PATH');
      const appResourcesPath = this.configManager.getPath('APP_RESOURCES');
      const extractedPath = path.join(tempPath, 'extracted');

      log.info(`Downloading resources from ${resourcesUrl}`);

      // Crear backup antes de actualizar
      await this.rollbackService.createBackup();

      // Descargar resources.zip
      const zipPath = path.join(tempPath, 'resources.zip');
      await this.downloadManager.downloadFile(resourcesUrl, zipPath, {
        expectedSHA256,
        timeoutMs: 5 * 60 * 1000, // 5 minutos para archivos grandes
        onProgress: (progress) => {
          if (onProgress) {
            onProgress({ phase: 'downloading', ...progress });
          }
        }
      });

      // Verificar SHA256
      if (onProgress) {
        onProgress({ phase: 'verifying', percent: 0 });
      }
      await this.integrityService.verifyOrThrow(zipPath, expectedSHA256);

      // Extraer ZIP
      if (onProgress) {
        onProgress({ phase: 'extracting', percent: 50 });
      }
      await fs.ensureDir(extractedPath);

      const zip = new AdmZip(zipPath);
      zip.extractAllTo(extractedPath, true);

      // Mover archivos a APP_RESOURCES
      if (onProgress) {
        onProgress({ phase: 'extracting', percent: 75 });
      }

      // Verificar si hay carpeta resources anidada
      const nestedResourcesPath = path.join(extractedPath, 'resources');
      const sourcePath = await fs.pathExists(nestedResourcesPath) ? nestedResourcesPath : extractedPath;

      // Mover archivos
      const files = await fs.readdir(sourcePath);
      for (const file of files) {
        const srcPath = path.join(sourcePath, file);
        const destPath = path.join(appResourcesPath, file);

        if (await fs.pathExists(destPath)) {
          await fs.remove(destPath);
        }

        await fs.move(srcPath, destPath, { overwrite: true });
      }

      if (onProgress) {
        onProgress({ phase: 'extracting', percent: 100 });
      }

      // Guardar manifest local
      await this.saveLocalManifest(remoteManifest);

      // Limpiar archivos temporales
      await fs.remove(tempPath);

      // Limpiar backup después de éxito
      await this.rollbackService.cleanBackup();

      log.info('Resources downloaded and applied successfully');
    } catch (error) {
      log.error('Error downloading and applying resources:', error);

      // Rollback en caso de error
      try {
        await this.rollbackService.restore();
      } catch (rollbackError) {
        log.error('Error during rollback:', rollbackError);
      }

      throw error;
    } finally {
      if (lockAcquired) {
        await this.lockService.release('update-resources');
      }
    }
  }

  async createBackup() {
    try {
      const appResourcesPath = this.configManager.getPath('APP_RESOURCES');
      const backupPath = this.configManager.getPath('BACKUP_PATH');
      const configPath = this.configManager.getPath('CONFIG_PATH');
      const rollbackInfoPath = path.join(configPath, 'rollback-info.json');

      log.info('Creating backup of resources...');

      // Copiar APP_RESOURCES a BACKUP_PATH
      if (await fs.pathExists(appResourcesPath)) {
        await fs.copy(appResourcesPath, backupPath, { overwrite: true });
      }

      // Guardar información de rollback
      const localManifest = await this.loadLocalManifest();
      const rollbackInfo = {
        version: localManifest ? localManifest.resourcesVersion : 'unknown',
        timestamp: Date.now()
      };

      await fs.writeJson(rollbackInfoPath, rollbackInfo, { spaces: 2 });

      log.info('Backup created successfully');
    } catch (error) {
      log.error('Error creating backup:', error);
      throw error;
    }
  }

  async restore() {
    try {
      const backupPath = this.configManager.getPath('BACKUP_PATH');
      const appResourcesPath = this.configManager.getPath('APP_RESOURCES');
      const configPath = this.configManager.getPath('CONFIG_PATH');
      const rollbackInfoPath = path.join(configPath, 'rollback-info.json');

      if (!(await fs.pathExists(backupPath))) {
        log.warn('No backup available for rollback');
        return;
      }

      log.info('Rolling back to backup...');

      // Eliminar APP_RESOURCES
      if (await fs.pathExists(appResourcesPath)) {
        await fs.remove(appResourcesPath);
      }

      // Mover BACKUP_PATH a APP_RESOURCES
      await fs.move(backupPath, appResourcesPath);

      // Restaurar manifest desde rollback-info.json
      if (await fs.pathExists(rollbackInfoPath)) {
        const rollbackInfo = await fs.readJson(rollbackInfoPath);

        // Intentar cargar el manifest anterior si existe
        const localManifest = await this.loadLocalManifest();
        if (localManifest) {
          localManifest.resourcesVersion = rollbackInfo.version;
          await this.saveLocalManifest(localManifest);
        }
      }

      log.info('Rollback completed successfully');
    } catch (error) {
      log.error('Error during rollback:', error);
      throw error;
    }
  }

  async cleanBackup() {
    try {
      const backupPath = this.configManager.getPath('BACKUP_PATH');
      const configPath = this.configManager.getPath('CONFIG_PATH');
      const rollbackInfoPath = path.join(configPath, 'rollback-info.json');

      if (await fs.pathExists(backupPath)) {
        await fs.remove(backupPath);
      }

      if (await fs.pathExists(rollbackInfoPath)) {
        await fs.remove(rollbackInfoPath);
      }

      log.info('Backup cleaned successfully');
    } catch (error) {
      log.error('Error cleaning backup:', error);
      // No lanzar error, es una operación de limpieza
    }
  }
}

module.exports = UpdateManager;
