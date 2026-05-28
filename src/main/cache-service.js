const fs = require('fs-extra');
const path = require('path');
const log = require('electron-log');

class CacheService {
  constructor(configManager) {
    this.configManager = configManager;
    log.info('CacheService initialized');
  }

  async getCachedVersion() {
    try {
      const cachePath = this.configManager.getPath('CACHE_PATH');
      const versionFile = path.join(cachePath, 'version.json');
      
      if (await fs.pathExists(versionFile)) {
        const data = await fs.readJson(versionFile);
        return data;
      }
      
      return null;
    } catch (error) {
      log.error('Error getting cached version:', error);
      return null;
    }
  }

  async setCachedVersion(versionData) {
    try {
      const cachePath = this.configManager.getPath('CACHE_PATH');
      await fs.ensureDir(cachePath);
      
      const versionFile = path.join(cachePath, 'version.json');
      await fs.writeJson(versionFile, versionData, { spaces: 2 });
      
      log.info('Cached version saved:', versionData);
      return { success: true };
    } catch (error) {
      log.error('Error setting cached version:', error);
      return { success: false, error: error.message };
    }
  }

  async clearCache() {
    try {
      const cachePath = this.configManager.getPath('CACHE_PATH');
      
      if (await fs.pathExists(cachePath)) {
        await fs.remove(cachePath);
      }
      
      log.info('Cache cleared');
      return { success: true };
    } catch (error) {
      log.error('Error clearing cache:', error);
      return { success: false, error: error.message };
    }
  }

  async getCachedSkybox(skyboxName) {
    try {
      const cachePath = this.configManager.getPath('CACHE_PATH');
      const skyboxCachePath = path.join(cachePath, 'skyboxes', skyboxName);
      
      if (await fs.pathExists(skyboxCachePath)) {
        return skyboxCachePath;
      }
      
      return null;
    } catch (error) {
      log.error('Error getting cached skybox:', error);
      return null;
    }
  }

  async cacheSkybox(skyboxName, sourcePath) {
    try {
      const cachePath = this.configManager.getPath('CACHE_PATH');
      const skyboxCachePath = path.join(cachePath, 'skyboxes', skyboxName);
      
      await fs.ensureDir(skyboxCachePath);
      await fs.copy(sourcePath, skyboxCachePath, { overwrite: true });
      
      log.info(`Skybox cached: ${skyboxName}`);
      return { success: true, path: skyboxCachePath };
    } catch (error) {
      log.error('Error caching skybox:', error);
      return { success: false, error: error.message };
    }
  }

  async getCachedTexture(textureName) {
    try {
      const cachePath = this.configManager.getPath('CACHE_PATH');
      const textureCachePath = path.join(cachePath, 'textures', textureName);
      
      if (await fs.pathExists(textureCachePath)) {
        return textureCachePath;
      }
      
      return null;
    } catch (error) {
      log.error('Error getting cached texture:', error);
      return null;
    }
  }

  async cacheTexture(textureName, sourcePath) {
    try {
      const cachePath = this.configManager.getPath('CACHE_PATH');
      const textureCachePath = path.join(cachePath, 'textures', textureName);
      
      await fs.ensureDir(path.dirname(textureCachePath));
      await fs.copy(sourcePath, textureCachePath, { overwrite: true });
      
      log.info(`Texture cached: ${textureName}`);
      return { success: true, path: textureCachePath };
    } catch (error) {
      log.error('Error caching texture:', error);
      return { success: false, error: error.message };
    }
  }

  async getCacheSize() {
    try {
      const cachePath = this.configManager.getPath('CACHE_PATH');
      
      if (!(await fs.pathExists(cachePath))) {
        return 0;
      }
      
      const files = await fs.readdir(cachePath, { recursive: true });
      let totalSize = 0;
      
      for (const file of files) {
        const filePath = path.join(cachePath, file);
        const stat = await fs.stat(filePath);
        if (stat.isFile()) {
          totalSize += stat.size;
        }
      }
      
      return totalSize;
    } catch (error) {
      log.error('Error getting cache size:', error);
      return 0;
    }
  }
}

module.exports = CacheService;
