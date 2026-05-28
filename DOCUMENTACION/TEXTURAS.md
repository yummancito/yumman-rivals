# Sistema de Texturas

## Descripción

El sistema de texturas permite aplicar texturas personalizadas a Roblox para mejorar el rendimiento y la estética.

## Tipos de Texturas

### 1. Texturas Oscuras (Dark Textures)

**Handler:** `apply-dark-textures` (main.js líneas 997-1140)

**Flujo:**
1. Cierra Roblox si está corriendo
2. Crea backup de texturas originales en `userData/resources/textures/DARK OFF`
3. Copia texturas desde `resources/textures/ruptic-dark/Ruptic Dark` a la carpeta de Roblox
4. Quita atributo read-only: `attrib -R`
5. Copia archivos con overwrite
6. Vuelve a proteger: `attrib +R`
7. Guarda configuración en `YUMMAN RIVALS/config.json` (darkOn: true)

**Ruta destino:** `AppData/Local/Roblox/Versions/version-XXX/PlatformContent/pc/textures`

**Archivos copiados:** 24 archivos .tex

**Nota:** NO copia la carpeta `sky` para mantener el skybox seleccionado

### 2. Texturas Potato (Potato Mode)

**Handler:** `apply-potato-textures` (main.js líneas 2534-2608)

**Flujo:**
1. Crea backup de texturas originales
2. Copia texturas desde `resources/textures/potato` a la carpeta de Roblox
3. Aplica skybox gris (Chill gray) para potato mode
4. Guarda configuración (potatoTexOn: true, darkOn: false)

**Archivos copiados:** 1 archivo (textura potato)

**Skybox aplicado:** Chill gray (6 archivos .tex)

## Restauración de Texturas

**Handler:** `restore-original` (main.js líneas 1179-1230)

**Flujo:**
1. Cierra Roblox si está corriendo
2. Copia backup desde `userData/resources/textures/DARK OFF` a la carpeta de Roblox
3. NO copia la carpeta `sky` (mantener skybox actual)
4. Guarda configuración (darkOn: false, potatoTexOn: false)

## Rutas Dinámicas

Las texturas usan rutas dinámicas mediante `getTexturesPath()` para asegurar que siempre se use la ruta correcta de `userData/resources`.

## Errores Comunes

- **ERROR #12:** Protocolo skybox:// no resuelve preview - CORREGIDO
- **ERROR #13:** Funciones IPC usan rutas estáticas - CORREGIDO
- **ERROR #14:** Carpeta YUMMAN RIVALS\Versions no existe - CORREGIDO
- **ERROR #15:** Ruta de destino incorrecta - CORREGIDO
- **ERROR #16:** Texturas sobreescriben skybox - CORREGIDO
