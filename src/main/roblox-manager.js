const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const { promisify } = require('util');
const log = require('electron-log');

const execAsync = promisify(exec);

class RobloxManager {
  constructor(configManager) {
    this.configManager = configManager;
    log.info('RobloxManager initialized');
  }

  async isRobloxRunning() {
    try {
      const result = await execAsync('tasklist /FI "IMAGENAME eq RobloxPlayerBeta.exe"');
      return result.stdout.includes('RobloxPlayerBeta.exe');
    } catch (error) {
      return false;
    }
  }

  async closeRoblox() {
    try {
      await execAsync('taskkill /F /IM RobloxPlayerBeta.exe');
      log.info('Roblox cerrado');
      return { success: true };
    } catch (error) {
      if (error.message.includes('not found') || error.message.includes('no se encontr')) {
        log.info('Roblox no estaba corriendo');
        return { success: true };
      }
      log.error('Error cerrando Roblox:', error);
      return { success: false, message: error.message };
    }
  }

  async detectExecutors() {
    try {
      const robloxPath = path.join(os.homedir(), 'AppData', 'Local', 'Roblox', 'Versions');
      
      if (await fs.pathExists(robloxPath)) {
        const versions = await fs.readdir(robloxPath);
        
        const executors = versions.map(version => ({
          id: version,
          name: `Roblox ${version}`,
          path: path.join(robloxPath, version)
        }));
        
        return executors;
      }
      
      return [];
    } catch (error) {
      log.error('Error detectando ejecutores:', error);
      return [];
    }
  }

  async getExecutorTexturePath(executorId) {
    try {
      const executorPath = path.join(os.homedir(), 'AppData', 'Local', 'Roblox', 'Versions', executorId);
      
      if (await fs.pathExists(executorPath)) {
        const contentPath = path.join(executorPath, 'PlatformContent', 'pc', 'drive');
        
        if (await fs.pathExists(contentPath)) {
          const drives = await fs.readdir(contentPath);
          
          for (const drive of drives) {
            const basePath = path.join(contentPath, drive, 'base');
            
            if (await fs.pathExists(basePath)) {
              return basePath;
            }
          }
        }
      }
      
      return null;
    } catch (error) {
      log.error('Error obteniendo ruta de texturas:', error);
      return null;
    }
  }

  async verifyRobloxPath(robloxPath) {
    try {
      if (!(await fs.pathExists(robloxPath))) {
        return { valid: false, message: 'La ruta no existe' };
      }
      
      const versions = (await fs.readdir(robloxPath))
        .filter(f => f.startsWith('version-'))
        .map(f => ({
          name: f,
          path: path.join(robloxPath, f),
          mtime: fs.statSync(path.join(robloxPath, f)).mtime
        }))
        .sort((a, b) => b.mtime - a.mtime);
      
      if (versions.length === 0) {
        return { valid: false, message: 'No se encontraron versiones de Roblox' };
      }
      
      const latestVersion = versions[0].name;
      const contentPath = path.join(robloxPath, latestVersion, 'PlatformContent', 'pc', 'textures');
      
      if (!(await fs.pathExists(contentPath))) {
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
  }

  async launchRoblox(executorId) {
    try {
      const executorPath = path.join(os.homedir(), 'AppData', 'Local', 'Roblox', 'Versions', executorId);
      
      if (await fs.pathExists(executorPath)) {
        const exePath = path.join(executorPath, 'RobloxPlayerBeta.exe');
        
        if (await fs.pathExists(exePath)) {
          const { spawn } = require('child_process');
          spawn(exePath, [], { detached: true });
          return { success: true };
        }
      }
      
      return { success: false, error: 'Executor no encontrado' };
    } catch (error) {
      log.error('Error lanzando Roblox:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = RobloxManager;
