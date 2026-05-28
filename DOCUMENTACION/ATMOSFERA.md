# Sistema de Atmósfera

## Descripción

El sistema de atmósfera permite modificar la neblina, densidad y color del cielo en Roblox.

## Archivo

**Archivo:** `atmosphereManager.js`

## Funciones

### applyDarkAtmosphere

**Descripción:** Crea configuración JSON con parámetros de atmósfera oscura

**Parámetros:**
- **density:** Densidad de neblina (0-1)
- **color:** Color RGB oscuro
- **decay:** Color de decay
- **glare:** Brillo
- **haze:** Neblina adicional

**Nota:** La atmósfera NO se aplica automáticamente desde archivos, debe configurarse desde el juego. El JSON sirve como referencia.

### getAtmospherePresets

**Descripción:** Retorna presets de atmósfera predefinidos

**Presets:**
- **dark_foggy:** Oscuro con neblina suave
- **very_dark:** Muy oscuro, casi noche
- **blue_fog:** Neblina con tinte azul
- **purple_haze:** Neblina púrpura
- **light_fog:** Neblina ligera

## Uso

La atmósfera se configura manualmente desde el juego usando los valores de referencia del JSON generado.

## Limitaciones

- No se aplica automáticamente desde archivos
- Requiere configuración manual en el juego
- Los valores sirven como referencia/guía

## Notas

- Este sistema es experimental
- Los valores pueden requerir ajuste según el mapa
- No todos los parámetros son soportados en todas las versiones de Roblox
