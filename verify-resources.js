// Script para verificar que los recursos estén completos antes de subirlos
const fs = require('fs-extra');
const path = require('path');

const RESOURCES_PATH = path.join(__dirname, 'resources');
const SKYBOXES_PATH = path.join(RESOURCES_PATH, 'skyboxes', 'all-skyboxes', 'ALL SKYBOXES');

console.log('🔍 Verificando recursos...\n');

// Verificar skyboxes
if (!fs.existsSync(SKYBOXES_PATH)) {
  console.error('❌ No se encontró la carpeta de skyboxes:', SKYBOXES_PATH);
  process.exit(1);
}

const skyboxes = fs.readdirSync(SKYBOXES_PATH).filter(f => {
  return fs.statSync(path.join(SKYBOXES_PATH, f)).isDirectory();
});

console.log(`✅ Encontrados ${skyboxes.length} skyboxes\n`);

let allValid = true;
let skyboxesWithAssets = 0;
let skyboxesWithoutAssets = 0;

for (const skybox of skyboxes) {
  const skyboxPath = path.join(SKYBOXES_PATH, skybox);
  const assetsPath = path.join(skyboxPath, 'assets');
  const texFiles = fs.readdirSync(skyboxPath).filter(f => f.endsWith('.tex'));
  
  const hasAssets = fs.existsSync(assetsPath);
  const assetsCount = hasAssets ? fs.readdirSync(assetsPath).length : 0;
  
  if (hasAssets && assetsCount === 6 && texFiles.length === 6) {
    console.log(`✅ ${skybox}: ${texFiles.length} .tex + ${assetsCount} assets`);
    skyboxesWithAssets++;
  } else if (!hasAssets && texFiles.length === 6) {
    console.log(`⚠️  ${skybox}: ${texFiles.length} .tex (sin assets)`);
    skyboxesWithoutAssets++;
  } else {
    console.log(`❌ ${skybox}: INCOMPLETO (${texFiles.length} .tex, ${assetsCount} assets)`);
    allValid = false;
  }
}

console.log('\n📊 Resumen:');
console.log(`   Skyboxes con assets: ${skyboxesWithAssets}`);
console.log(`   Skyboxes sin assets: ${skyboxesWithoutAssets}`);
console.log(`   Total: ${skyboxes.length}`);

// Verificar texturas
const texturesPath = path.join(RESOURCES_PATH, 'textures', 'ruptic-dark', 'Ruptic Dark');
if (fs.existsSync(texturesPath)) {
  const items = fs.readdirSync(texturesPath);
  console.log(`\n✅ Texturas Ruptic Dark: ${items.length} items`);
} else {
  console.log('\n❌ No se encontraron texturas Ruptic Dark');
  allValid = false;
}

// Verificar potato textures
const potatoPath = path.join(RESOURCES_PATH, 'textures', 'potato', 'PlatformContent', 'pc', 'textures');
if (fs.existsSync(potatoPath)) {
  const items = fs.readdirSync(potatoPath);
  console.log(`✅ Texturas Potato: ${items.length} items`);
} else {
  console.log('❌ No se encontraron texturas Potato');
  allValid = false;
}

// Verificar fuentes
const fontsPath = path.join(RESOURCES_PATH, 'fonts');
if (fs.existsSync(fontsPath)) {
  const fonts = fs.readdirSync(fontsPath).filter(f => f.endsWith('.ttf') || f.endsWith('.otf'));
  console.log(`✅ Fuentes: ${fonts.length} archivos`);
} else {
  console.log('⚠️  No se encontraron fuentes');
}

console.log('\n' + '='.repeat(50));
if (allValid) {
  console.log('✅ TODOS LOS RECURSOS ESTÁN COMPLETOS');
  console.log('   Puedes crear el ZIP y subirlo a GitHub');
} else {
  console.log('❌ FALTAN RECURSOS O ESTÁN INCOMPLETOS');
  console.log('   Revisa los errores arriba antes de subir');
  process.exit(1);
}
