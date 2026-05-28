const fs = require('fs-extra');
const path = require('path');
const log = require('electron-log');

class LockService {
  constructor(configManager) {
    this.configManager = configManager;
    this.activeOperations = new Set();
    this.lockPath = configManager.getPath('LOCK_PATH');
    log.info('LockService initialized');
  }

  async acquire(operationName) {
    try {
      if (this.activeOperations.has(operationName)) {
        throw new Error(`Ya hay una operación en curso: ${operationName}`);
      }

      if (this.activeOperations.size > 0) {
        const currentOp = Array.from(this.activeOperations)[0];
        throw new Error(`Ya hay una operación en curso: ${currentOp}`);
      }

      this.activeOperations.add(operationName);

      const lockData = {
        operation: operationName,
        timestamp: Date.now(),
        pid: process.pid
      };

      // Asegurar que la carpeta existe antes de escribir el lock
      await fs.ensureDir(path.dirname(this.lockPath));
      await fs.writeJson(this.lockPath, lockData);
      log.info(`Lock acquired for operation: ${operationName}`);
    } catch (error) {
      log.error(`Error acquiring lock for ${operationName}:`, error);
      this.activeOperations.delete(operationName);
      throw error;
    }
  }

  async release(operationName) {
    try {
      this.activeOperations.delete(operationName);

      if (await fs.pathExists(this.lockPath)) {
        await fs.remove(this.lockPath);
      }

      log.info(`Lock released for operation: ${operationName}`);
    } catch (error) {
      log.error(`Error releasing lock for ${operationName}:`, error);
      throw error;
    }
  }

  isLocked() {
    return this.activeOperations.size > 0;
  }

  async cleanStaleLock() {
    try {
      if (await fs.pathExists(this.lockPath)) {
        const lockData = await fs.readJson(this.lockPath);
        const pid = lockData.pid;

        try {
          process.kill(pid, 0);
          log.info(`Process ${pid} is still running, lock is valid`);
        } catch (error) {
          log.info(`Process ${pid} is not running, cleaning stale lock`);
          await fs.remove(this.lockPath);
          this.activeOperations.clear();
          log.info('Stale lock cleaned');
        }
      }
    } catch (error) {
      log.error('Error cleaning stale lock:', error);
      // Don't throw, just log the error
    }
  }
}

module.exports = LockService;
