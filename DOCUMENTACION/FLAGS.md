# Sistema de Flags

## Descripción

El sistema de flags permite modificar configuraciones de Roblox para mejorar el rendimiento y la estética.

## Flags Disponibles

### Potato Mode (potatoOn)
- **Descripción:** Reduce la calidad gráfica para mejorar el rendimiento
- **Efecto:** Reduce calidad de texturas, sombras, efectos
- **Ubicación:** `ClientSettings/ClientAppSettings.json`

### Low Latency (lowLatOn)
- **Descripción:** Reduce la latencia de red
- **Efecto:** Optimiza la conexión para menor ping
- **Ubicación:** `ClientSettings/ClientAppSettings.json`

### Dark Textures (darkOn)
- **Descripción:** Activa texturas oscuras
- **Efecto:** Aplica texturas Ruptic Dark
- **Ubicación:** `YUMMAN RIVALS/app-config.json`

### Potato Textures (potatoTexOn)
- **Descripción:** Activa texturas potato
- **Efecto:** Aplica texturas potato + skybox gris
- **Ubicación:** `YUMMAN RIVALS/app-config.json`

## Sincronización de Flags

**Handler:** `sync-flags-to-roblox` (main.js líneas 830-870)

**Flujo:**
1. Lee configuración desde `YUMMAN RIVALS/app-config.json`
2. Modifica `ClientSettings/ClientAppSettings.json` de Roblox
3. Sincroniza 10 flags básicos o 235 flags completos

## Ubicación de Archivos

**Configuración YUMMAN RIVALS:** `AppData/Local/YUMMAN RIVALS/app-config.json`

**Configuración Roblox:** `AppData/Local/Roblox/ClientSettings/ClientAppSettings.json`

## Ejemplo de Configuración

```json
{
  "potatoOn": true,
  "lowLatOn": true,
  "darkOn": true,
  "potatoTexOn": false,
  "selectedSky": "Moonlight"
}
```

## Notas

- Los flags se sincronizan automáticamente al cambiar configuración
- Los flags persisten entre sesiones
- Algunos flags requieren reiniciar Roblox para surtir efecto
