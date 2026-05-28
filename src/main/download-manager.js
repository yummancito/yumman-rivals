const fetch = require('node-fetch');
const fs = require('fs-extra');
const path = require('path');
const log = require('electron-log');

class DownloadManager {
  constructor(configManager, integrityService) {
    this.configManager = configManager;
    this.integrityService = integrityService;
    log.info('DownloadManager initialized');
  }

  async downloadFile(url, destinationPath, options = {}) {
    const {
      expectedSHA256 = null,
      onProgress = null,
      maxRetries = 3,
      timeoutMs = 600000 // 10 minutos por defecto para archivos grandes
    } = options;

    const partialPath = destinationPath + '.partial';
    let lastError = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        log.info(`Download attempt ${attempt + 1}/${maxRetries} for ${url}`);

        // Verificar espacio en disco antes de descargar
        await this.checkDiskSpace(destinationPath, 0); // Tamaño desconocido, verificar después

        // Descargar a archivo .partial
        await this.downloadWithProgress(url, partialPath, onProgress, timeoutMs);

        // Verificar tamaño del archivo descargado
        const stats = await fs.stat(partialPath);
        log.info(`Downloaded file size: ${stats.size} bytes`);

        // Verificar SHA256 si se proporciona
        if (expectedSHA256) {
          await this.integrityService.verifyOrThrow(partialPath, expectedSHA256);
        }

        // Renombrar .partial a destino
        await fs.move(partialPath, destinationPath, { overwrite: true });
        log.info(`File successfully downloaded to ${destinationPath}`);

        return;
      } catch (error) {
        lastError = error;
        log.error(`Download attempt ${attempt + 1} failed:`, error);

        // Limpiar archivo parcial si existe
        if (await fs.pathExists(partialPath)) {
          try {
            await fs.remove(partialPath);
          } catch (cleanupError) {
            log.error('Error cleaning up partial file:', cleanupError);
          }
        }

        // Si no es el último intento, esperar backoff exponencial
        if (attempt < maxRetries - 1) {
          const backoffTime = Math.pow(5, attempt) * 1000; // 5s, 15s, 45s
          log.info(`Waiting ${backoffTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, backoffTime));
        }
      }
    }

    throw new Error(`Failed to download after ${maxRetries} attempts. Last error: ${lastError.message}`);
  }

  async checkDiskSpace(destinationPath, requiredBytes) {
    try {
      const tempPath = this.configManager.getPath('TEMP_PATH');
      // Asegurar que la carpeta existe antes de verificar espacio
      await fs.ensureDir(tempPath);
      const stats = await fs.statfs(tempPath);
      const freeSpace = stats.free;
      const requiredSpace = requiredBytes > 0 ? requiredBytes * 1.2 : 1024 * 1024 * 1024; // 20% overhead o 1GB mínimo

      if (freeSpace < requiredSpace) {
        const freeMB = Math.round(freeSpace / 1024 / 1024);
        const requiredMB = Math.round(requiredSpace / 1024 / 1024);
        throw new Error(`Espacio insuficiente en disco. Disponible: ${freeMB} MB, Requerido: ${requiredMB} MB`);
      }

      log.info(`Disk space check passed. Available: ${Math.round(freeSpace / 1024 / 1024)} MB`);
    } catch (error) {
      if (error.message.includes('Espacio insuficiente')) {
        throw error;
      }
      log.warn('Could not verify disk space:', error.message);
    }
  }

  async downloadWithProgress(url, destinationPath, onProgress, timeoutMs) {
    return new Promise(async (resolve, reject) => {
      try {
        // Asegurar que la carpeta existe antes de escribir
        await fs.ensureDir(path.dirname(destinationPath));
      } catch (error) {
        reject(error);
        return;
      }

      const fileStream = fs.createWriteStream(destinationPath);
      let downloadedBytes = 0;
      let totalBytes = 0;
      let startTime = Date.now();
      let lastProgressUpdate = 0;

      const controller = new AbortController();
      const timeout = setTimeout(() => {
        controller.abort();
        reject(new Error('Download timeout'));
      }, timeoutMs);

      log.info(`Iniciando descarga: ${url}`);
      log.info(`Destino: ${destinationPath}`);
      log.info(`Timeout: ${timeoutMs}ms`);

      fetch(url, { signal: controller.signal })
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          totalBytes = parseInt(response.headers.get('content-length'), 10) || 0;
          log.info(`Starting download. Total size: ${totalBytes} bytes (${(totalBytes / 1024 / 1024).toFixed(2)} MB)`);

          const progressStream = response.body;

          progressStream.on('data', (chunk) => {
            downloadedBytes += chunk.length;
            const now = Date.now();

            // Calcular progreso cada 500ms
            if (now - lastProgressUpdate > 500 && onProgress) {
              const elapsedSeconds = (now - startTime) / 1000;
              const speedMBps = (downloadedBytes / elapsedSeconds) / (1024 * 1024);
              const percent = totalBytes > 0 ? (downloadedBytes / totalBytes) * 100 : 0;
              const etaSeconds = speedMBps > 0 && totalBytes > 0 ? (totalBytes - downloadedBytes) / (speedMBps * 1024 * 1024) : 0;

              const progressData = {
                percent: Math.round(percent),
                speedMBps: speedMBps.toFixed(2),
                etaSeconds: Math.round(etaSeconds),
                downloadedBytes,
                totalBytes,
                downloadedMB: (downloadedBytes / 1024 / 1024).toFixed(2),
                totalMB: (totalBytes / 1024 / 1024).toFixed(2)
              };

              onProgress(progressData);

              // Log cada 10% de progreso
              if (percent % 10 < 1 && percent > 0) {
                log.info(`Progreso: ${Math.round(percent)}% - ${progressData.downloadedMB} MB / ${progressData.totalMB} MB - Velocidad: ${speedMBps.toFixed(2)} MB/s - ETA: ${Math.round(etaSeconds)}s`);
              }

              lastProgressUpdate = now;
            }
          });

          progressStream.on('error', (error) => {
            clearTimeout(timeout);
            fileStream.close();
            log.error('Error en stream de descarga:', error);
            reject(error);
          });

          progressStream.pipe(fileStream);

          fileStream.on('finish', () => {
            clearTimeout(timeout);
            fileStream.close();
            log.info(`Descarga completada: ${downloadedBytes} bytes`);
            resolve();
          });

          fileStream.on('error', (error) => {
            clearTimeout(timeout);
            log.error('Error escribiendo archivo:', error);
            reject(error);
          });
        })
        .catch(error => {
          clearTimeout(timeout);
          fileStream.close();
          log.error('Error en fetch:', error);
          reject(error);
        });
    });
  }
}

module.exports = DownloadManager;
