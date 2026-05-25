# YUMMAN RIVALS - Roblox Texture Manager

Aplicación de escritorio para gestionar texturas y skyboxes personalizados en Roblox Rivals.

## Características

- **25+ Skyboxes personalizados** - Cambia el cielo de Rivals con un click
- **Texturas negras (Ruptic Dark)** - Mejora la visibilidad en el juego
- **Soporte multi-ejecutor** - Compatible con Roblox, Fishtrap y Bloxtrap
- **Método rbx-storage** - Aplicación rápida sin permisos de administrador
- **Auto-updates** - Mantente actualizado automáticamente
- **Analytics integrado** - Estadísticas de uso (opcional)

## Instalación

### Para Usuarios

1. Descarga el instalador desde [Releases](https://github.com/mmgb5656/yumman-rivals/releases)
2. Ejecuta `YUMMAN-RIVALS-Setup.exe`
3. La app descargará los recursos necesarios en la primera ejecución
4. ¡Listo! Abre la app y empieza a personalizar

### Para Desarrolladores

```bash
# Clonar el repositorio
git clone https://github.com/mmgb5656/yumman-rivals.git
cd yumman-rivals

# Instalar dependencias
npm install

# Instalar dependencias de la UI
cd ui
npm install
cd ..

# Compilar la UI
npm run build:ui

# Ejecutar en modo desarrollo
npm start
```

## Estructura del Proyecto

```
yumman-rivals/
├── src/
│   ├── main.js              # Proceso principal de Electron
│   ├── preload.js           # Script de preload (bridge)
│   ├── skyConverter.js      # Conversión de imágenes a skybox
│   ├── rbxStorageManager.js # Gestor de rbx-storage (método rápido)
│   ├── atmosphereManager.js # Gestor de atmósfera
│   └── updater.js           # Sistema de actualizaciones
├── ui/                      # Interfaz de usuario (Next.js)
│   ├── app/                 # Páginas de la app
│   ├── components/          # Componentes React
│   │   ├── texture-manager/ # Componentes principales
│   │   └── ui/              # Componentes UI (shadcn)
│   └── out/                 # Build de producción
├── resources/               # Recursos (NO incluidos en repo)
│   ├── skyboxes/            # 25 skyboxes personalizados
│   ├── textures/            # Texturas negras (Ruptic Dark)
│   └── ui-images/           # Previews de skyboxes
└── package.json             # Configuración del proyecto
```

## Tecnologías

- **Electron 28** - Framework de aplicaciones de escritorio
- **Next.js 14** - Framework React para la UI
- **shadcn/ui** - Componentes UI modernos
- **Tailwind CSS** - Estilos
- **Supabase** - Base de datos y analytics
- **electron-updater** - Sistema de auto-updates

## Scripts Disponibles

```bash
# Desarrollo
npm start              # Ejecutar app en modo desarrollo
npm run dev            # Ejecutar con hot-reload (UI + Electron)

# Build
npm run build:ui       # Compilar interfaz Next.js
npm run build          # Compilar app completa
npm run build:win      # Build para Windows (NSIS + Portable)

# Producción
npm run dist           # Crear instalador de producción
```

## Cómo Funciona

### Método rbx-storage (Recomendado)

Este método usa el sistema de almacenamiento de Roblox para aplicar skyboxes de forma rápida y sin requerir permisos de administrador. Es más seguro y no modifica archivos del juego directamente.

### Método Tradicional

El método tradicional copia archivos directamente a la carpeta de texturas de Roblox. Requiere permisos de administrador y puede ser más lento, pero es compatible con versiones antiguas.

## Sistema de Analytics

La app incluye un sistema de analytics opcional que registra:

- Eventos de uso (skybox aplicado, errores, etc.)
- Versión de la app
- Sistema operativo

**NO recopila:**
- Información personal
- Datos sensibles

Los datos se almacenan en Supabase y son completamente anónimos (ID basado en hardware).

## Privacidad

- **ID de usuario**: Hash anónimo basado en hardware (no reversible)
- **Datos recopilados**: Solo eventos de uso y estadísticas técnicas
- **Sin tracking**: No se rastrea navegación ni comportamiento personal
- **Opt-out**: Puedes desactivar analytics en la configuración

## Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Fork el repositorio
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## Licencia

Este proyecto está bajo la Licencia MIT.

## Disclaimer

Esta herramienta es para uso educativo y personal. No me hago responsable del uso indebido de esta aplicación.

## Créditos

- **Desarrollador**: YUMMAN
- **Inspiración**: Comunidad de Rivals

## Soporte

- **Discord**: https://discord.com/invite/EVWqd5swAt
- **Perfil de Roblox**: https://www.roblox.com/es/users/4018950771/profile
