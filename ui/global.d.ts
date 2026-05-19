export {}

type ElectronApiFn = (...args: any[]) => any

interface ElectronAPI {
  getAppVersion: () => Promise<string>
  checkForUpdates: ElectronApiFn
  checkAndUpdateResources: ElectronApiFn
  forceDownloadResources: ElectronApiFn
  resizeWindow: ElectronApiFn
  openExternal: ElectronApiFn
  launchRoblox: ElectronApiFn

  getDefaultPaths: ElectronApiFn
  verifyRobloxPath: ElectronApiFn
  detectExecutors: ElectronApiFn
  getExecutorTexturePath: ElectronApiFn

  applySkyboxByName: ElectronApiFn
  applyBlackTextures: ElectronApiFn
  restoreOriginal: ElectronApiFn
  selectSkyImage: ElectronApiFn
  applyCustomSky: ElectronApiFn

  getAvailableFonts: ElectronApiFn
  applyFontPack: ElectronApiFn
  restoreFonts: ElectronApiFn
  importFont: ElectronApiFn

  selectAndConvertSky: ElectronApiFn
  applyConvertedSky: ElectronApiFn

  getFlags: ElectronApiFn
  saveFlags: ElectronApiFn
  clearFlags: ElectronApiFn
  getPotatoFlags: ElectronApiFn
  applyPotatoTextures: ElectronApiFn

  saveAppConfig: ElectronApiFn
  loadAppConfig: ElectronApiFn

  onUpdateStatus: ElectronApiFn
  onDownloadProgress: ElectronApiFn
  checkResources: ElectronApiFn
  redownloadResources: ElectronApiFn

  [key: string]: any
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}
