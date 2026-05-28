@echo off
setlocal

set "rbx_storage=%LOCALAPPDATA%\Roblox\rbx-storage"
set "assets=%~dp0assets"

if not exist "%assets%" (
    exit /b 1
)

mkdir "%rbx_storage%\a5" 2>nul
mkdir "%rbx_storage%\73" 2>nul
mkdir "%rbx_storage%\6c" 2>nul
mkdir "%rbx_storage%\92" 2>nul
mkdir "%rbx_storage%\78" 2>nul

attrib -R "%rbx_storage%\a5\a564ec8aeef3614e788d02f0090089d8" 2>nul
copy /Y "%assets%\a564ec8aeef3614e788d02f0090089d8" "%rbx_storage%\a5\" >nul 2>&1
attrib +R "%rbx_storage%\a5\a564ec8aeef3614e788d02f0090089d8" 2>nul

attrib -R "%rbx_storage%\73\7328622d2d509b95dd4dd2c721d1ca8b" 2>nul
copy /Y "%assets%\7328622d2d509b95dd4dd2c721d1ca8b" "%rbx_storage%\73\" >nul 2>&1
attrib +R "%rbx_storage%\73\7328622d2d509b95dd4dd2c721d1ca8b" 2>nul

attrib -R "%rbx_storage%\a5\a50f6563c50ca4d5dcb255ee5cfab097" 2>nul
copy /Y "%assets%\a50f6563c50ca4d5dcb255ee5cfab097" "%rbx_storage%\a5\" >nul 2>&1
attrib +R "%rbx_storage%\a5\a50f6563c50ca4d5dcb255ee5cfab097" 2>nul

attrib -R "%rbx_storage%\6c\6c94b9385e52d221f0538aadaceead2d" 2>nul
copy /Y "%assets%\6c94b9385e52d221f0538aadaceead2d" "%rbx_storage%\6c\" >nul 2>&1
attrib +R "%rbx_storage%\6c\6c94b9385e52d221f0538aadaceead2d" 2>nul

attrib -R "%rbx_storage%\92\9244e00ff9fd6cee0bb40a262bb35d31" 2>nul
copy /Y "%assets%\9244e00ff9fd6cee0bb40a262bb35d31" "%rbx_storage%\92\" >nul 2>&1
attrib +R "%rbx_storage%\92\9244e00ff9fd6cee0bb40a262bb35d31" 2>nul

attrib -R "%rbx_storage%\78\78cb2e93aee0cdbd79b15a866bc93a54" 2>nul
copy /Y "%assets%\78cb2e93aee0cdbd79b15a866bc93a54" "%rbx_storage%\78\" >nul 2>&1
attrib +R "%rbx_storage%\78\78cb2e93aee0cdbd79b15a866bc93a54" 2>nul

exit /b 0
