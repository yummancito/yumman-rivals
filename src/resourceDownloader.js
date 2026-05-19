const https = require('https');
const fs = require('fs-extra');
const path = require('path');
const { app, BrowserWindow } = require('electron');
const AdmZip = require('adm-zip');
const log = require('electron-log');

class ResourceDownloader {
  constructor() {
    this.resourcesUrl = 'https://github.com/mmgb5656/yumman-rivals/releases/download/v1.0.2-resources/yumman-rivals-resources-v1.0.2.zip';
    this.resourcesPath = path.join(app.getPath('userData'), 'resources');
    this.tempPath = path.join(app.getPath('temp'), 'yumman-rivals-resources.zip');
  }

  // Verificar si los recursos ya están descargados
  async checkResources() {
    try {
      const skyboxesPath = path.join(this.resourcesPath, 'skyboxes');
      const texturesPath = path.join(this.resourcesPath, 'textures');
      const fontsPath = path.join(this.resourcesPath, 'fonts');
      
      const skyboxesExist = await fs.pathExists(skyboxesPath);
      const texturesExist = await fs.pathExists(texturesPath);
      const fontsExist = await fs.pathExists(fontsPath);
      
      if (skyboxesExist && texturesExist) {
        // Verificar que haya archivos dentro
        const skyboxes = await fs.readdir(skyboxesPath);
        const textures = await fs.readdir(texturesPath);
        
        // Fonts es opcional para compatibilidad con versiones antiguas del ZIP
        let fontsValid = true;
        if (fontsExist) {
          const fonts = await fs.readdir(fontsPath);
          fontsValid = fonts.length > 0;
        }
        
        return skyboxes.length > 0 && textures.length > 0 && fontsValid;
      }
      
      return false;
    } catch (error) {
      log.error('Error verificando recursos:', error);
      return false;
    }
  }

  // Descargar recursos
  async downloadResources(onProgress, onStatus) {
    return new Promise((resolve, reject) => {
      onStatus('Conectando al servidor...');
      
      // Limpiar archivo temporal si existe
      if (fs.existsSync(this.tempPath)) {
        try {
          fs.unlinkSync(this.tempPath);
        } catch (e) {
          log.warn('No se pudo eliminar archivo temporal anterior:', e);
        }
      }
      
      const file = fs.createWriteStream(this.tempPath);
      let redirectCount = 0;
      const maxRedirects = 5;

      const makeRequest = (url) => {
        https.get(url, (response) => {
          // Manejar redirecciones
          if (response.statusCode === 302 || response.statusCode === 301) {
            redirectCount++;
            if (redirectCount > maxRedirects) {
              file.close();
              try { fs.unlinkSync(this.tempPath); } catch (e) { /* ignorar */ }
              reject(new Error('Demasiadas redirecciones'));
              return;
            }
            
            // Consumir el body de la respuesta de redirección para liberar el socket
            response.resume();
            
            log.info(`Redirigiendo a: ${response.headers.location}`);
            onStatus(`Redirigiendo... (${redirectCount}/${maxRedirects})`);
            makeRequest(response.headers.location);
          } else if (response.statusCode === 200) {
            this.handleDownload(response, file, onProgress, onStatus, resolve, reject);
          } else {
            file.close();
            try { fs.unlinkSync(this.tempPath); } catch (e) { /* ignorar */ }
            reject(new Error(`Error HTTP ${response.statusCode}: ${response.statusMessage}`));
          }
        }).on('error', (error) => {
          log.error('Error en petición HTTP:', error);
          file.close();
          try { fs.unlinkSync(this.tempPath); } catch (e) { /* ignorar */ }
          reject(error);
        });
      };

      makeRequest(this.resourcesUrl);
    });
  }

  handleDownload(response, file, onProgress, onStatus, resolve, reject) {
    // Verificar código de respuesta
    if (response.statusCode !== 200) {
      file.close();
      fs.unlinkSync(this.tempPath);
      reject(new Error(`Error HTTP: ${response.statusCode}`));
      return;
    }

    const totalSize = parseInt(response.headers['content-length'], 10);
    let downloadedSize = 0;

    onStatus(`Descargando recursos (${this.formatBytes(totalSize)})...`);

    response.on('data', (chunk) => {
      downloadedSize += chunk.length;
      const percent = Math.round((downloadedSize / totalSize) * 100);
      const downloaded = this.formatBytes(downloadedSize);
      const total = this.formatBytes(totalSize);
      
      onProgress(percent);
      onStatus(`Descargando: ${downloaded} / ${total} (${percent}%)`);
    });

    response.pipe(file);

    file.on('finish', () => {
      file.close(async (err) => {
        if (err) {
          reject(err);
          return;
        }
        
        try {
          // Verificar que el archivo se descargó completamente
          const stats = await fs.stat(this.tempPath);
          log.info(`Archivo descargado: ${stats.size} bytes`);
          
          if (stats.size < 1000000) { // Menos de 1 MB es sospechoso
            throw new Error('Archivo descargado incompleto o corrupto');
          }
          
          onStatus('Extrayendo archivos...');
          await this.extractZip(onStatus);
          
          onStatus('Limpiando archivos temporales...');
          await fs.unlink(this.tempPath);
          
          onStatus('¡Recursos instalados correctamente!');
          resolve();
        } catch (error) {
          log.error('Error procesando descarga:', error);
          // Limpiar archivo temporal si existe
          try {
            await fs.unlink(this.tempPath);
          } catch (e) {
            // Ignorar error de limpieza
          }
          reject(error);
        }
      });
    });

    file.on('error', (error) => {
      log.error('Error escribiendo archivo:', error);
      try {
        fs.unlinkSync(this.tempPath);
      } catch (e) {
        // Ignorar error de limpieza
      }
      reject(error);
    });

    response.on('error', (error) => {
      log.error('Error en respuesta HTTP:', error);
      file.close();
      try {
        fs.unlinkSync(this.tempPath);
      } catch (e) {
        // Ignorar error de limpieza
      }
      reject(error);
    });
  }

  // Extraer ZIP
  async extractZip(onStatus) {
    try {
      onStatus('Verificando archivo descargado...');
      
      // Verificar que el archivo existe
      if (!fs.existsSync(this.tempPath)) {
        throw new Error('Archivo ZIP no encontrado');
      }
      
      // Verificar tamaño del archivo
      const stats = await fs.stat(this.tempPath);
      log.info(`Tamaño del archivo ZIP: ${this.formatBytes(stats.size)}`);
      
      if (stats.size < 1000000) { // Menos de 1 MB
        throw new Error(`Archivo ZIP demasiado pequeño: ${this.formatBytes(stats.size)}`);
      }
      
      onStatus('Leyendo archivo ZIP...');
      
      // Intentar leer el ZIP
      let zip;
      try {
        zip = new AdmZip(this.tempPath);
      } catch (error) {
        log.error('Error leyendo ZIP:', error);
        throw new Error('Archivo ZIP corrupto o inválido. Intenta descargar de nuevo.');
      }
      
      onStatus('Extrayendo archivos...');
      
      // Obtener entradas del ZIP
      const zipEntries = zip.getEntries();
      log.info(`Archivos en ZIP: ${zipEntries.length}`);
      
      if (zipEntries.length === 0) {
        throw new Error('Archivo ZIP vacío');
      }
      
      // Asegurar que existe el directorio de destino
      await fs.ensureDir(this.resourcesPath);
      
      // Extraer todos los archivos
      zip.extractAllTo(this.resourcesPath, true);
      
      onStatus('Verificando extracción...');
      
      // Verificar si se extrajo dentro de una carpeta "resources"
      const nestedResourcesPath = path.join(this.resourcesPath, 'resources');
      if (fs.existsSync(nestedResourcesPath)) {
        log.info('Detectada carpeta resources anidada, moviendo archivos...');
        
        // Mover todos los archivos de resources/resources a resources/
        const files = await fs.readdir(nestedResourcesPath);
        for (const file of files) {
          const srcPath = path.join(nestedResourcesPath, file);
          const destPath = path.join(this.resourcesPath, file);
          
          // Si el destino existe, eliminarlo primero
          if (fs.existsSync(destPath)) {
            await fs.remove(destPath);
          }
          
          await fs.move(srcPath, destPath, { overwrite: true });
        }
        
        // Eliminar la carpeta resources vacía
        await fs.remove(nestedResourcesPath);
        log.info('Archivos movidos correctamente');
      }
      
      // Verificar que se extrajeron los recursos
      const skyboxesPath = path.join(this.resourcesPath, 'skyboxes');
      const texturesPath = path.join(this.resourcesPath, 'textures');
      const fontsPath = path.join(this.resourcesPath, 'fonts');
      
      if (!fs.existsSync(skyboxesPath) || !fs.existsSync(texturesPath)) {
        throw new Error('Recursos no se extrajeron correctamente');
      }
      
      // Si fonts no está en el ZIP, copiar desde recursos locales
      if (!fs.existsSync(fontsPath)) {
        log.info('Fonts no encontradas en ZIP, copiando desde recursos locales...');
        const localFontsPath = path.join(__dirname, '..', 'resources', 'fonts');
        if (fs.existsSync(localFontsPath)) {
          await fs.copy(localFontsPath, fontsPath);
          log.info('Fonts copiadas desde recursos locales');
        } else {
          log.warn('No se encontraron fonts locales, la pestaña de fuentes estará vacía');
        }
      }
      
      onStatus('Archivos extraídos correctamente');
      
      log.info('Recursos extraídos en:', this.resourcesPath);
    } catch (error) {
      log.error('Error extrayendo ZIP:', error);
      throw error;
    }
  }

  // Formatear bytes a formato legible
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  // Obtener ruta de recursos
  getResourcesPath() {
    return this.resourcesPath;
  }
}

module.exports = ResourceDownloader;
