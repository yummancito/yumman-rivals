const fs = require('fs-extra');
const path = require('path');
const os = require('os');

/**
 * Gestor para el sistema rbx-storage de Roblox
 * Este método es más rápido y no requiere permisos de administrador
 */

class RbxStorageManager {
  constructor() {
    this.rbxStoragePath = path.join(
      os.homedir(),
      'AppData',
      'Local',
      'Roblox',
      'rbx-storage'
    );
    
    // Mapeo de archivos de skybox a hashes de rbx-storage
    // Estos son los hashes CORRECTOS que usa Roblox (del move.bat del skyfix)
    this.skyboxHashes = {
      'sky512_ft': { folder: 'a5', hash: 'a564ec8aeef3614e788d02f0090089d8' },
      'sky512_bk': { folder: '73', hash: '7328622d2d509b95dd4dd2c721d1ca8b' },
      'sky512_lf': { folder: 'a5', hash: 'a50f6563c50ca4d5dcb255ee5cfab097' },
      'sky512_rt': { folder: '6c', hash: '6c94b9385e52d221f0538aadaceead2d' },
      'sky512_up': { folder: '92', hash: '9244e00ff9fd6cee0bb40a262bb35d31' },
      'sky512_dn': { folder: '78', hash: '78cb2e93aee0cdbd79b15a866bc93a54' }
    };
  }
  
  /**
   * Verifica si rbx-storage existe
   */
  async exists() {
    try {
      return await fs.pathExists(this.rbxStoragePath);
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Aplica un skybox usando el método rbx-storage
   * Lee los hashes desde la carpeta assets/ del skybox
   * @param {string} skyboxFolder - Carpeta con los archivos del skybox
   * @returns {Promise<Object>} Resultado de la operación
   */
  async applySkybox(skyboxFolder) {
    try {
      // Verificar que rbx-storage existe
      if (!await this.exists()) {
        return {
          success: false,
          message: 'rbx-storage no encontrado. Usando método tradicional.'
        };
      }
      
      console.log('=== MÉTODO RBX-STORAGE: USANDO ARCHIVOS DE CACHÉ ===');
      
      // Buscar carpeta assets en el skybox
      const assetsFolder = path.join(skyboxFolder, 'assets');
      const skyboxHasAssets = await fs.pathExists(assetsFolder);
      
      if (skyboxHasAssets) {
        console.log('  ✓ Carpeta assets encontrada, usando archivos de caché');
        // NUEVO: Leer los hashes reales de la carpeta assets
        return await this.applySkyboxFromAssetsAuto(assetsFolder);
      } else {
        console.log('  ⚠ No hay carpeta assets, copiando archivos .tex directamente');
        return await this.applySkyboxFromTexFiles(skyboxFolder);
      }
      
    } catch (error) {
      console.error('Error en rbxStorage.applySkybox:', error);
      return {
        success: false,
        message: `Error al aplicar skybox: ${error.message}`
      };
    }
  }
  
  /**
   * Aplica skybox desde archivos de assets (archivos de caché)
   * @param {string} assetsFolder - Carpeta con archivos de caché
   * @returns {Promise<Object>} Resultado
   */
  async applySkyboxFromAssets(assetsFolder) {
    try {
      console.log('  Copiando archivos de caché desde assets...');
      
      // Crear carpetas necesarias
      const folders = ['a5', '73', '6c', '92', '78'];
      for (const folder of folders) {
        const folderPath = path.join(this.rbxStoragePath, folder);
        await fs.ensureDir(folderPath);
      }
      
      let copiedFiles = 0;
      let readOnlySuccess = 0;
      
      // Copiar cada archivo de caché
      for (const [skyFile, hashInfo] of Object.entries(this.skyboxHashes)) {
        const sourcePath = path.join(assetsFolder, hashInfo.hash);
        const destPath = path.join(this.rbxStoragePath, hashInfo.folder, hashInfo.hash);
        
        if (await fs.pathExists(sourcePath)) {
          console.log(`  Copiando ${hashInfo.hash} -> ${hashInfo.folder}\\${hashInfo.hash}`);
          
          try {
            await this.removeReadOnly(destPath);
            await fs.copy(sourcePath, destPath, { overwrite: true });
            copiedFiles++;
            
            const readOnlyResult = await this.setReadOnly(destPath);
            if (readOnlyResult) {
              readOnlySuccess++;
            }
          } catch (error) {
            console.error(`    ✗ Error: ${error.message}`);
          }
        }
      }
      
      console.log(`\n  ✓ Total copiados: ${copiedFiles}/6 archivos`);
      console.log(`  ✓ Protegidos: ${readOnlySuccess}/${copiedFiles}`);
      
      return {
        success: copiedFiles > 0,
        message: `Skybox aplicado desde assets (${copiedFiles} archivos, ${readOnlySuccess} protegidos)`,
        method: 'rbx-storage-assets',
        filesApplied: copiedFiles,
        readOnlyApplied: readOnlySuccess
      };
      
    } catch (error) {
      return {
        success: false,
        message: `Error: ${error.message}`
      };
    }
  }
  
  /**
   * Aplica skybox desde archivos .tex
   * @param {string} skyboxFolder - Carpeta con archivos .tex
   * @returns {Promise<Object>} Resultado
   */
  async applySkyboxFromTexFiles(skyboxFolder) {
    try {
      console.log('  Copiando archivos .tex...');
      
      // Crear carpetas necesarias
      const folders = ['a5', '73', '6c', '92', '78'];
      for (const folder of folders) {
        const folderPath = path.join(this.rbxStoragePath, folder);
        await fs.ensureDir(folderPath);
      }
      
      let copiedFiles = 0;
      let readOnlySuccess = 0;
      
      for (const [skyFile, hashInfo] of Object.entries(this.skyboxHashes)) {
        const sourcePath = path.join(skyboxFolder, `${skyFile}.tex`);
        const destPath = path.join(this.rbxStoragePath, hashInfo.folder, hashInfo.hash);
        
        if (await fs.pathExists(sourcePath)) {
          console.log(`  Copiando ${skyFile}.tex -> ${hashInfo.folder}\\${hashInfo.hash}`);
          
          try {
            await this.removeReadOnly(destPath);
            await fs.copy(sourcePath, destPath, { overwrite: true });
            copiedFiles++;
            
            const readOnlyResult = await this.setReadOnly(destPath);
            if (readOnlyResult) {
              readOnlySuccess++;
            }
          } catch (error) {
            console.error(`    ✗ Error: ${error.message}`);
          }
        }
      }
      
      console.log(`\n  ✓ Total copiados: ${copiedFiles}/6 archivos`);
      console.log(`  ✓ Protegidos: ${readOnlySuccess}/${copiedFiles}`);
      
      return {
        success: copiedFiles > 0,
        message: `Skybox aplicado desde .tex (${copiedFiles} archivos, ${readOnlySuccess} protegidos)`,
        method: 'rbx-storage-tex',
        filesApplied: copiedFiles,
        readOnlyApplied: readOnlySuccess
      };
      
    } catch (error) {
      return {
        success: false,
        message: `Error: ${error.message}`
      };
    }
  }
  
  /**
   * ✅ NUEVO: Aplica skybox leyendo automáticamente los hashes de la carpeta assets
   * Esto permite que CUALQUIER skybox funcione, no solo uno hardcodeado
   * @param {string} assetsFolder - Carpeta assets con los archivos hash
   * @returns {Promise<Object>} Resultado
   */
  async applySkyboxFromAssetsAuto(assetsFolder) {
    try {
      console.log('  📁 Leyendo hashes automáticamente desde assets/...');
      
      // Leer todos los archivos de la carpeta assets
      const assetFiles = await fs.readdir(assetsFolder);
      console.log(`  ✓ Encontrados ${assetFiles.length} archivos en assets/`);
      
      if (assetFiles.length === 0) {
        return {
          success: false,
          message: 'Carpeta assets vacía'
        };
      }
      
      // Mapear cada archivo a su carpeta correspondiente según los primeros 2 caracteres
      let copiedFiles = 0;
      let readOnlySuccess = 0;
      let errors = [];
      
      for (const hashFile of assetFiles) {
        // Los primeros 2 caracteres del hash determinan la carpeta
        const folder = hashFile.substring(0, 2);
        const destFolder = path.join(this.rbxStoragePath, folder);
        const sourcePath = path.join(assetsFolder, hashFile);
        const destPath = path.join(destFolder, hashFile);
        
        try {
          // Crear carpeta si no existe
          await fs.ensureDir(destFolder);
          console.log(`  → Carpeta ${folder} verificada`);
          
          // Quitar read-only si existe
          await this.removeReadOnly(destPath);
          
          // Verificar que el archivo fuente existe
          const sourceExists = await fs.pathExists(sourcePath);
          console.log(`  → Archivo fuente ${hashFile} existe: ${sourceExists}`);
          
          if (!sourceExists) {
            errors.push(`Archivo fuente no existe: ${hashFile}`);
            continue;
          }
          
          // Copiar archivo
          await fs.copy(sourcePath, destPath, { overwrite: true });
          
          // Verificar que se copió
          const destExists = await fs.pathExists(destPath);
          console.log(`  → Archivo destino ${hashFile} copiado: ${destExists}`);
          
          if (destExists) {
            copiedFiles++;
            console.log(`  ✓ ${hashFile} -> ${folder}/${hashFile}`);
            
            // Marcar como read-only
            const readOnlyResult = await this.setReadOnly(destPath);
            if (readOnlyResult) {
              readOnlySuccess++;
            }
          } else {
            errors.push(`No se pudo copiar: ${hashFile}`);
          }
        } catch (error) {
          console.error(`  ✗ Error copiando ${hashFile}:`, error.message);
          errors.push(`${hashFile}: ${error.message}`);
        }
      }
      
      console.log(`\n  ✓ Total copiados: ${copiedFiles}/${assetFiles.length} archivos`);
      console.log(`  ✓ Protegidos: ${readOnlySuccess}/${copiedFiles}`);
      
      if (errors.length > 0) {
        console.log(`  ⚠ Errores: ${errors.join(', ')}`);
      }
      
      return {
        success: copiedFiles > 0,
        message: `Skybox aplicado (${copiedFiles} archivos, ${readOnlySuccess} protegidos)`,
        method: 'rbx-storage-auto',
        filesApplied: copiedFiles,
        readOnlyApplied: readOnlySuccess,
        errors: errors.length > 0 ? errors : undefined
      };
      
    } catch (error) {
      return {
        success: false,
        message: `Error: ${error.message}`
      };
    }
  }
  
  /**
   * Marca un archivo como solo lectura
   * @param {string} filePath - Ruta del archivo
   */
  async setReadOnly(filePath) {
    try {
      if (process.platform === 'win32') {
        // Windows: usar attrib +R
        const { exec } = require('child_process');
        return new Promise((resolve, reject) => {
          exec(`attrib +R "${filePath}"`, (error, stdout, stderr) => {
            if (error) {
              console.error(`Error marcando como solo lectura ${filePath}:`, error.message);
              console.error('stderr:', stderr);
              resolve(false); // No rechazar, solo resolver como false
            } else {
              console.log(`  ✓ Archivo marcado como solo lectura: ${path.basename(filePath)}`);
              resolve(true);
            }
          });
        });
      } else {
        // Linux/Mac: usar chmod
        await fs.chmod(filePath, 0o444);
        console.log(`  ✓ Archivo marcado como solo lectura: ${path.basename(filePath)}`);
        return true;
      }
    } catch (error) {
      console.error('Error setting read-only:', error);
      return false;
    }
  }
  
  /**
   * Restaura los archivos originales de skybox
   * @returns {Promise<Object>} Resultado de la operación
   */
  async restoreOriginal() {
    try {
      // Eliminar archivos de skybox personalizados
      for (const hashInfo of Object.values(this.skyboxHashes)) {
        const filePath = path.join(
          this.rbxStoragePath,
          hashInfo.folder,
          hashInfo.hash
        );
        
        if (await fs.pathExists(filePath)) {
          // Quitar solo lectura primero
          await this.removeReadOnly(filePath);
          // Eliminar archivo
          await fs.remove(filePath);
        }
      }
      
      return {
        success: true,
        message: 'Skybox original restaurado'
      };
      
    } catch (error) {
      return {
        success: false,
        message: `Error al restaurar: ${error.message}`
      };
    }
  }
  
  /**
   * Quita el atributo de solo lectura
   * @param {string} filePath - Ruta del archivo
   */
  async removeReadOnly(filePath) {
    try {
      if (process.platform === 'win32') {
        const { exec } = require('child_process');
        return new Promise((resolve) => {
          exec(`attrib -R "${filePath}"`, (error) => {
            resolve(!error);
          });
        });
      } else {
        await fs.chmod(filePath, 0o644);
      }
    } catch (error) {
      console.error('Error removing read-only:', error);
    }
  }
  
  /**
   * Obtiene información sobre el estado de rbx-storage
   * @returns {Promise<Object>} Información del sistema
   */
  async getInfo() {
    try {
      const exists = await this.exists();
      
      if (!exists) {
        return {
          exists: false,
          path: this.rbxStoragePath,
          customSkyboxApplied: false
        };
      }
      
      // Verificar si hay skybox personalizado
      let customFiles = 0;
      for (const hashInfo of Object.values(this.skyboxHashes)) {
        const filePath = path.join(
          this.rbxStoragePath,
          hashInfo.folder,
          hashInfo.hash
        );
        
        if (await fs.pathExists(filePath)) {
          customFiles++;
        }
      }
      
      return {
        exists: true,
        path: this.rbxStoragePath,
        customSkyboxApplied: customFiles > 0,
        customFilesCount: customFiles
      };
      
    } catch (error) {
      return {
        exists: false,
        error: error.message
      };
    }
  }
}

module.exports = RbxStorageManager;
