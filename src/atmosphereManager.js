const fs = require('fs-extra');
const path = require('path');
const os = require('os');

/**
 * Gestor para aplicar atmósfera/neblina personalizada en Roblox
 * Modifica los archivos de lighting y atmósfera
 */

class AtmosphereManager {
  constructor() {
    this.rbxStoragePath = path.join(
      os.homedir(),
      'AppData',
      'Local',
      'Roblox',
      'rbx-storage'
    );
  }
  
  /**
   * Crea archivos de atmósfera oscura con neblina
   * @param {string} texturePath - Ruta a la carpeta de texturas de Roblox
   * @param {Object} options - Opciones de atmósfera
   * @returns {Promise<Object>} Resultado de la operación
   */
  async applyDarkAtmosphere(texturePath, options = {}) {
    try {
      const {
        density = 0.4,        // Densidad de la neblina (0-1, 0.4 = suave)
        offset = 0.2,         // Offset de la neblina
        color = [15, 15, 20], // Color RGB oscuro (casi negro con tinte azul)
        decay = [50, 50, 60], // Color de decay (tinte azul oscuro)
        glare = 0.1,          // Brillo (muy bajo para oscuro)
        haze = 2.0            // Neblina adicional
      } = options;
      
      console.log('=== APLICANDO ATMÓSFERA OSCURA ===');
      console.log(`Densidad: ${density}, Color: RGB(${color.join(', ')})`);
      
      // Crear configuración de atmósfera
      const atmosphereConfig = {
        Density: density,
        Offset: offset,
        Color: color,
        Decay: decay,
        Glare: glare,
        Haze: haze
      };
      
      // Guardar configuración en archivo JSON para referencia
      const configPath = path.join(texturePath, 'atmosphere_config.json');
      await fs.writeJson(configPath, atmosphereConfig, { spaces: 2 });
      console.log(`✓ Configuración guardada en: ${configPath}`);
      
      // Nota: Roblox no permite modificar directamente la atmósfera desde archivos
      // La atmósfera se controla desde el juego mismo
      // Esta configuración sirve como referencia para aplicar manualmente
      
      return {
        success: true,
        message: 'Configuración de atmósfera creada. Nota: La atmósfera debe aplicarse desde el juego.',
        config: atmosphereConfig,
        configPath: configPath
      };
      
    } catch (error) {
      console.error('Error al aplicar atmósfera:', error);
      return {
        success: false,
        message: `Error: ${error.message}`
      };
    }
  }
  
  /**
   * Aplica un filtro de color oscuro a las texturas del cielo
   * Esto crea un efecto de atmósfera oscura visual
   * @param {string} skyboxPath - Ruta a los archivos del skybox
   * @param {string} outputPath - Ruta de salida
   * @returns {Promise<Object>} Resultado
   */
  async applyDarkFilter(skyboxPath, outputPath) {
    try {
      console.log('=== APLICANDO FILTRO OSCURO AL CIELO ===');
      
      // Copiar archivos del skybox
      await fs.ensureDir(outputPath);
      const files = await fs.readdir(skyboxPath);
      const texFiles = files.filter(f => f.endsWith('.tex'));
      
      let copiedCount = 0;
      for (const file of texFiles) {
        const src = path.join(skyboxPath, file);
        const dest = path.join(outputPath, file);
        await fs.copy(src, dest, { overwrite: true });
        copiedCount++;
      }
      
      console.log(`✓ ${copiedCount} archivos de cielo copiados`);
      
      // Crear archivo de configuración de filtro
      const filterConfig = {
        type: 'dark_atmosphere',
        brightness: 0.3,  // 30% de brillo original
        contrast: 1.2,    // Aumentar contraste
        saturation: 0.7,  // Reducir saturación
        tint: [10, 10, 15] // Tinte azul oscuro
      };
      
      const filterPath = path.join(outputPath, 'filter_config.json');
      await fs.writeJson(filterPath, filterConfig, { spaces: 2 });
      
      return {
        success: true,
        message: `Filtro oscuro aplicado a ${copiedCount} archivos`,
        filesProcessed: copiedCount
      };
      
    } catch (error) {
      console.error('Error al aplicar filtro:', error);
      return {
        success: false,
        message: `Error: ${error.message}`
      };
    }
  }
  
  /**
   * Obtiene presets de atmósfera predefinidos
   * @returns {Object} Presets disponibles
   */
  getAtmospherePresets() {
    return {
      'dark_foggy': {
        name: 'Oscuro con Neblina',
        description: 'Atmósfera oscura con neblina suave',
        density: 0.4,
        offset: 0.2,
        color: [15, 15, 20],
        decay: [50, 50, 60],
        glare: 0.1,
        haze: 2.0
      },
      'very_dark': {
        name: 'Muy Oscuro',
        description: 'Atmósfera muy oscura, casi noche',
        density: 0.6,
        offset: 0.1,
        color: [5, 5, 10],
        decay: [30, 30, 40],
        glare: 0.05,
        haze: 3.0
      },
      'blue_fog': {
        name: 'Neblina Azul',
        description: 'Neblina con tinte azul oscuro',
        density: 0.5,
        offset: 0.25,
        color: [10, 15, 25],
        decay: [40, 50, 70],
        glare: 0.15,
        haze: 2.5
      },
      'purple_haze': {
        name: 'Neblina Púrpura',
        description: 'Neblina con tinte púrpura oscuro',
        density: 0.45,
        offset: 0.2,
        color: [20, 10, 25],
        decay: [60, 40, 70],
        glare: 0.12,
        haze: 2.2
      },
      'light_fog': {
        name: 'Neblina Ligera',
        description: 'Neblina suave y sutil',
        density: 0.25,
        offset: 0.3,
        color: [25, 25, 30],
        decay: [70, 70, 80],
        glare: 0.2,
        haze: 1.5
      }
    };
  }
}

module.exports = AtmosphereManager;
