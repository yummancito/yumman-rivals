; Custom NSIS installer script for YUMMAN RIVALS
; This file is used by electron-builder for custom installer behavior

; Sección de desinstalación personalizada
Section uninstall
  ; Eliminar carpeta de userData de la app recursivamente
  RMDir /r "$APPDATA\yumman-rivals"
  
  ; Eliminar carpeta de YUMMAN RIVALS en LocalAppData recursivamente
  RMDir /r "$LOCALAPPDATA\YUMMAN RIVALS"
  
  ; Eliminar carpeta de recursos backup recursivamente
  RMDir /r "$APPDATA\yumman-rivals-resources-backup"
SectionEnd
