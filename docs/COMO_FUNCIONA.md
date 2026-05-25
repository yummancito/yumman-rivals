# CÓMO FUNCIONAN LAS TEXTURAS DE ROBLOX

## Estructura de Archivos

### Roblox guarda las texturas en 2 lugares:

#### 1. Texturas de Materiales (Grass, Wood, Metal, etc.)
```
C:\Program Files (x86)\Roblox\Versions\version-XXXXX\content\textures\
├── grass/
│   ├── diffuse.dds       (Color/textura)
│   ├── normal.dds        (Relieve/profundidad)
│   └── normaldetail.dds  (Detalles finos)
├── wood/
├── metal/
├── concrete/
└── ... (20+ materiales)
```

#### 2. Skybox (Cielo) - Método Antiguo
```
C:\Program Files (x86)\Roblox\Versions\version-XXXXX\content\textures\sky\
├── sky512_ft.tex  (Front - Frente)
├── sky512_bk.tex  (Back - Atrás)
├── sky512_lf.tex  (Left - Izquierda)
├── sky512_rt.tex  (Right - Derecha)
├── sky512_up.tex  (Up - Arriba)
└── sky512_dn.tex  (Down - Abajo)
```

#### 3. Skybox (Cielo) - Método Nuevo (rbx-storage)
```
%LOCALAPPDATA%\Roblox\rbx-storage\
├── a5/
│   ├── a564ec8aeef3614e788d02f0090089d8  (Archivo de cielo)
│   └── a50f6563c50ca4d5dcb255ee5cfab097  (Archivo de cielo)
├── 73/
│   └── 7328622d2d509b95dd4dd2c721d1ca8b
├── 6c/
│   └── 6c94b9385e52d221f0538aadaceead2d
├── 92/
│   └── 9244e00ff9fd6cee0bb40a262bb35d31
└── 78/
    └── 78cb2e93aee0cdbd79b15a866bc93a54
```

---

## Cómo Funciona el Cambio de Texturas

### Método 1: Texturas de Materiales (Ruptic Dark)

**Qué hace:**
Reemplaza los archivos `.dds` de cada material con versiones oscuras.

**Proceso:**
1. Encuentra la carpeta de Roblox
2. Va a `content/textures/`
3. Copia los archivos de `Ruptic Dark/Ruptic Dark/` a cada carpeta de material
4. Roblox carga las nuevas texturas automáticamente

**Ejemplo:**
```javascript
// Copiar texturas oscuras de grass
fs.copy(
  'Ruptic Dark/Ruptic Dark/grass/',
  'C:/Program Files (x86)/Roblox/.../textures/grass/',
  { overwrite: true }
);
```

**Archivos que se reemplazan:**
- `diffuse.dds` - Color principal
- `normal.dds` - Mapa de normales (relieve)
- `normaldetail.dds` - Detalles finos

---

### Método 2: Skybox - Método Antiguo (Ruptic Dark)

**Qué hace:**
Reemplaza los 6 archivos `.tex` del cielo.

**Proceso:**
1. Va a `content/textures/sky/`
2. Copia los 6 archivos `.tex` del preset
3. Roblox carga el nuevo cielo

**Los 6 archivos del skybox:**
```
sky512_ft.tex  →  Frente (lo que ves adelante)
sky512_bk.tex  →  Atrás (lo que ves atrás)
sky512_lf.tex  →  Izquierda
sky512_rt.tex  →  Derecha
sky512_up.tex  →  Arriba (el cielo)
sky512_dn.tex  →  Abajo (el suelo/horizonte)
```

**Ejemplo:**
```javascript
fs.copy(
  'Ruptic Dark/Ruptic Dark/sky/',
  'C:/Program Files (x86)/Roblox/.../textures/sky/',
  { overwrite: true }
);
```

---

### Método 3: Skybox - Método Nuevo (move.bat)

**Qué hace:**
Usa el sistema de caché de Roblox (`rbx-storage`) para cambiar el cielo.

**Por qué este método:**
- Más rápido
- No requiere permisos de administrador
- Funciona incluso si Roblox está abierto
- Roblox lo carga automáticamente

**Proceso del move.bat:**
```batch
1. Define la ruta: %LOCALAPPDATA%\Roblox\rbx-storage
2. Crea carpetas: a5, 73, 6c, 92, 78
3. Copia archivos con nombres hash específicos
4. Marca archivos como "solo lectura" (attrib +R)
```

**Ejemplo:**
```batch
copy /Y "assets\a564ec8aeef3614e788d02f0090089d8" "%rbx_storage%\a5\"
attrib +R "%rbx_storage%\a5\a564ec8aeef3614e788d02f0090089d8"
```

**¿Qué son esos nombres raros?**
Son **hashes MD5** que Roblox usa para identificar assets:
- `a564ec8aeef3614e788d02f0090089d8` = Archivo de cielo específico
- `7328622d2d509b95dd4dd2c721d1ca8b` = Otro archivo de cielo
- etc.

**¿Por qué "attrib +R" (solo lectura)?**
Para que Roblox no sobrescriba los archivos cuando se actualice.

---

## Cómo Funciona el Cielo Personalizado

### Proceso de Conversión:

**1. Usuario sube imagen (ejemplo: `mi_cielo.jpg`)**

**2. La app convierte la imagen a 6 archivos:**
```javascript
// skyConverter.js hace esto:
const image = await Jimp.read('mi_cielo.jpg');

// Crear 6 versiones:
- sky512_ft.tex  (imagen original)
- sky512_bk.tex  (imagen volteada)
- sky512_lf.tex  (imagen rotada 90°)
- sky512_rt.tex  (imagen rotada 270°)
- sky512_up.tex  (imagen más brillante)
- sky512_dn.tex  (imagen más oscura)
```

**3. Guarda los 6 archivos en carpeta temporal**

**4. Copia los archivos a Roblox:**
```javascript
fs.copy(
  'temp/custom_skybox/',
  'C:/Program Files (x86)/Roblox/.../textures/sky/',
  { overwrite: true }
);
```

**5. Roblox carga el nuevo cielo automáticamente**

---

## Comparación de Métodos

| Método | Ubicación | Ventajas | Desventajas |
|--------|-----------|----------|-------------|
| **Texturas** | `content/textures/` | Fácil, directo | Requiere permisos |
| **Skybox Antiguo** | `content/textures/sky/` | Simple, 6 archivos | Requiere permisos |
| **rbx-storage** | `%LOCALAPPDATA%\Roblox\rbx-storage` | Rápido, sin permisos | Nombres hash complejos |

---

## Implementación en YUMMAN RIVALS

### Función: Aplicar Texturas Oscuras
```javascript
async function applyBlackTextures(texturePath) {
  const materials = ['grass', 'wood', 'metal', 'concrete', ...];
  
  for (const material of materials) {
    const source = `Ruptic Dark/Ruptic Dark/${material}/`;
    const dest = `${texturePath}/${material}/`;
    
    await fs.copy(source, dest, { overwrite: true });
  }
}
```

### Función: Aplicar Cielo Oscuro
```javascript
async function applyDarkSky(texturePath) {
  const source = 'Ruptic Dark/Ruptic Dark/sky/';
  const dest = `${texturePath}/sky/`;
  
  await fs.copy(source, dest, { overwrite: true });
}
```

### Función: Aplicar Cielo Personalizado
```javascript
async function applyCustomSky(imagePath, texturePath) {
  // 1. Convertir imagen a 6 archivos
  const skyboxFiles = await convertImageToSkybox(imagePath);
  
  // 2. Copiar a Roblox
  const dest = `${texturePath}/sky/`;
  await fs.copy(skyboxFiles, dest, { overwrite: true });
}
```

### Función: Restaurar Original
```javascript
async function restoreOriginal(texturePath) {
  const backupPath = 'backup/';
  
  // Restaurar desde backup
  await fs.copy(backupPath, texturePath, { overwrite: true });
}
```

---

## Presets Disponibles

### Ruptic Dark
- **Ubicación**: `Ruptic Dark/Ruptic Dark/`
- **Contiene**: 
  - 20+ materiales oscuros
  - Skybox oscuro (6 archivos)
  - Archivos especiales (brdfLUT, studs, wangIndex)
- **Efecto**: Todo se vuelve oscuro y con estilo gaming

### Skyboxfix - ALL SKYBOXES
- **Ubicación**: `skyboxfix/ALL SKYBOXES/ALL SKYBOXES/`
- **Contiene**: 25+ skyboxes diferentes
- **Tipos**:
  - Aurora (cielo con aurora boreal)
  - Night (noche estrellada)
  - Neon (cielo neón)
  - Space Blue (espacio azul)
  - Pink Sunrise (amanecer rosa)
  - etc.

### Skyboxfix - move.bat
- **Ubicación**: `skyboxfix/skyboxfix/`
- **Contiene**: 6 archivos hash para rbx-storage
- **Efecto**: Cambia el cielo usando el método de caché

---

## Seguridad

### ¿Es seguro modificar estos archivos?

**SÍ, es seguro porque:**
1. Solo modificas archivos locales (tu PC)
2. No modificas el cliente de Roblox (el .exe)
3. No inyectas código
4. Roblox permite personalización local
5. Puedes restaurar los originales en cualquier momento

### ¿Puede causar ban?

**NO, porque:**
1. Solo cambias texturas visuales
2. No das ventajas competitivas
3. No modificas el gameplay
4. Es similar a usar un resource pack en Minecraft
5. Solo tú ves los cambios (otros jugadores ven normal)

### Backup Automático

La app crea backup antes de modificar:
```javascript
// Antes de cualquier cambio:
await fs.copy(texturePath, backupPath);
```

---

## Tips y Trucos

### 1. Cierra Roblox antes de aplicar texturas
- Roblox carga texturas al iniciar
- Si está abierto, no verás los cambios hasta reiniciar

### 2. Usa el método rbx-storage para cielos
- Más rápido
- No requiere permisos de administrador
- Funciona con Roblox abierto

### 3. Combina presets
- Usa texturas de Ruptic Dark
- Usa cielo de Skyboxfix
- Crea tu combinación única

### 4. Crea tus propios presets
- Copia la estructura de carpetas
- Reemplaza los archivos .dds y .tex
- Guarda en una carpeta nueva

---

## Mejoras Futuras

### 1. Soporte para rbx-storage
Implementar el método de move.bat en la app:
```javascript
async function applyRbxStorageSky(skyboxFiles) {
  const rbxStorage = path.join(
    process.env.LOCALAPPDATA,
    'Roblox',
    'rbx-storage'
  );
  
  // Copiar archivos con nombres hash
  // Marcar como solo lectura
}
```

### 2. Preview mejorado
- Mostrar vista 360° del skybox
- Preview de materiales antes de aplicar

### 3. Más presets
- Importar todos los skyboxes de ALL SKYBOXES
- Crear categorías (Noche, Día, Espacio, etc.)

### 4. Editor de texturas
- Ajustar brillo/contraste
- Aplicar filtros
- Mezclar texturas

---

## Resumen

### Texturas de Materiales:
- **Ubicación**: `content/textures/[material]/`
- **Archivos**: `diffuse.dds`, `normal.dds`, `normaldetail.dds`
- **Método**: Copiar y reemplazar

### Skybox (Método Antiguo):
- **Ubicación**: `content/textures/sky/`
- **Archivos**: 6 archivos `.tex` (ft, bk, lf, rt, up, dn)
- **Método**: Copiar y reemplazar

### Skybox (Método Nuevo):
- **Ubicación**: `%LOCALAPPDATA%\Roblox\rbx-storage\`
- **Archivos**: Archivos con nombres hash
- **Método**: Copiar con nombres específicos + solo lectura

### Cielo Personalizado:
- **Proceso**: Imagen → 6 archivos → Copiar a Roblox
- **Conversión**: Jimp transforma 1 imagen en 6 caras del cubo

---

¡Ahora entiendes cómo funciona todo!
