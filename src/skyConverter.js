const Jimp = require('jimp');
const fs = require('fs-extra');
const path = require('path');

/**
 * Convierte una imagen a skybox de Roblox (.tex = PNG 1024x1024).
 *
 * Los archivos .tex de Roblox son PNG estándar renombrados.
 * Cada skybox tiene 6 caras: ft, bk, lf, rt, up, dn.
 *
 * Modos de conversión según el tipo de imagen:
 *   1. Panorámica equirectangular (2:1 ratio) → proyección esférica a 6 caras
 *   2. Imagen normal (cualquier ratio)        → imagen directa en las 6 caras
 *
 * @param {string} imagePath      - Ruta de la imagen del usuario
 * @param {string} outputDir      - Directorio de salida para los .tex
 * @param {string} templateSkybox - Ruta al skybox plantilla (no usada, mantenida por compatibilidad)
 * @returns {Promise<Object>}
 */
async function convertImageToSkybox(imagePath, outputDir, templateSkybox = null) {
  let userImage = null;
  try {
    console.log('=== CONVIRTIENDO IMAGEN A SKYBOX ===');
    console.log('Imagen:', imagePath);
    console.log('Salida:', outputDir);

    await fs.ensureDir(outputDir);

    userImage = await Jimp.read(imagePath);
    const { width, height } = userImage.bitmap;
    const ratio = width / height;

    console.log(`Dimensiones: ${width}x${height} (ratio ${ratio.toFixed(2)})`);

    // Modo 1: Panorámica equirectangular (ratio ~2:1)
    if (ratio >= 1.8 && ratio <= 2.2) {
      console.log('Modo: panorámica equirectangular → 6 caras reales');
      const result = await convertEquirectangular(userImage, outputDir);
      userImage.dispose(); // Liberar memoria
      return result;
    }

    // Modo 2: Imagen normal → aplicar en las 6 caras directamente
    console.log('Modo: imagen directa → 6 caras con la imagen del usuario');
    const result = await convertDirectImage(userImage, outputDir);
    userImage.dispose(); // Liberar memoria
    return result;

  } catch (error) {
    console.error('Error al convertir imagen:', error);
    if (userImage) userImage.dispose(); // Liberar memoria en caso de error
    return { success: false, message: `Error: ${error.message}` };
  }
}

/**
 * Convierte una imagen equirectangular (panorámica 360°) en 6 caras de skybox.
 * Usa Jimp.create() compatible con Jimp 0.22.x
 */
async function convertEquirectangular(image, outputDir) {
  const SIZE = 1024;

  // Escalar la panorámica a 4096x2048 para mejor calidad de muestreo
  const pano = image.clone().resize(4096, 2048, Jimp.RESIZE_BICUBIC);
  const pW = pano.bitmap.width;
  const pH = pano.bitmap.height;

  const faces = [
    { name: 'sky512_ft', yaw: 0,   pitch: 0   },
    { name: 'sky512_bk', yaw: 180, pitch: 0   },
    { name: 'sky512_lf', yaw: 270, pitch: 0   },
    { name: 'sky512_rt', yaw: 90,  pitch: 0   },
    { name: 'sky512_up', yaw: 0,   pitch: 90  },
    { name: 'sky512_dn', yaw: 0,   pitch: -90 },
  ];

  let copiedCount = 0;

  for (const face of faces) {
    // Jimp 0.22: usar Jimp.create() en vez de new Jimp()
    const faceImg = await Jimp.create(SIZE, SIZE, 0x000000FF);

    for (let py = 0; py < SIZE; py++) {
      for (let px = 0; px < SIZE; px++) {
        const u = (px / (SIZE - 1)) * 2 - 1;
        const v = (py / (SIZE - 1)) * 2 - 1;

        let dx, dy, dz;

        if (face.pitch === 0) {
          const faceYaw = face.yaw * Math.PI / 180;
          const fx = Math.sin(faceYaw);
          const fz = Math.cos(faceYaw);
          const rx = Math.cos(faceYaw);
          const rz = -Math.sin(faceYaw);
          dx = fx + u * rx;
          dy = -v;
          dz = fz + u * rz;
        } else if (face.pitch === 90) {
          dx = u; dy = -1; dz = v;
        } else {
          dx = u; dy = 1; dz = -v;
        }

        const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
        dx /= len; dy /= len; dz /= len;

        const theta = Math.atan2(dx, dz);
        const phi   = Math.asin(Math.max(-1, Math.min(1, dy)));

        const panoU = (theta / (2 * Math.PI) + 0.5) % 1;
        const panoV = 0.5 - phi / Math.PI;

        const srcX = Math.min(pW - 1, Math.max(0, Math.round(panoU * (pW - 1))));
        const srcY = Math.min(pH - 1, Math.max(0, Math.round(panoV * (pH - 1))));

        faceImg.setPixelColor(pano.getPixelColor(srcX, srcY), px, py);
      }
    }

    const destPath = path.join(outputDir, `${face.name}.tex`);
    await faceImg.writeAsync(destPath);
    faceImg.dispose(); // Liberar memoria de cada cara
    copiedCount++;
    console.log(`  ✓ ${face.name}.tex generado`);
  }

  const preview = image.clone().resize(512, 256, Jimp.RESIZE_BICUBIC);
  await preview.writeAsync(path.join(outputDir, '! SCREENSHOT.png'));
  preview.dispose(); // Liberar memoria del preview
  pano.dispose(); // Liberar memoria de la panorámica

  return {
    success: true,
    message: `Skybox panorámico convertido (${copiedCount} caras reales desde tu imagen)`,
    files: copiedCount,
    mode: 'equirectangular',
  };
}

/**
 * Usa la imagen directamente como las 6 caras del skybox.
 * Compatible con Jimp 0.22.x
 */
async function convertDirectImage(image, outputDir) {
  const SIZE = 1024;
  const faceNames = ['sky512_ft', 'sky512_bk', 'sky512_lf', 'sky512_rt', 'sky512_up', 'sky512_dn'];

  const scaled = image.clone().resize(SIZE, SIZE, Jimp.RESIZE_BICUBIC);

  let copiedCount = 0;
  for (const name of faceNames) {
    const destPath = path.join(outputDir, `${name}.tex`);
    try {
      await scaled.clone().writeAsync(destPath);
      copiedCount++;
      console.log(`  ✓ ${name}.tex`);
    } catch (e) {
      console.warn(`  ✗ Error en ${name}:`, e.message);
    }
  }

  scaled.dispose(); // Liberar memoria de la imagen escalada

  const preview = image.clone().resize(512, 512, Jimp.RESIZE_BICUBIC);
  await preview.writeAsync(path.join(outputDir, '! SCREENSHOT.png'));
  preview.dispose(); // Liberar memoria del preview

  return {
    success: true,
    message: `Skybox creado con tu imagen en las 6 caras (${copiedCount} archivos)`,
    files: copiedCount,
    mode: 'direct',
    tip: 'Para mejor resultado usa una imagen panorámica 360° (ratio 2:1)',
  };
}

/**
 * Genera una vista previa de 400x400.
 */
async function generatePreview(imagePath, outputPath) {
  try {
    const image = await Jimp.read(imagePath);
    image.resize(400, 400, Jimp.RESIZE_BICUBIC);
    await image.writeAsync(outputPath);
    return { success: true, previewPath: outputPath };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

module.exports = { convertImageToSkybox, generatePreview };
