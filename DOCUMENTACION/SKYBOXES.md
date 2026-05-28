# Sistema de Skyboxes

## Descripción

El sistema de skyboxes permite aplicar cielos personalizados a Roblox mediante archivos .tex.

## Aplicación de Skyboxes

**Handler:** `apply-skybox-by-name` (main.js líneas 1619-1750)

**Flujo:**

### PASO 1: Aplicar hashes base al rbx-storage
- Ejecuta `move-silent.bat` (SKYFIX)
- Copia assets base a `AppData/Local/Roblox/rbx-storage/[2 primeros chars del hash]/[hash completo]`
- Marca archivos como read-only
- Permite skyboxes personalizados sin modificar archivos del juego

### PASO 2: Aplicar skybox en TODAS las versiones de Roblox
- Detecta todas las carpetas `version-XXX` en `Roblox/Versions`
- Filtra archivos .tex (6 caras: ft, bk, lf, rt, up, dn)
- Copia los 6 archivos .tex a `version-XXX/PlatformContent/pc/textures/sky/`
- Aplica en cada versión encontrada

## Método rbx-storage

**Archivo:** `rbxStorageManager.js`

**Función:** `applySkyboxFromTexFiles`

**Flujo:**
1. Lee archivos .tex del skybox
2. Calcula hash SHA256 de cada archivo
3. Copia a `rbx-storage/[2 primeros chars del hash]/[hash completo]`
4. Marca archivos como read-only
5. Permite skyboxes personalizados sin modificar archivos del juego

## Conversión de Skyboxes

**Archivo:** `skyConverter.js`

**Función:** Convierte imagen a skybox

**Modos:**
- **Panorámico (ratio 2:1):** Proyección esférica a 6 caras reales
- **Directo:** Aplica la misma imagen en las 6 caras

**Genera:**
- 6 archivos .tex (PNG 1024x1024 renombrados)
- Preview `! SCREENSHOT.png`

## Archivos de Skybox

**Estructura:**
```
resources/skyboxes/ALL SKYBOXES/[Nombre del Skybox]/
  ├── sky512_ft.tex (Front)
  ├── sky512_bk.tex (Back)
  ├── sky512_lf.tex (Left)
  ├── sky512_rt.tex (Right)
  ├── sky512_up.tex (Up)
  ├── sky512_dn.tex (Down)
  ├── ! SCREENSHOT.png (Preview)
  └── assets/ (Hashes para rbx-storage)
```

## Protocolo skybox://

**Registro:** `protocol.registerFileProtocol('skybox://', ...)`

**Función:** Carga imágenes de preview desde `resources/ui-images/`

**Uso:** `skybox://NombreDelSkybox.png`

## Errores Comunes

- **ERROR #12:** Protocolo skybox:// cortaba incorrectamente la URL - CORREGIDO
- **ERROR #18:** Archivos se copiaban con tamaños incorrectos - CORREGIDO

## Skyboxes Disponibles

- Aurora
- Beautiful
- Blue
- Chill gray
- Chill pink
- ChromaKey
- Cyan
- Emo
- Goodnight
- Hades
- Hazy
- Light Blue
- Light pink
- Moonlight
- NeonSky
- NeonSky2
- Night
- Orange
- Overcast
- Pandora
- Pink Sunrise
- Red
- Space Blue
- Spooky
- Universe
