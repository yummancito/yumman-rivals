# YUMMAN RIVALS

**Launcher personalizado para Roblox Rivals con skyboxes, texturas y fuentes personalizadas**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE.txt)
[![Platform](https://img.shields.io/badge/platform-Windows-lightgrey.svg)](https://www.microsoft.com/windows)
[![Version](https://img.shields.io/badge/version-2.0.1-green.svg)](package.json)

---

## Table of Contents

- [Description](#description)
- [Features](#features)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Development](#development)
- [Build](#build)
- [Contribution](#contribution)
- [License](#license)

---

## Description

YUMMAN RIVALS is a custom launcher for the Roblox Rivals game that allows users to personalize their experience with custom skyboxes, dark textures, custom fonts, and more. The application is built with Electron, Next.js, and a Node.js backend with Supabase.

---

## Features

### Custom Skyboxes
- Over 20 unique skyboxes available
- One-click instant application
- Support for user custom skyboxes
- Real-time preview

### Dark Textures
- Potato mode for better performance
- Dark textures for visual fatigue reduction
- Easy restoration of original textures

### Custom Fonts
- Multiple Minecraft fonts available
- Automatic application to Roblox
- One-click restoration

### Flags and Settings
- Potato Mode
- Low Latency
- Dark Textures
- Potato Textures

### Profile System
- Roblox API integration
- Usage statistics
- Avatar and username display
- Cloud-based preset system

---

## Project Structure

```
yumman-rivals-app-only/
├── 📁 src/                          # Código fuente de Electron
│   ├── main.js                      # Proceso principal de Electron
│   ├── preload.js                   # Script de preload
│   ├── resourceDownloader.js        # Gestor de descarga de recursos
│   ├── atmosphereManager.js         # Gestor de atmósfera
│   └── main/                        # Módulos principales
│       ├── app-manager.js           # Gestor de la aplicación
│       ├── config-manager.js        # Gestor de configuración
│       ├── cache-service.js         # Servicio de caché
│       └── update-manager.js        # Gestor de actualizaciones
├── 📁 ui-source/                    # Interfaz de usuario (Next.js)
│   ├── app/                         # Páginas de Next.js
│   │   ├── page.tsx                # Página principal
│   │   ├── layout.tsx              # Layout principal
│   │   └── globals.css             # Estilos globales
│   ├── components/                  # Componentes React
│   │   ├── texture-manager/        # Gestor de texturas
│   │   │   ├── home.tsx           # Vista principal
│   │   │   ├── settings-view.tsx  # Vista de configuración
│   │   │   ├── profile-section.tsx # Sección de perfil
│   │   │   └── onboarding.tsx     # Onboarding
│   │   └── ui/                     # Componentes UI reutilizables
│   ├── lib/                        # Utilidades
│   │   ├── electron-api.ts        # API de Electron
│   │   ├── skyboxes.ts            # Utilidades de skyboxes
│   │   └── utils.ts               # Utilidades generales
│   └── components.json             # Configuración de shadcn/ui
├── 📁 backend/                      # Backend API
│   ├── server.js                    # Servidor Express
│   ├── package.json                 # Dependencias del backend
│   └── supabase-schema.sql         # Esquema de Supabase
├── 📁 resources/                    # Recursos de la aplicación
│   ├── fonts/                       # Fuentes personalizadas
│   ├── skyboxes/                    # Skyboxes
│   ├── textures/                    # Texturas
│   ├── move-silent.bat              # Script de movimiento
│   ├── RobloxPlayerInstaller.exe    # Instalador de Roblox
│   └── potatomode.json              # Configuración potato mode
├── 📁 build/                        # Scripts de build
│   └── installer-script.nsh         # Script NSIS personalizado
├── 📁 DOCUMENTACION/                # Documentación
│   ├── README.md                    # Índice de documentación
│   ├── PRODUCCION.md                # Guía de producción
│   ├── TEXTURAS.md                  # Documentación de texturas
│   ├── SKYBOXES.md                  # Documentación de skyboxes
│   ├── FUENTES.md                   # Documentación de fuentes
│   ├── FLAGS.md                     # Documentación de flags
│   └── ATMOSFERA.md                 # Documentación de atmósfera
├── 📁 images/                       # Imágenes para el README
├── 📄 package.json                  # Dependencias del proyecto
├── 📄 LICENSE.txt                   # Licencia MIT
├── 📄 .gitignore                    # Archivos ignorados por Git
└── 📄 README.md                     # Este archivo
```

---

## 🚀 Instalación

### Requisitos Previos
- Windows 10 o superior
- Node.js 18.x o superior
- npm o yarn

### Instalación desde Fuente

1. **Clonar el repositorio**
```bash
git clone https://github.com/tu-usuario/yumman-rivals.git
cd yumman-rivals
```

2. **Instalar dependencias**
```bash
npm install
cd ui-source
npm install
cd ..
```

3. onfigulrtrovariables de entorno**
```bash
# Copiar el archivo de ejemplo
cp backend/.env.example backend/.env

# Editar con tus credenciales
# backend/.env
```

4. **Iniciar el backend**
```bash
cd backend
npm install
npm start
```

5. **Iniciar la aplicación en modo desarrollo**
```bash
npm run dev
```

### Instalación desde Binarios

Descarga el instalador desde la sección de [Releases](https://github.com/tu-usuario/yumman-rivals/releases) y ejecuta `YUMMAN RIVALS-Setup-2.0.1.exe`.

---

## ⚙️ Configuración

### Variables de Entorno

Crea un archivo `backend/.env` con las siguientes variables:

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# Server Configuration
PORT=3000
NODE_ENV=production
ADMIN_TOKEN=your_admin_token_here
BACKEND_URL=http://localhost:3000

# Cloudflare R2 Configuration
R2_ACCOUNT_ID=your_r2_account_id_here
R2_ACCESS_KEY_ID=your_r2_access_key_id_here
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key_here
R2_BUCKET_NAME=your_r2_bucket_name_here
R2_POINT=yout_o2_endpoint_here
R2_PUBLIC_URL=your_r2_public_url_here
```

### Configuración de Supabase

1. Crea un proyecto en [Supabase](https://supabase.com)
2. Ejecuta el script SQL en `backend/supabase-schema.sql`
3. Copia las credenciales a tu archivo `.env`

---

## 🔧 Uso

### Primer Inicio

1. Abre la aplicación
2. Ingresa tu usuario de Roblox en el perfil
3. La aplicación validará tu usuario con la API de Roblox
4. Selecciona tu skybox preferido
5. Aplica texturas y fuentes si lo deseas
6. ¡Lanza Rivals y disfruta!

### Aplicar Skybox

1. Ve a la sección de Skyboxes
2. Selecciona el skybox deseado
3. Haz clic en "Aplicar"
4. El skybox se aplicará instantáneamente

### Aplicar Texturas

1. Ve a la sección de Texturas
2. Activa "Texturas Oscuras" o "Modo Potato"
3. Haz clic en "Aplicar"
4.  tagexturas se aplicarán a tu instalación de Roblox

### Cambiar Fuente

1. Ve a la sección de Fuentes
2. Selecciona la fuente deseada
3. Haz clic en "Aplicar"
4. La fuente se aplicará a Roblox

---

## 🛠️ Desarrollo

### Scripts Disponibles

```bash
# Iniciar en modo desarrollo
npm run dev

# Compilar UI
npm run build:ui

# Compilar aplicación completa
npm run build

# Iniciar backend
cd backend
npm start

# Generar manifest de recursos
node scripts/generate-manifest.js
```

### Estructura del Código

- **Electron Main Process** (`src/main.js`): Gestiona ventanas, IPC y lógica de la aplicación
- **Preload Script** (`src/preload.js`): Expone APIs seguras al renderer
- **Next.js UI** (`ui-source/`): Interfaz de usuario con React y TypeScript
- **Backend API** (`backend/`): API REST con Express y Supabase

---

## 📦 Build

### Build para Producción

```bash
npm run build
```

Esto generará:
- `dist/YUMMAN RIVALS-Setup-2.0.1.exe` - Instalador NSIS
- `dist/YUMMAN RIVALS-Portable-2.0.1.exe` - Versión portable

### Configuración de Build

La configuración de build está en `package.json`:

```json
{
  "build": {
    "appId": "com.yumman.rivals",
    "productName": "YUMMAN RIVALS",
    "win": {
      "target": ["nsis", "portable"]
    }
  }
}
```

---

## 🤝 Contribución

Las contribuciones son bienvenidas. Por favor:

1. Fork el repositorio
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

### Código de Conducta

Por favor sé respetuoso con otros contribuidores. No toleramos el acoso ni el comportamiento irrespetuoso.

---

## 📄 Licencia

Este proyecto está licenciado bajo la Licencia MIT - ver el archivo [LICENSE.txt](LICENSE.txt) para detalles.

---

## Acknowledgments

- [Electron](https://www.electronjs.org/) - Framework para aplicaciones de escritorio
- [Next.js](https://nextjs.org/) - Framework React
- [Supabase](https://supabase.com/) - Backend as a Service
- [Cloudflare R2](https://www.cloudflare.com/products/r2/) - Almacenamiento de objetos
- [Roblox](https://www.roblox.com/) - Plataforma de juegos

---

## 📞 Soporte

Si encuentras algún bug o necesitas ayuda:

- Abre un [issue](https://github.com/tu-usuario/yumman-rivals/issues)
- Contacta al equipo de desarrollo
- Visita nuestra [documentación](DOCUMENTACION/)

---

<div align="center">

**Created by YUMMAN**

[Back to top](#yumman-rivals)

</div>
