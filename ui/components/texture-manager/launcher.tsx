
"use client"


import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowRight, Settings, Cloud, Moon, ChevronLeft,
  Play, Loader2, Check, Heart, HelpCircle,
  Zap, Type, Flag, Download, Image, RotateCcw,
  Plus, Trash2, AlertTriangle, Search, X
} from "lucide-react"
import { skyboxes } from "@/lib/skyboxes"
import { electronAPI } from "@/lib/electron-api"

type Lang = "es" | "en"
type Tab = "sky" | "textures" | "fonts" | "potato" | "flags"
type LaunchState = "idle" | "launching" | "done" | "error"

interface FontEntry { name: string; file: string }

const LOW_LATENCY_FLAGS: Record<string, string> = {
  // Solo flags confirmados en la allowlist oficial de Roblox (sept 2025)
  "DFIntCSGLevelOfDetailSwitchingDistance": "250",
  "DFIntCSGLevelOfDetailSwitchingDistanceL12": "500",
  "DFIntCSGLevelOfDetailSwitchingDistanceL23": "750",
  "DFIntCSGLevelOfDetailSwitchingDistanceL34": "1000",
  "DFFlagTextureQualityOverrideEnabled": "True",
  "DFIntTextureQualityOverride": "0",
  "DFIntDebugFRMQualityLevelOverride": "1",
  "FIntFRMMaxGrassDistance": "0",
  "FFlagDebugGraphicsPreferVulkan": "True",
  "DFFlagDebugPauseVoxelizer": "True",
}

const TR = {
  es: {
    launch: "Iniciar Roblox", launchSub: "Lanza el juego con tus ajustes",
    configure: "Configuración", configureSub: "Cielos, texturas, fuentes y flags",
    install: "Instalar / Actualizar Roblox",
    launching: "Iniciando...", launched: "¡Listo!", launchErr: "Error",
    installing: "Instalando...",
    back: "Atrás", config: "Configuración",
    sky: "Cielos", textures: "Texturas", fonts: "Fuentes", potato: "Potato", flags: "Fast Flags",
    selectSky: "Selecciona un cielo para aplicar",
    applySky: "Aplicar cielo", skyApplied: "Aplicado", applying: "Aplicando...",
    customSky: "Cielo personalizado", customSkyDesc: "Convierte una imagen en un cielo de Roblox",
    selectImg: "Seleccionar imagen", applyCustom: "Aplicar",
    darkTex: "Dark Textures", darkSub: "Texturas oscuras para mejor visibilidad en combate",
    potatoTex: "Potato Textures", potatoSub: "Studs planos — requiere calidad gráfica 2",
    on: "Activo", off: "Inactivo",
    fontsTitle: "Pack de Fuentes", fontsSub: "Cambia la fuente del juego",
    searchFont: "Buscar fuente...", noFonts: "No hay fuentes disponibles",
    applyFont: "Aplicar", fontApplied: "Aplicado", restoreFonts: "Restaurar fuentes originales",
    potatoMode: "Potato Mode", potatoModeSub: "Máximo rendimiento — aplica flags + texturas",
    potatoItems: ["~30 flags de rendimiento", "Texturas potato (studs planos)", "Cielo gris (sin nubes)", "Sin hierba ni sombras", "Requiere calidad gráfica 2"],
    enablePotato: "Activar Potato Mode", potatoOn: "Potato Mode activo",
    lowLatency: "Low Latency", lowLatencySub: "Reduce delay y latencia de red",
    flagsTitle: "Editor de Fast Flags",
    flagsWarning: "⚠ Advertencia — Modifica solo si sabes lo que haces. Flags incorrectos pueden romper Roblox.",
    flagName: "Nombre del flag", flagVal: "Valor",
    addFlag: "Agregar", save: "Guardar", saved: "Guardado", clearAll: "Limpiar todo",
    noFlags: "No hay flags configurados",
    discord: "Discord", about: "Acerca de",
  },
  en: {
    launch: "Launch Roblox", launchSub: "Start the game with your settings",
    configure: "Settings", configureSub: "Skies, textures, fonts and flags",
    install: "Install / Update Roblox",
    launching: "Launching...", launched: "Done!", launchErr: "Error",
    installing: "Installing...",
    back: "Back", config: "Settings",
    sky: "Skies", textures: "Textures", fonts: "Fonts", potato: "Potato", flags: "Fast Flags",
    selectSky: "Select a sky to apply",
    applySky: "Apply sky", skyApplied: "Applied", applying: "Applying...",
    customSky: "Custom sky", customSkyDesc: "Convert an image into a Roblox sky",
    selectImg: "Select image", applyCustom: "Apply",
    darkTex: "Dark Textures", darkSub: "Dark textures for better combat visibility",
    potatoTex: "Potato Textures", potatoSub: "Flat studs — requires graphics quality 2",
    on: "Active", off: "Inactive",
    fontsTitle: "Font Pack", fontsSub: "Change the game font",
    searchFont: "Search font...", noFonts: "No fonts available",
    applyFont: "Apply", fontApplied: "Applied", restoreFonts: "Restore original fonts",
    potatoMode: "Potato Mode", potatoModeSub: "Max performance — applies flags + textures",
    potatoItems: ["~30 performance flags", "Potato textures (flat studs)", "Gray sky (no clouds)", "No grass or shadows", "Requires graphics quality 2"],
    enablePotato: "Enable Potato Mode", potatoOn: "Potato Mode active",
    lowLatency: "Low Latency", lowLatencySub: "Reduces network delay and latency",
    flagsTitle: "Fast Flags Editor",
    flagsWarning: "⚠ Warning — Only modify if you know what you're doing. Wrong flags can break Roblox.",
    flagName: "Flag name", flagVal: "Value",
    addFlag: "Add", save: "Save", saved: "Saved", clearAll: "Clear all",
    noFlags: "No flags configured",
    discord: "Discord", about: "About",
  }
}

export function Launcher() {
  const [view, setView] = useState<"home" | "settings">("home")
  const [tab, setTab] = useState<Tab>("sky")
  const [lang, setLang] = useState<Lang>("es")
  const [texturePath, setTexturePath] = useState("")
  const [launchState, setLaunchState] = useState<LaunchState>("idle")
  const [isInstalling, setIsInstalling] = useState(false)
  const [appVersion, setAppVersion] = useState("—")

  // Sky
  const [selectedSky, setSelectedSky] = useState<string | null>(null)
  const [skyApplied, setSkyApplied] = useState(false)
  const [applyingSky, setApplyingSky] = useState(false)
  const [customReady, setCustomReady] = useState(false)
  const [convertingSky, setConvertingSky] = useState(false)
  const [applyingCustom, setApplyingCustom] = useState(false)

  // Textures
  const [darkOn, setDarkOn] = useState(false)
  const [potatoTexOn, setPotatoTexOn] = useState(false)
  const [applyingTex, setApplyingTex] = useState(false)

  // Fonts
  const [fonts, setFonts] = useState<FontEntry[]>([])
  const [fontSearch, setFontSearch] = useState("")
  const [activeFont, setActiveFont] = useState<string | null>(null)
  const [applyingFont, setApplyingFont] = useState<string | null>(null)
  const [fontApplied, setFontApplied] = useState<string | null>(null)

  // Potato
  const [potatoOn, setPotatoOn] = useState(false)
  const [applyingPotato, setApplyingPotato] = useState(false)
  const [lowLatOn, setLowLatOn] = useState(false)

  // Flags
  const [flags, setFlags] = useState<Record<string, string>>({})
  const [flagKey, setFlagKey] = useState("")
  const [flagVal, setFlagVal] = useState("")
  const [savingFlags, setSavingFlags] = useState(false)
  const [flagsSaved, setFlagsSaved] = useState(false)
  const [flagSearch, setFlagSearch] = useState("")

  const tr = TR[lang]
  const api = typeof window !== "undefined" ? window.electronAPI : null

  useEffect(() => {
    async function init() {
      const r = await electronAPI.getExecutorTexturePath("roblox")
      if (r.valid) setTexturePath(r.texturePath)
      if (!api) return
      const v = await electronAPI.getAppVersion()
      if (v) setAppVersion(v)
      const fr = await api.getAvailableFonts?.()
      if (fr?.success) {
        setFonts(fr.fonts || [])
        // Inject @font-face for each font so preview works
        if (fr.fontsDir && fr.fonts?.length) {
          const existing = document.getElementById('yumman-fonts')
          if (!existing) {
            const style = document.createElement('style')
            style.id = 'yumman-fonts'
            const faces = (fr.fonts as FontEntry[]).map((f: FontEntry) => {
              const url = `file:///${fr.fontsDir.replace(/\\/g, '/')}/${f.file}`
              return `@font-face { font-family: "${f.name}"; src: url("${url}"); font-display: swap; }`
            }).join('\n')
            style.textContent = faces
            document.head.appendChild(style)
          }
        }
      }
      const flr = await api.getFlags?.()
      if (flr?.success) setFlags(flr.flags || {})
    }
    init()
  }, [])

  const ext = (url: string) => window.open(url, "_blank", "noopener,noreferrer")

  const goSettings = () => { api?.resizeWindow?.("settings"); setView("settings") }
  const goHome = () => { api?.resizeWindow?.("home"); setView("home") }

  // Launch
  const handleLaunch = async () => {
    if (launchState !== "idle") return
    setLaunchState("launching")
    try {
      const r = await api?.launchRoblox?.("roblox")
      setLaunchState(r?.success ? "done" : "error")
      setTimeout(() => setLaunchState("idle"), 3000)
    } catch { setLaunchState("error"); setTimeout(() => setLaunchState("idle"), 3000) }
  }

  const handleInstall = async () => {
    if (isInstalling) return
    setIsInstalling(true)
    try {
      await api?.installRoblox?.()
    } catch {
      // ignorar — el instalador se lanza en background
    } finally {
      setTimeout(() => setIsInstalling(false), 4000)
    }
  }

  // Sky
  const handleApplySky = async () => {
    if (!selectedSky || applyingSky) return
    setApplyingSky(true); setSkyApplied(false)
    try {
      const r = await electronAPI.applySky(selectedSky, texturePath)
      if (r?.success) { setSkyApplied(true); setTimeout(() => setSkyApplied(false), 2500) }
    } finally { setTimeout(() => setApplyingSky(false), 200) }
  }

  const handleConvert = async () => {
    setConvertingSky(true)
    try { const r = await api?.selectAndConvertSky?.(); if (r?.success) setCustomReady(true) }
    finally { setConvertingSky(false) }
  }

  const handleApplyCustom = async () => {
    setApplyingCustom(true)
    try { await api?.applyConvertedSky?.(texturePath) }
    finally { setApplyingCustom(false) }
  }

  // Textures
  const handleDark = async () => {
    setApplyingTex(true)
    try {
      const r = await electronAPI.applyDarkTextures(!darkOn, texturePath)
      if (r?.success) {
        const next = !darkOn
        setDarkOn(next)
        if (next) setPotatoTexOn(false)
      }
    } finally { setApplyingTex(false) }
  }

  const handlePotatoTex = async () => {
    setApplyingTex(true)
    try {
      const r = await api?.applyPotatoTextures?.(texturePath)
      if (r?.success) {
        setPotatoTexOn(true)
        setDarkOn(false)
      }
    } finally { setApplyingTex(false) }
  }

  // Fonts
  const handleApplyFont = async (f: FontEntry) => {
    setApplyingFont(f.file); setFontApplied(null)
    try {
      const r = await api?.applyFontPack?.(f.file)
      if (r?.success) { setActiveFont(f.file); setFontApplied(f.file); setTimeout(() => setFontApplied(null), 2500) }
    } finally { setApplyingFont(null) }
  }

  const handleRestoreFonts = async () => { await api?.restoreFonts?.(); setActiveFont(null) }

  // Potato
  const handlePotato = async () => {
    setApplyingPotato(true)
    try {
      const fr = await api?.getPotatoFlags?.()
      if (fr?.success) { await api?.saveFlags?.(fr.flags); setFlags(fr.flags) }
      await api?.applyPotatoTextures?.(texturePath)
      setPotatoOn(true)
    } finally { setApplyingPotato(false) }
  }

  const handleLowLat = async () => {
    const next = !lowLatOn
    const newFlags = next ? { ...flags, ...LOW_LATENCY_FLAGS } : Object.fromEntries(Object.entries(flags).filter(([k]) => !LOW_LATENCY_FLAGS[k]))
    setFlags(newFlags); setLowLatOn(next)
    await api?.saveFlags?.(newFlags)
  }

  // Flags
  const addFlag = () => {
    if (!flagKey.trim()) return
    setFlags(p => ({ ...p, [flagKey.trim()]: flagVal.trim() }))
    setFlagKey(""); setFlagVal("")
  }

  const removeFlag = (k: string) => setFlags(p => { const n = { ...p }; delete n[k]; return n })

  const saveFlags = async () => {
    setSavingFlags(true); setFlagsSaved(false)
    try { await api?.saveFlags?.(flags); setFlagsSaved(true); setTimeout(() => setFlagsSaved(false), 2500) }
    finally { setSavingFlags(false) }
  }

  const clearFlags = async () => { await api?.clearFlags?.(); setFlags({}); setPotatoOn(false); setLowLatOn(false) }

  const filteredFonts = fonts.filter(f => f.name.toLowerCase().includes(fontSearch.toLowerCase()))
  const filteredFlags = Object.entries(flags).filter(([k]) => k.toLowerCase().includes(flagSearch.toLowerCase()))

  // ── Tab content ──────────────────────────────────────────────────────────────
  const tabContent: Record<Tab, React.ReactNode> = {
    sky: (
      <div className="flex flex-col gap-3 h-full">
        <p className="text-[11px] text-[#888580] uppercase tracking-widest font-medium">{tr.selectSky}</p>
        <div className="flex-1 overflow-y-auto pr-1 min-h-0">
          <div className="grid grid-cols-3 gap-2">
            {skyboxes.map(s => (
              <button key={s.id} onClick={() => setSelectedSky(s.id)}
                className={`relative overflow-hidden rounded-lg border transition-all duration-150 hover:scale-[1.02] ${selectedSky === s.id ? "border-[#E6E6E6] ring-1 ring-[#E6E6E6]/20" : "border-[#2E2C28] hover:border-[#3A3835]"}`}
                style={{ aspectRatio: "4/3" }}>
                <img src={s.image} alt={s.nameEn} className="h-full w-full object-cover" crossOrigin="anonymous" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-1.5 py-1">
                  <p className="text-center text-[10px] font-medium text-white/90">{lang === "es" ? s.name : s.nameEn}</p>
                </div>
                {selectedSky === s.id && (
                  <div className="absolute top-1.5 right-1.5 rounded-full bg-white p-0.5">
                    <Check className="h-2.5 w-2.5 text-black" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
        <button onClick={handleApplySky} disabled={!selectedSky || applyingSky}
          className="flex items-center justify-center gap-2 rounded-lg bg-[#E6E6E6] py-2.5 text-sm font-semibold text-[#1D1B17] transition-all hover:bg-[#CFCFCF] disabled:opacity-30 disabled:cursor-not-allowed">
          {applyingSky ? <Loader2 className="h-4 w-4 animate-spin text-black" /> : skyApplied ? <Check className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {applyingSky ? tr.applying : skyApplied ? tr.skyApplied : tr.applySky}
        </button>
        <div className="border-t border-[#2E2C28] pt-3">
          <p className="text-xs font-semibold text-[#AEAEAE] mb-0.5">{tr.customSky}</p>
          <p className="text-[10px] text-[#444240]">💡 Panorámica 360° (2:1) = 6 caras reales. Cualquier imagen = aplicada en todas las caras.</p>
          <div className="flex gap-2">
            <button onClick={handleConvert} disabled={convertingSky}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-[#3A3835] py-2 text-xs text-[#BBBBBB] hover:border-zinc-500 hover:text-[#AEAEAE] transition-all disabled:opacity-40">
              {convertingSky ? <Loader2 className="h-3 w-3 animate-spin" /> : <Image className="h-3 w-3" />}
              {tr.selectImg}
            </button>
            <button onClick={handleApplyCustom} disabled={!customReady || applyingCustom}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-zinc-700 py-2 text-xs text-white hover:bg-zinc-600 transition-all disabled:opacity-40">
              {applyingCustom ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
              {tr.applyCustom}
            </button>
          </div>
        </div>
      </div>
    ),

    textures: (
      <div className="flex flex-col gap-3 h-full">
        {[
          { label: tr.darkTex, sub: tr.darkSub, on: darkOn, fn: handleDark, color: "violet" },
          { label: tr.potatoTex, sub: tr.potatoSub, on: potatoTexOn, fn: handlePotatoTex, color: "orange" },
        ].map(item => (
          <button key={item.label} onClick={item.fn} disabled={applyingTex}
            className={`flex items-center gap-4 rounded-xl border p-4 text-left transition-all hover:scale-[1.01] disabled:opacity-50 ${item.on ? "border-[#E6E6E6]/15 bg-[#E6E6E6]/5" : "border-[#2E2C28] hover:border-[#3A3835]"}`}>
            <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${item.on ? "bg-[#E6E6E6]/8" : "bg-[#252320]"}`}>
              <Moon className={`h-5 w-5 ${item.on ? "text-[#AEAEAE]" : "text-[#AEAEAE]"}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#AEAEAE]">{item.label}</p>
              <p className="text-xs text-[#888580] mt-0.5">{item.sub}</p>
            </div>
            <div className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${item.on ? "bg-[#E6E6E6]/8 text-white" : "bg-[#252320] text-[#888580]"}`}>
              {item.on ? tr.on : tr.off}
            </div>
          </button>
        ))}
      </div>
    ),

    fonts: (
      <div className="flex flex-col gap-3 h-full">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#888580]" />
          <input value={fontSearch} onChange={e => setFontSearch(e.target.value)}
            placeholder={tr.searchFont}
            className="w-full rounded-lg border border-[#2E2C28] bg-[#252320] pl-9 pr-3 py-2 text-xs text-[#AEAEAE] placeholder:text-[#666360] focus:outline-none focus:border-[#3A3835]" />
        </div>
        {filteredFonts.length === 0 ? (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-sm text-[#888580]">{tr.noFonts}</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto min-h-0 space-y-1 pr-1">
            {filteredFonts.map(f => (
              <div key={f.file}
                className={`flex items-center justify-between rounded-lg border px-3 py-2.5 transition-all ${activeFont === f.file ? "border-[#3A3835] bg-[#252320]" : "border-[#2E2C28] hover:border-[#3A3835]"}`}>
                <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                  <span className="text-[10px] text-[#666360]">{f.name}</span>
                  <span className="text-sm text-[#AEAEAE] truncate"
                    style={{ fontFamily: `"${f.name}", sans-serif` }}>
                    Probar fuente
                  </span>
                </div>
                <button onClick={() => handleApplyFont(f)} disabled={!!applyingFont}
                  className="ml-3 flex-shrink-0 rounded-md bg-[#252320] border border-[#2E2C28] px-2.5 py-1 text-[11px] font-medium text-[#AEAEAE] hover:bg-[#2A2825] hover:border-[#3A3835] disabled:opacity-40 transition-all">
                  {applyingFont === f.file ? <Loader2 className="h-3 w-3 animate-spin" /> : fontApplied === f.file ? <Check className="h-3 w-3 text-[#AEAEAE]" /> : tr.applyFont}
                </button>
              </div>
            ))}
          </div>
        )}
        <button onClick={handleRestoreFonts}
          className="flex items-center justify-center gap-2 rounded-lg border border-[#2E2C28] py-2 text-xs text-[#888580] hover:text-[#AEAEAE] hover:border-[#3A3835] transition-all">
          <RotateCcw className="h-3.5 w-3.5" />{tr.restoreFonts}
        </button>
      </div>
    ),    potato: (
      <div className="flex flex-col gap-3 h-full">
        <div className={`rounded-xl border p-4 transition-all ${potatoOn ? "border-[#FFB71E]/20 bg-[#FFB71E]/5" : "border-[#2E2C28]"}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${potatoOn ? "bg-[#FFB71E]/10" : "bg-[#252320]"}`}>
              <Zap className={`h-5 w-5 ${potatoOn ? "text-[#FFB71E]" : "text-[#AEAEAE]"}`} />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#AEAEAE]">{tr.potatoMode}</p>
              <p className="text-xs text-[#888580]">{tr.potatoModeSub}</p>
            </div>
          </div>
          <ul className="space-y-1 mb-4 ml-1">
            {tr.potatoItems.map((item, i) => (
              <li key={i} className="flex items-center gap-2 text-xs text-[#888580]">
                <span className="h-1 w-1 rounded-full bg-zinc-600 flex-shrink-0" />{item}
              </li>
            ))}
          </ul>
          <button onClick={handlePotato} disabled={applyingPotato || potatoOn}
            className={`w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all ${potatoOn ? "bg-[#FFB71E]/8 text-[#FFB71E] cursor-default" : "bg-[#E6E6E6] text-[#1D1B17] hover:bg-[#CFCFCF] disabled:opacity-50"}`}>
            {applyingPotato ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            {potatoOn ? tr.potatoOn : tr.enablePotato}
          </button>
        </div>
        <button onClick={handleLowLat}
          className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all hover:scale-[1.01] ${lowLatOn ? "border-[#3A3835] bg-[#252320]" : "border-[#2E2C28] hover:border-[#3A3835]"}`}>
          <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${lowLatOn ? "bg-[#252320]" : "bg-[#252320]"}`}>
            <Flag className={`h-5 w-5 ${lowLatOn ? "text-[#AEAEAE]" : "text-[#AEAEAE]"}`} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-[#AEAEAE]">{tr.lowLatency}</p>
            <p className="text-xs text-[#888580]">{tr.lowLatencySub}</p>
          </div>
          <div className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${lowLatOn ? "bg-[#252320] text-[#AEAEAE]" : "bg-[#252320] text-[#888580]"}`}>
            {lowLatOn ? tr.on : tr.off}
          </div>
        </button>
      </div>
    ),

    flags: (
      <div className="flex flex-col gap-3 h-full">
        {/* Warning banner */}
        <div className="flex items-start gap-2.5 rounded-lg border border-[#FFB71E]/20 bg-[#FFB71E]/5 px-3 py-2.5">
          <AlertTriangle className="h-4 w-4 text-[#FFB71E] flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-[#FFB71E]/80 leading-relaxed">{tr.flagsWarning}</p>
        </div>
        {/* Add row */}
        <div className="flex gap-2">
          <input value={flagKey} onChange={e => setFlagKey(e.target.value)}
            placeholder={tr.flagName}
            className="flex-1 rounded-lg border border-[#2E2C28] bg-[#252320] px-3 py-2 text-xs text-white placeholder:text-[#666360] focus:outline-none focus:border-[#3A3835] font-mono"
            onKeyDown={e => e.key === "Enter" && addFlag()} />
          <input value={flagVal} onChange={e => setFlagVal(e.target.value)}
            placeholder={tr.flagVal}
            className="w-20 rounded-lg border border-[#2E2C28] bg-[#252320] px-3 py-2 text-xs text-white placeholder:text-[#666360] focus:outline-none focus:border-[#3A3835] font-mono"
            onKeyDown={e => e.key === "Enter" && addFlag()} />
          <button onClick={addFlag} className="rounded-lg bg-[#252320] px-3 hover:bg-zinc-700 transition-all">
            <Plus className="h-4 w-4 text-white" />
          </button>
        </div>
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#666360]" />
          <input value={flagSearch} onChange={e => setFlagSearch(e.target.value)}
            placeholder="Buscar flag..."
            className="w-full rounded-lg border border-[#2E2C28] bg-[#252320] pl-9 pr-3 py-2 text-xs text-white placeholder:text-[#666360] focus:outline-none focus:border-[#3A3835]" />
        </div>
        {/* List */}
        <div className="flex-1 overflow-y-auto min-h-0 space-y-1 pr-1">
          {filteredFlags.length === 0 ? (
            <p className="text-center text-xs text-[#666360] py-6">{tr.noFlags}</p>
          ) : filteredFlags.map(([k, v]) => (
            <div key={k} className="flex items-center gap-2 rounded-lg border border-[#2E2C28] bg-[#252320]/50 px-3 py-2">
              <span className="flex-1 truncate text-[11px] text-[#BBBBBB] font-mono">{k}</span>
              <span className="text-[11px] text-[#888580] font-mono w-14 text-right truncate">{v}</span>
              <button onClick={() => removeFlag(k)} className="text-zinc-700 hover:text-[#AEAEAE] transition-colors ml-1">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
        {/* Actions */}
        <div className="flex gap-2">
          <button onClick={saveFlags} disabled={savingFlags}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-white py-2.5 text-sm font-semibold text-black hover:bg-zinc-200 disabled:opacity-40 transition-all">
            {savingFlags ? <Loader2 className="h-4 w-4 animate-spin text-black" /> : flagsSaved ? <Check className="h-4 w-4" /> : null}
            {flagsSaved ? tr.saved : tr.save}
          </button>
          <button onClick={clearFlags} className="rounded-lg border border-[#2E2C28] px-3 text-[#888580] hover:text-[#AEAEAE] hover:border-[#3A3835] transition-all">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    ),
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#1D1B17]">
      <AnimatePresence mode="wait">

        {/* ── HOME ── */}
        {view === "home" && (
          <motion.div key="home"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
            className="flex w-full flex-1 flex-col bg-[#1D1B17]">

            {/* Header */}
            <div className="flex items-center gap-3 border-b border-[#2E2C28] px-5 py-3.5">
              <img
                src="https://static.wikia.nocookie.net/logopedia/images/5/51/RivalsLogo.png/revision/latest?cb=20260110001756"
                alt="Rivals" className="h-7 w-7 object-contain opacity-90" crossOrigin="anonymous" />
              <span className="text-sm font-semibold text-[#AEAEAE] tracking-tight">YUMMAN RIVALS</span>
              <span className="ml-1 rounded-md bg-[#252320] px-2 py-0.5 text-[10px] font-medium text-[#AEAEAE]">v{appVersion}</span>
              <div className="ml-auto flex items-center gap-2">
                <button onClick={() => setLang(lang === "es" ? "en" : "es")}
                  className="rounded-md bg-[#252320] px-2.5 py-1 text-[11px] font-semibold text-[#AEAEAE] hover:text-[#AEAEAE] hover:bg-zinc-700 transition-all">
                  {lang.toUpperCase()}
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex">
              {/* Left */}
              <div className="flex w-44 flex-col border-r border-[#2E2C28] p-5">
                <img
                  src="https://tr.rbxcdn.com/30DAY-AvatarHeadshot-695CED98FDC232201477E9A144B99CE4-Png/150/150/AvatarHeadshot/Webp/noFilter"
                  alt="YUMMAN" className="mb-4 h-14 w-14 rounded-xl object-cover border border-[#2E2C28]" crossOrigin="anonymous" />
                <p className="text-sm font-semibold text-[#AEAEAE]">YUMMAN</p>
                <p className="text-[11px] text-[#666360] mt-0.5 mb-auto">Rivals Launcher</p>
                <div className="flex flex-col gap-2 mt-6">
                  <button onClick={() => ext("https://discord.com/invite/EVWqd5swAt")}
                    className="flex items-center gap-2 text-[11px] text-[#666360] hover:text-[#BBBBBB] transition-colors">
                    <HelpCircle className="h-3.5 w-3.5" />{tr.discord}
                  </button>
                  <button onClick={() => ext("https://www.roblox.com/es/users/4018950771/profile")}
                    className="flex items-center gap-2 text-[11px] text-[#666360] hover:text-[#BBBBBB] transition-colors">
                    <Heart className="h-3.5 w-3.5" />{tr.about}
                  </button>
                </div>
              </div>

              {/* Right */}
              <div className="flex flex-1 flex-col gap-2 p-5">
                {/* Launch */}
                <button onClick={handleLaunch} disabled={launchState === "launching"}
                  className={`group flex items-center justify-between rounded-xl px-4 py-3.5 transition-all hover:scale-[1.01] disabled:cursor-not-allowed ${
                    launchState === "done" ? "bg-[#252320] border border-[#3A3835]" :
                    launchState === "error" ? "bg-[#252320] border border-[#2E2C28]" :
                    "bg-[#252320] border border-[#2E2C28] hover:border-[#3A3835] hover:bg-[#2A2825]"
                  }`}>
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E6E6E6]/5">
                      {launchState === "launching" ? <Loader2 className="h-4 w-4 animate-spin text-white" /> :
                       launchState === "done" ? <Check className="h-4 w-4 text-[#AEAEAE]" /> :
                       launchState === "error" ? <X className="h-4 w-4 text-[#AEAEAE]" /> :
                       <Play className="h-4 w-4 text-white" />}
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-[#AEAEAE]">
                        {launchState === "launching" ? tr.launching : launchState === "done" ? tr.launched : launchState === "error" ? tr.launchErr : tr.launch}
                      </p>
                      <p className="text-[11px] text-[#888580]">{tr.launchSub}</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-[#666360] group-hover:text-[#AEAEAE] transition-colors" />
                </button>

                {/* Settings */}
                <button onClick={goSettings}
                  className="group flex items-center justify-between rounded-xl border border-[#2E2C28] bg-[#252320] px-4 py-3.5 transition-all hover:scale-[1.01] hover:border-[#3A3835] hover:bg-[#2A2825]">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E6E6E6]/5">
                      <Settings className="h-4 w-4 text-white" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-[#AEAEAE]">{tr.configure}</p>
                      <p className="text-[11px] text-[#888580]">{tr.configureSub}</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-[#666360] group-hover:text-[#AEAEAE] transition-colors" />
                </button>

                {/* Install */}
                <button onClick={handleInstall} disabled={isInstalling}
                  className="group flex items-center gap-3 rounded-xl border border-[#2E2C28] px-4 py-2.5 transition-all hover:border-[#3A3835] hover:bg-[#252320] disabled:opacity-40">
                  {isInstalling ? <Loader2 className="h-3.5 w-3.5 animate-spin text-[#888580]" /> : <Download className="h-3.5 w-3.5 text-[#666360] group-hover:text-[#AEAEAE] transition-colors" />}
                  <p className="text-xs text-[#888580] group-hover:text-[#BBBBBB] transition-colors">
                    {isInstalling ? tr.installing : tr.install}
                  </p>
                </button>

                {/* Active badges */}
                {(selectedSky || darkOn || potatoTexOn || lowLatOn || potatoOn) && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {selectedSky && <Badge icon={<Cloud className="h-3 w-3 text-[#AEAEAE]" />} label={skyboxes.find(s => s.id === selectedSky)?.[lang === "es" ? "name" : "nameEn"] ?? selectedSky} />}
                    {darkOn && <Badge icon={<Moon className="h-3 w-3 text-[#AEAEAE]" />} label="Dark" />}
                    {potatoTexOn && <Badge icon={<Zap className="h-3 w-3 text-[#FFB71E]" />} label="Potato Tex" />}
                    {lowLatOn && <Badge icon={<Flag className="h-3 w-3 text-[#AEAEAE]" />} label="Low Latency" />}
                    {potatoOn && <Badge icon={<Zap className="h-3 w-3 text-[#FFB71E]" />} label="Potato Mode" highlight />}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── SETTINGS ── */}
        {view === "settings" && (
          <motion.div key="settings"
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}
            className="flex w-full flex-1 flex-col bg-[#1D1B17]">

            {/* Header */}
            <div className="flex items-center gap-3 border-b border-[#2E2C28] px-5 py-3">
              <button onClick={goHome}
                className="flex items-center gap-1.5 text-xs text-[#888580] hover:text-[#AEAEAE] transition-colors">
                <ChevronLeft className="h-4 w-4" />{tr.back}
              </button>
              <span className="text-sm font-semibold text-[#AEAEAE]">{tr.config}</span>
              <span className="ml-auto text-[11px] text-[#666360]">{Object.keys(flags).length} flags activos</span>
            </div>

            <div className="flex flex-1 min-h-0">
              {/* Sidebar */}
              <nav className="flex w-36 flex-col gap-0.5 border-r border-[#2E2C28] p-2">
                {([
                  { id: "sky" as Tab, icon: Cloud, label: tr.sky },
                  { id: "textures" as Tab, icon: Moon, label: tr.textures },
                  { id: "fonts" as Tab, icon: Type, label: tr.fonts },
                  { id: "potato" as Tab, icon: Zap, label: tr.potato },
                  { id: "flags" as Tab, icon: Flag, label: tr.flags },
                ]).map(t => {
                  const Icon = t.icon
                  const active = tab === t.id
                  return (
                    <button key={t.id} onClick={() => setTab(t.id)}
                      className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-all ${active ? "bg-[#252320] text-white" : "text-[#888580] hover:bg-[#252320]/50 hover:text-[#BBBBBB]"}`}>
                      <Icon className={`h-3.5 w-3.5 ${active ? "text-[#AEAEAE]" : "text-[#666360]"}`} />
                      {t.label}
                    </button>
                  )
                })}
              </nav>

              {/* Content */}
              <div className="flex-1 overflow-hidden p-4">
                <AnimatePresence mode="wait">
                  <motion.div key={tab}
                    initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.12 }}
                    className="h-full flex flex-col">
                    {tabContent[tab]}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  )
}

// ── Badge helper ──────────────────────────────────────────────────────────────
function Badge({ icon, label, highlight }: { icon: React.ReactNode; label: string; highlight?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${highlight ? "bg-[#FFB71E]/8 text-[#FFB71E]" : "bg-[#2A2825] text-[#AEAEAE]"}`}>
      {icon}{label}
    </span>
  )
}






