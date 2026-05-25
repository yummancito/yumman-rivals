# Contribuir a YUMMAN RIVALS

Gracias por tu interés en contribuir! Este documento te guiará en el proceso.

## Código de Conducta

- Sé respetuoso con otros contribuidores
- Acepta críticas constructivas
- Enfócate en lo mejor para el proyecto

## Cómo Contribuir

### Reportar Bugs

1. Verifica que el bug no haya sido reportado antes en [Issues](https://github.com/mmgb5656/yumman-rivals/issues)
2. Crea un nuevo issue con:
   - Título descriptivo
   - Pasos para reproducir
   - Comportamiento esperado vs actual
   - Screenshots (si aplica)
   - Versión de la app y sistema operativo

### Sugerir Features

1. Abre un issue con la etiqueta `enhancement`
2. Describe claramente:
   - El problema que resuelve
   - Cómo debería funcionar
   - Alternativas consideradas

### Pull Requests

1. **Fork** el repositorio
2. **Crea una rama** desde `main`:
   ```bash
   git checkout -b feature/mi-nueva-feature
   ```
3. **Haz tus cambios** siguiendo las guías de estilo
4. **Commit** con mensajes descriptivos:
   ```bash
   git commit -m "feat: agregar soporte para nuevos skyboxes"
   ```
5. **Push** a tu fork:
   ```bash
   git push origin feature/mi-nueva-feature
   ```
6. **Abre un Pull Request** en GitHub

## Guías de Estilo

### Commits

Usa [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` Nueva funcionalidad
- `fix:` Corrección de bug
- `docs:` Cambios en documentación
- `style:` Formato, punto y coma, etc.
- `refactor:` Refactorización de código
- `test:` Agregar tests
- `chore:` Mantenimiento

Ejemplos:
```
feat: agregar soporte para Bloxtrap
fix: corregir error al aplicar skybox en Windows 11
docs: actualizar README con instrucciones de instalación
```

### Código JavaScript

- Usa `const` y `let`, no `var`
- Nombres descriptivos en camelCase
- Comentarios para lógica compleja
- Async/await en lugar de callbacks

```javascript
// Bien
async function applySkybox(skyboxName) {
  const skyboxPath = path.join(SKYBOXES_PATH, skyboxName);
  
  if (!fs.existsSync(skyboxPath)) {
    throw new Error(`Skybox ${skyboxName} not found`);
  }
  
  // Aplicar usando rbx-storage
  return await rbxStorage.applySkybox(skyboxPath);
}

// Mal
function applySkybox(name, callback) {
  var p = path.join(SKYBOXES_PATH, name);
  fs.exists(p, function(exists) {
    if (!exists) callback(new Error('not found'));
    // ...
  });
}
```

### Código React/TypeScript

- Componentes funcionales con hooks
- Props tipadas con TypeScript
- Nombres de componentes en PascalCase

```typescript
// Bien
interface SkyboxCardProps {
  name: string;
  imageUrl: string;
  onApply: (name: string) => void;
}

export function SkyboxCard({ name, imageUrl, onApply }: SkyboxCardProps) {
  return (
    <Card onClick={() => onApply(name)}>
      <img src={imageUrl} alt={name} />
      <h3>{name}</h3>
    </Card>
  );
}
```

## Testing

Antes de hacer un PR:

1. **Prueba localmente**:
   ```bash
   npm start
   ```

2. **Verifica que compile**:
   ```bash
   npm run build
   ```

3. **Prueba el instalador**:
   ```bash
   npm run build:win
   ```

## Estructura de Archivos

```
yumman-rivals/
├── src/              # Proceso principal (Electron)
│   ├── main.js
│   ├── preload.js
│   └── *.js          # Módulos auxiliares
│
├── ui/               # UI (Next.js)
│   ├── app/          # Páginas
│   ├── components/   # Componentes React
│   └── lib/          # Utilidades
│
├── docs/             # Documentación
└── resources/        # Assets (no en repo)
```

## Agregar Nuevos Skyboxes

1. Crea una carpeta en `resources/skyboxes/all-skyboxes/ALL SKYBOXES/`
2. Incluye los 6 archivos `.tex`:
   - `sky512_bk.tex` (back)
   - `sky512_dn.tex` (down)
   - `sky512_ft.tex` (front)
   - `sky512_lf.tex` (left)
   - `sky512_rt.tex` (right)
   - `sky512_up.tex` (up)
3. Agrega un screenshot: `! SCREENSHOT.png`
4. Crea la carpeta `assets/` con archivos hash (ejecuta `CREAR-ASSETS-SKYBOXES.bat`)

## Debugging

### Logs de Electron

```javascript
// En main.js
console.log('Debug info:', data);

// Ver logs en:
// Windows: %APPDATA%\YUMMAN RIVALS\logs\
```

### DevTools

```javascript
// En main.js
mainWindow.webContents.openDevTools();
```

## Build y Release

Solo los maintainers pueden hacer releases:

1. Actualizar versión en `package.json`
2. Crear tag:
   ```bash
   git tag v1.1.0
   git push --tags
   ```
3. GitHub Actions automáticamente:
   - Compila la app
   - Crea release
   - Sube instaladores

## Preguntas

Si tienes dudas:
- Abre un [Discussion](https://github.com/mmgb5656/yumman-rivals/discussions)
- Pregunta en el issue relacionado
- Contacta a los maintainers

## Gracias

Cada contribución, por pequeña que sea, es valiosa. Gracias por hacer YUMMAN RIVALS mejor!
