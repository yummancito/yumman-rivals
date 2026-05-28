const crypto = require('crypto');
const fs = require('fs');
const log = require('electron-log');

class IntegrityService {
  constructor() {
    log.info('IntegrityService initialized');
  }

  async calculateSHA256(filePath) {
    return new Promise((resolve, reject) => {
      try {
        const hash = crypto.createHash('sha256');
        const stream = fs.createReadStream(filePath);

        stream.on('data', (data) => {
          hash.update(data);
        });

        stream.on('end', () => {
          const hashValue = hash.digest('hex');
          log.info(`SHA256 calculated for ${filePath}: ${hashValue}`);
          resolve(hashValue);
        });

        stream.on('error', (error) => {
          log.error(`Error reading file ${filePath}:`, error);
          reject(error);
        });
      } catch (error) {
        log.error(`Error calculating SHA256 for ${filePath}:`, error);
        reject(error);
      }
    });
  }

  async verifyFile(filePath, expectedHash) {
    try {
      const actualHash = await this.calculateSHA256(filePath);
      const isValid = actualHash.toLowerCase() === expectedHash.toLowerCase();

      if (isValid) {
        log.info(`SHA256 verification passed for ${filePath}`);
      } else {
        log.warn(`SHA256 verification failed for ${filePath}: expected=${expectedHash}, actual=${actualHash}`);
      }

      return isValid;
    } catch (error) {
      log.error(`Error verifying file ${filePath}:`, error);
      throw error;
    }
  }

  async verifyOrThrow(filePath, expectedHash) {
    try {
      const isValid = await this.verifyFile(filePath, expectedHash);

      if (!isValid) {
        const actualHash = await this.calculateSHA256(filePath);
        throw new Error(`SHA256 mismatch for ${filePath}: expected=${expectedHash}, actual=${actualHash}`);
      }

      log.info(`SHA256 verification successful for ${filePath}`);
    } catch (error) {
      log.error(`SHA256 verification failed for ${filePath}:`, error);
      throw error;
    }
  }
}

module.exports = IntegrityService;
