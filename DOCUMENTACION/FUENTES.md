# Sistema de Fuentes

## Descripción

El sistema de fuentes permite aplicar fuentes personalizadas a Roblox para cambiar el estilo de texto en el juego.

## Aplicación de Fuentes

**Handler:** `apply-font-pack` (main.js líneas 2704-2762)

**Flujo:**
1. Busca fuente en `resources/fonts/` o `resources/fonts/` (fallback)
2. Obtiene ruta de fuentes de Roblox: `Roblox/Versions/version-XXX/content/fonts`
3. Crea backup de fuentes originales en `userData/fonts_backup`
4. Quita atributo read-only de archivos de fuente
5. Copia fuente personalizada a todos los archivos .ttf/.otf de Roblox
6. Guarda configuración (activeFont: nombre de fuente)

**Archivos copiados:** ~75 archivos (todos los .ttf/.otf en la carpeta de fuentes)

## Restauración de Fuentes

**Handler:** `restore-fonts` (main.js líneas 2792-2821)

**Flujo:**
1. Verifica que exista backup en `userData/fonts_backup`
2. Copia backup a la carpeta de fuentes de Roblox
3. Elimina `activeFont` de la configuración

## Rutas

**Origen:** `resources/fonts/[nombre].ttf` o `.otf`

**Destino:** `AppData/Local/Roblox/Versions/version-XXX/content/fonts/`

**Backup:** `AppData/Roaming/yumman-rivals/fonts_backup`

## Fuentes Disponibles

- Minecraft.ttf

## Re-aplicación al Iniciar

**Ubicación:** `main.js` líneas 2229-2248

**Flujo:**
1. Lee configuración para verificar si hay `activeFont`
2. Si existe, re-aplica la fuente al iniciar la aplicación
3. Usa ruta dinámica de Roblox normal

## Errores Comunes

- **ERROR #19:** Botones de fuentes no funcionaban por ruta incorrecta - CORREGIDO

## Notas

- Las fuentes se aplican a TODOS los archivos .ttf/.otf en la carpeta de fuentes de Roblox
- El backup se crea solo la primera vez que se aplica una fuente
- La configuración persiste entre sesiones
