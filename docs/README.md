# YUMMAN RIVALS - Roblox Texture Manager

Aplicación de escritorio para gestionar texturas y skyboxes personalizados en Roblox Rivals.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Electron](https://img.shields.io/badge/Electron-28.0.0-blue.svg)](https://www.electronjs.org/)
[![Platform](https://img.shields.io/badge/Platform-Windows-blue.svg)](https://www.microsoft.com/windows)

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

## Desarrollo

### Requisitos

- Node.js 18+
- npm o pnpm
- Windows 10/11 (para desarrollo)

### Configuración de Supabase

1. Crea una cuenta en [Supabase](https://supabase.com)
2. Crea un nuevo proyecto
3. Copia las credenciales (URL y API Key)
4. Crea un archivo `.env.local`:

```env
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu-api-key-publica
```

5. Ejecuta el script SQL para crear las tablas (ver `docs/database-schema.sql`)

### Recursos

Los recursos (skyboxes, texturas) **NO están incluidos** en el repositorio por su tamaño (170 MB).

Para desarrollo:
1. Descarga los recursos desde [Releases](https://github.com/mmgb5656/yumman-rivals/releases)
2. Extrae en la carpeta `resources/`

## Cómo Funciona

### Método Tradicional (Antiguo)
```
Copia archivos .tex → C:\Users\[USER]\AppData\Local\Roblox\Versions\[VERSION]\PlatformContent\pc\textures\sky\
```

### Método rbx-storage (Nuevo - Recomendado)
```
Copia archivos hash → C:\Users\[USER]\AppData\Local\Roblox\rbx-storage\
```

El método rbx-storage es:
- Más rápido
- No requiere permisos de administrador
- Funciona en todas las versiones de Roblox
- Menos propenso a ser bloqueado por antivirus

## Contribuir

Las contribuciones son bienvenidas! Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

## Disclaimer

Este proyecto es una herramienta de personalización para Roblox y **NO está afiliado con Roblox Corporation**.

El uso de texturas personalizadas puede estar sujeto a los Términos de Servicio de Roblox. Úsalo bajo tu propio riesgo.

## Créditos

- **Skyboxes**: Colección de la comunidad
- **Ruptic Dark**: Texturas negras originales
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/)
- **Icons**: [Lucide Icons](https://lucide.dev/)

## Soporte

- **Reportar bugs**: [Issues](https://github.com/mmgb5656/yumman-rivals/issues)
- **Discusiones**: [Discussions](https://github.com/mmgb5656/yumman-rivals/discussions)
- **Donar**: [Ko-fi](https://ko-fi.com/yumman)

---

Hecho con ❤️ por YUMMAN
