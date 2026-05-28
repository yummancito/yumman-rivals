# Configuración para Producción

## Descripción

Este documento explica la configuración necesaria para compilar y empaquetar la aplicación para producción.

## Limitaciones de Plataforma

⚠️ **IMPORTANTE:** Esta aplicación actualmente solo es compatible con **Windows**.

### Dependencias Windows-Specific

La aplicación utiliza las siguientes dependencias que solo funcionan en Windows:

1. **Rutas del sistema:**
   - `os.homedir() + 'AppData/Local'` - Solo existe en Windows
   - `process.env.LOCALAPPDATA` - Variable de entorno solo en Windows

2. **Comandos del sistema:**
   - `attrib` - Comando de Windows para atributos de archivos
   - `.exe` y `.bat` - Extensiones de archivos de Windows

3. **Configuración de build:**
   - Solo configurado para Windows (NSIS + Portable)
   - No hay configuración para macOS o Linux

### Requisitos de Sistema

- **Sistema operativo:** Windows 10 o superior (64-bit)
- **Roblox:** Debe estar instalado en la ruta estándar `AppData/Local/Roblox/Versions`
- **Espacio en disco:** ~300 MB para recursos descargados
- **Permisos:** Administrador (requerido por configuración de NSIS)

### Incompatibilidades

La aplicación NO funcionará en:
- **macOS:** Rutas de sistema diferentes, comandos diferentes
- **Linux:** Rutas de sistema diferentes, comandos diferentes
- **Windows 32-bit:** Solo compilado para x64

## Build Configuration

### package.json

**Archivos empaquetados:**
- `ui-source/out/**/*` - UI compilada
- `src/**/*` - Código fuente principal
- `icon.ico` - Icono de la aplicación
- `resources/move-silent.bat` - Script para skyfix
- `resources/RobloxPlayerInstaller.exe` - Instalador de Roblox
- `resources/potatomode.json` - Configuración de potato mode

**Archivos excluidos:**
- `!resources/**/*` - Recursos grandes (se descargan dinámicamente)
- `!ui-source/out/skyboxes/**/*` - Skyboxes de UI

**Archivos extra (extraResources):**
- move-silent.bat
- RobloxPlayerInstaller.exe
- potatomode.json

Estos archivos se empaquetan en `app.asar.unpacked` para estar disponibles en producción.

## Comandos de Build

```bash
# Compilar UI
npm run build:ui

# Build completo (Windows NSIS + Portable)
npm run build

# Build solo Windows
npm run build:win

# Build portable
npm run build:portable
```

## Rutas en Producción

### Desarrollo vs Producción

**Desarrollo:**
- `RESOURCES_PATH = path.join(__dirname, '..', 'resources')`
- Fallbacks usan rutas relativas
- Recursos locales disponibles

**Producción:**
- `RESOURCES_PATH = app.getPath('userData')/resources`
- Fallbacks de desarrollo deshabilitados
- Recursos descargados dinámicamente desde GitHub Releases

### Detección de Modo

```javascript
const isPackaged = app.isPackaged;

if (isPackaged) {
  // Producción: usar userData
  RESOURCES_PATH = resourceDownloader.getResourcesPath();
} else {
  // Desarrollo: usar carpeta local
  RESOURCES_PATH = path.join(__dirname, '..', 'resources');
}
```

## Fallbacks Corregidos

Se corrigieron 15 fallbacks de rutas relativas para usar `app.isPackaged`:

1. **resourceDownloader.js** - Fallback de fonts
2. **main.js** - 12 fallbacks (potato textures, fuentes, potatomode.json, skyboxes, move-silent.bat, RobloxPlayerInstaller.exe)
3. **main/app-manager.js** - Fallback de recursos locales

En producción, estos fallbacks están deshabilitados y se usan rutas de `userData`.

## Archivos Críticos

Los siguientes archivos deben estar disponibles en producción:

1. **move-silent.bat** (1.6KB)
   - Ubicación: `resources/move-silent.bat`
   - Uso: Aplicar skyfix assets a rbx-storage
   - Empaquetado: extraResources

2. **RobloxPlayerInstaller.exe** (10MB)
   - Ubicación: `resources/RobloxPlayerInstaller.exe`
   - Uso: Reinstalar Roblox si no hay backup
   - Empaquetado: extraResources

3. **potatomode.json** (11KB)
   - Ubicación: `resources/potatomode.json`
   - Uso: Configuración de flags de potato mode
   - Empaquetado: extraResources

## Descarga de Recursos

En producción, los recursos se descargan automáticamente desde Cloudflare R2:

```
https://pub-6fe6ab5451da4b06907a0496a047fd83.r2.dev/manifest.json
https://pub-6fe6ab5451da4b06907a0496a047fd83.r2.dev/resources.zip
```

El sistema usa `manifest.json` para verificar versiones y descargar `resources.zip` automáticamente.

El ZIP contiene:
- skyboxes/ (25 skyboxes)
- textures/ (ruptic-dark + potato)
- fonts/ (Minecraft.ttf)

Tamaño aproximado: 272 MB

**Notas:**
- Cloudflare R2 se usa en lugar de GitHub Releases para mejor rendimiento
- El manifest.json contiene versiones de app y recursos
- Sistema de actualización automático con verificación SHA256

## Verificación de Producción

Antes de lanzar, verificar:

1. **Build exitoso**
   ```bash
   npm run build
   ```

2. **Archivos críticos empaquetados**
   - Verificar en `dist/` que existan los archivos extraResources

3. **Instalador funciona**
   - Ejecutar el instalador NSIS
   - Verificar que la aplicación se inicie

4. **Descarga de recursos**
   - Verificar que los recursos se descarguen correctamente
   - Verificar que skyboxes, texturas y fonts estén disponibles

5. **Funcionalidad**
   - Aplicar skybox
   - Aplicar texturas oscuras
   - Aplicar fuente
   - Aplicar potato mode
   - Sincronizar flags

## Errores Comunes en Producción

### ERROR #20: Fallbacks de rutas relativas
- **Problema:** `__dirname/../resources` no funciona en .asar
- **Solución:** Usar `app.isPackaged` para detectar modo
- **Estado:** CORREGIDO

### ERROR #21: Archivos críticos no empaquetados
- **Problema:** move-silent.bat, RobloxPlayerInstaller.exe, potatomode.json no disponibles
- **Solución:** Agregar a extraResources en package.json
- **Estado:** CORREGIDO

## Notas

- Los recursos grandes (skyboxes, texturas) NO se empaquetan
- Se descargan dinámicamente para reducir tamaño del instalador
- Los archivos críticos pequeños SÍ se empaquetan
- La configuración persiste en `YUMMAN RIVALS/app-config.json`
