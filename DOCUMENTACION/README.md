# Documentación de Yumman Rivals

Esta documentación explica cada aparato/componente de la aplicación Yumman Rivals.

## Índice

1. [Texturas](./TEXTURAS.md) - Sistema de texturas oscuras y potato mode
2. [Skyboxes](./SKYBOXES.md) - Sistema de cielos personalizados
3. [Fuentes](./FUENTES.md) - Sistema de fuentes personalizadas
4. [Flags](./FLAGS.md) - Sistema de flags de Roblox
5. [Atmósfera](./ATMOSFERA.md) - Sistema de atmósfera y neblina
6. [Producción](./PRODUCCION.md) - Configuración para build y empaquetado

## Arquitectura General

La aplicación utiliza Electron para la interfaz gráfica y Node.js para el backend. Los recursos se descargan dinámicamente a `userData/resources` y se aplican a la instalación de Roblox en `AppData/Local/Roblox/Versions`.

## Rutas Importantes

- **Recursos:** `C:\Users\YUMMAN\AppData\Roaming\yumman-rivals\resources`
- **Texturas:** `resources/textures/ruptic-dark/Ruptic Dark`
- **Skyboxes:** `resources/skyboxes/ALL SKYBOXES`
- **Fuentes:** `resources/fonts`
- **Roblox:** `C:\Users\YUMMAN\AppData\Local\Roblox\Versions`
- **Configuración:** `C:\Users\YUMMAN\AppData\Local\YUMMAN RIVALS\app-config.json`

## Protocolos Personalizados

- **skybox://** - Protocolo personalizado para cargar imágenes de skybox desde recursos

## Modos de Ejecución

- **Desarrollo:** Usa rutas relativas `__dirname/../resources` para facilitar desarrollo
- **Producción:** Usa `userData/resources` para recursos descargados dinámicamente
- **Detección:** `app.isPackaged` para distinguir entre modos
