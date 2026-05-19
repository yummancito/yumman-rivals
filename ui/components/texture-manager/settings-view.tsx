"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Cloud, Moon, Type, Zap, Flag, Search, Plus, Trash2,
  Check, Loader2, RotateCcw, AlertTriangle, X, Image,
  Play, ChevronRight, Settings, Home, Upload, FileJson,
  BookOpen, ExternalLink, Globe, Layers, Palette, Cpu
} from "lucide-react"
import { skyboxes } from "@/lib/skyboxes"
import { electronAPI } from "@/lib/electron-api"

type Tab = "inicio" | "sky" | "textures" | "fonts" | "potato" | "flags" | "guia"
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

const NAV = [
  { id: "inicio" as Tab, icon: Home,     label: "Inicio"      },
  { id: "sky"    as Tab, icon: Cloud,    label: "Cielos"      },
  { id: "textures" as Tab, icon: Moon,   label: "Texturas"    },
  { id: "fonts"  as Tab, icon: Type,     label: "Fuentes"     },
  { id: "potato" as Tab, icon: Zap,      label: "Potato Mode" },
  { id: "flags"  as Tab, icon: Flag,     label: "Fast Flags"  },
  { id: "guia"   as Tab, icon: BookOpen, label: "Cómo usar"   },
]

interface SettingsViewProps {
  onBack?: () => void
}

export function SettingsView({ onBack }: SettingsViewProps = {}) {
  const [tab, setTab] = useState<Tab>("inicio")
  const [texturePath, setTexturePath] = useState("")
  const [appVersion, setAppVersion] = useState("—")

  // Sky
  const [selectedSky, setSelectedSky] = useState<string | null>(null)
  const [applyingSky, setApplyingSky] = useState(false)
  const [skyApplied, setSkyApplied] = useState(false)
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

  // Flag modal
  const [showFlagModal, setShowFlagModal] = useState(false)
  const [flagModalTab, setFlagModalTab] = useState<"single" | "json">("single")
  const [modalFlagKey, setModalFlagKey] = useState("")
  const [modalFlagVal, setModalFlagVal] = useState("")
  const [modalJsonText, setModalJsonText] = useState("")
  const [modalError, setModalError] = useState("")

  const api = typeof window !== "undefined" ? window.electronAPI : null

  useEffect(() => {
    async function init() {
      const r = await electronAPI.getExecutorTexturePath("roblox")
      if (r.valid) setTexturePath(r.texturePath)

      if (!api) return

      const v = await electronAPI.getAppVersion()
      if (v) setAppVersion(v)

      // Cargar configuración persistente guardada
      const cfg = await electronAPI.loadAppConfig()
      if (cfg?.config) {
        if (cfg.config.selectedSky) setSelectedSky(cfg.config.selectedSky as string)
        const potatoModeCfg = !!cfg.config.potatoOn
        let potatoTexCfg = !!cfg.config.potatoTexOn
        let darkCfg = !!cfg.config.darkOn

        if (potatoModeCfg) potatoTexCfg = true
        if (potatoTexCfg) darkCfg = false

        setPotatoOn(potatoModeCfg)
        setPotatoTexOn(potatoTexCfg)
        setDarkOn(darkCfg)

        if (cfg.config.darkOn !== darkCfg || cfg.config.potatoTexOn !== potatoTexCfg) {
          await electronAPI.saveAppConfig({ darkOn: darkCfg, potatoTexOn: potatoTexCfg })
        }
        if (cfg.config.lowLatOn) setLowLatOn(true)
        if (cfg.config.activeFont) setActiveFont(cfg.config.activeFont as string)
      }

      const fr = await api.getAvailableFonts?.()
      if (fr?.success) {
        setFonts(fr.fonts || [])
        if (fr.fontsDir && fr.fonts?.length) {
          const existing = document.getElementById("yumman-fonts")
          if (!existing) {
            const style = document.createElement("style")
            style.id = "yumman-fonts"
            style.textContent = (fr.fonts as FontEntry[]).map((f: FontEntry) => {
              const url = `file:///${fr.fontsDir.replace(/\\/g, "/")}/${f.file}`
              return `@font-face { font-family: "${f.name}"; src: url("${url}"); font-display: swap; }`
            }).join("\n")
            document.head.appendChild(style)
          }
        }
      }

      const flr = await api.getFlags?.()
      if (flr?.success) setFlags(flr.flags || {})
    }
    init()
  }, [])

  // Handlers
  const handleApplySky = async () => {
    if (!selectedSky || applyingSky) return
    setApplyingSky(true); setSkyApplied(false)
    try {
      const r = await electronAPI.applySky(selectedSky, texturePath)
      if (r?.success) {
        setSkyApplied(true)
        setTimeout(() => setSkyApplied(false), 2500)
        // Persistir selección
        await electronAPI.saveAppConfig({ selectedSky })
      }
    } finally { setTimeout(() => setApplyingSky(false), 200) }
  }

  const handleConvert = async () => {
    setConvertingSky(true)
    try {
      const r = await api?.selectAndConvertSky?.()
      if (r?.success) {
        setCustomReady(true)
      } else if (r?.message && r.message !== 'Cancelado') {
        alert(`Error al convertir imagen: ${r.message}`)
      }
    } catch (e) {
      console.error(e)
      alert(`Error: ${e}`)
    } finally {
      setConvertingSky(false)
    }
  }

  const handleApplyCustom = async () => {
    setApplyingCustom(true)
    try {
      const r = await api?.applyConvertedSky?.(texturePath)
      if (r?.success) {
        alert(`✓ ${r.message}`)
      } else {
        alert(`Error: ${r?.message || 'No se pudo aplicar el cielo'}`)
      }
    } catch (e) {
      console.error(e)
      alert(`Error: ${e}`)
    } finally {
      setApplyingCustom(false)
    }
  }

  const handleDark = async () => {
    setApplyingTex(true)
    try {
      const r = await electronAPI.applyDarkTextures(!darkOn, texturePath)
      if (r?.success) {
        const next = !darkOn
        setDarkOn(next)
        if (!next) {
          setPotatoTexOn(false)
          await electronAPI.saveAppConfig({ darkOn: false, potatoTexOn: false })
        } else {
          setPotatoTexOn(false)
          await electronAPI.saveAppConfig({ darkOn: true, potatoTexOn: false })
        }
      } else if (r?.message) {
        alert(`Error: ${r.message}`)
      }
    } finally { setApplyingTex(false) }
  }

  const handlePotatoTex = async () => {
    setApplyingTex(true)
    try {
      if (!potatoTexOn) {
        // Activar
        const r = await api?.applyPotatoTextures?.(texturePath)
        if (r?.success) {
          setPotatoTexOn(true)
          setDarkOn(false)
          await electronAPI.saveAppConfig({ potatoTexOn: true, darkOn: false })
        }
      } else {
        // Desactivar - restaurar texturas originales
        const r = await electronAPI.restoreOriginal(texturePath)
        if (r?.success) {
          setPotatoTexOn(false)
          setDarkOn(false)
          await electronAPI.saveAppConfig({ potatoTexOn: false, darkOn: false })
        } else if (r?.message) {
          alert(`Error: ${r.message}`)
        }
      }
    } finally { setApplyingTex(false) }
  }

  const handleApplyFont = async (f: FontEntry) => {
    setApplyingFont(f.file); setFontApplied(null)
    try {
      const r = await api?.applyFontPack?.(f.file)
      if (r?.success) { setActiveFont(f.file); setFontApplied(f.file); setTimeout(() => setFontApplied(null), 2500) }
      else { alert(`Error: ${r?.message || "No se pudo aplicar la fuente"}`) }
    } finally { setApplyingFont(null) }
  }

  const handleImportFont = async () => {
    try {
      const r = await api?.importFont?.()
      if (r?.success) {
        // Reload fonts list
        const fr = await api?.getAvailableFonts?.()
        if (fr?.success) {
          setFonts(fr.fonts || [])
          // Inject new @font-face
          if (fr.fontsDir) {
            const style = document.getElementById("yumman-fonts") || document.createElement("style")
            style.id = "yumman-fonts"
            style.textContent = (fr.fonts as FontEntry[]).map((f: FontEntry) => {
              const url = `file:///${fr.fontsDir.replace(/\\/g, "/")}/${f.file}`
              return `@font-face { font-family: "${f.name}"; src: url("${url}"); font-display: swap; }`
            }).join("\n")
            if (!document.getElementById("yumman-fonts")) document.head.appendChild(style)
          }
        }
      }
    } catch (e) { console.error(e) }
  }

  const handleRestoreFonts = async () => { await api?.restoreFonts?.(); setActiveFont(null) }

  const handlePotato = async () => {
    setApplyingPotato(true)
    try {
      const fr = await api?.getPotatoFlags?.()
      if (fr?.success) { await api?.saveFlags?.(fr.flags); setFlags(fr.flags) }
      await api?.applyPotatoTextures?.(texturePath)
      setPotatoOn(true)
      setPotatoTexOn(true)
      setDarkOn(false)
      await electronAPI.saveAppConfig({ potatoOn: true, potatoTexOn: true, darkOn: false })
    } finally { setApplyingPotato(false) }
  }

  const handleDisablePotato = async () => {
    setApplyingPotato(true)
    try {
      // Restaurar texturas originales
      await electronAPI.restoreOriginal(texturePath)
      // Limpiar flags de potato
      await api?.clearFlags?.()
      setFlags({})
      setPotatoOn(false)
      setPotatoTexOn(false)
      setDarkOn(false)
      await electronAPI.saveAppConfig({ potatoOn: false, potatoTexOn: false, darkOn: false })
    } finally { setApplyingPotato(false) }
  }

  const handleLowLat = async () => {
    const next = !lowLatOn
    const newFlags = next
      ? { ...flags, ...LOW_LATENCY_FLAGS }
      : Object.fromEntries(Object.entries(flags).filter(([k]) => !LOW_LATENCY_FLAGS[k]))
    setFlags(newFlags); setLowLatOn(next)
    await api?.saveFlags?.(newFlags)
    await electronAPI.saveAppConfig({ lowLatOn: next })
  }

  const addFlag = () => {
    if (!flagKey.trim()) return
    setFlags(p => ({ ...p, [flagKey.trim()]: flagVal.trim() }))
    setFlagKey(""); setFlagVal("")
  }

  const openFlagModal = () => {
    setModalFlagKey(""); setModalFlagVal(""); setModalJsonText(""); setModalError("")
    setFlagModalTab("single"); setShowFlagModal(true)
  }

  const confirmFlagModal = () => {
    if (flagModalTab === "single") {
      if (!modalFlagKey.trim()) { setModalError("El nombre del flag no puede estar vacío"); return }
      setFlags(p => ({ ...p, [modalFlagKey.trim()]: modalFlagVal.trim() }))
      setShowFlagModal(false)
    } else {
      try {
        const parsed = JSON.parse(modalJsonText)
        if (typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Debe ser un objeto JSON")
        setFlags(p => ({ ...p, ...parsed }))
        setShowFlagModal(false)
      } catch (e: any) {
        setModalError(`JSON inválido: ${e.message}`)
      }
    }
  }

  const removeFlag = (k: string) => setFlags(p => { const n = { ...p }; delete n[k]; return n })

  const saveFlags = async () => {
    setSavingFlags(true); setFlagsSaved(false)
    try { await api?.saveFlags?.(flags); setFlagsSaved(true); setTimeout(() => setFlagsSaved(false), 2500) }
    finally { setSavingFlags(false) }
  }

  const clearFlags = async () => {
    await api?.clearFlags?.(); setFlags({}); setPotatoOn(false); setLowLatOn(false)
    await electronAPI.saveAppConfig({ potatoOn: false, potatoTexOn: false, lowLatOn: false })
  }

  const filteredFonts = fonts.filter(f => f.name.toLowerCase().includes(fontSearch.toLowerCase()))
  const filteredFlags = Object.entries(flags).filter(([k]) => k.toLowerCase().includes(flagSearch.toLowerCase()))

  // ── Tab content ──────────────────────────────────────────────────────────────
  const content: Record<Tab, React.ReactNode> = {

    inicio: (
      <div className="flex flex-col gap-4 overflow-y-auto">
        <div>
          <h2 className="text-base font-semibold text-[#AEAEAE]">Bienvenido a YUMMAN RIVALS</h2>
          <p className="text-xs text-[#666360] mt-1">Personaliza tu experiencia en Rivals. Usa el menú lateral para navegar.</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: Cloud, label: "Cielos", sub: "25+ skyboxes personalizados", tab: "sky" as Tab },
            { icon: Moon, label: "Texturas", sub: "Dark & Potato textures", tab: "textures" as Tab },
            { icon: Type, label: "Fuentes", sub: "Cambia la fuente del juego", tab: "fonts" as Tab },
            { icon: Zap, label: "Potato Mode", sub: "Máximo rendimiento", tab: "potato" as Tab },
            { icon: Flag, label: "Fast Flags", sub: "Editor de ClientAppSettings", tab: "flags" as Tab },
          ].map(item => {
            const Icon = item.icon
            return (
              <button key={item.tab} onClick={() => setTab(item.tab)}
                className="flex items-center gap-3 rounded-xl border border-[#2A2825] bg-[#252320] p-4 text-left transition-all hover:border-[#3A3835] hover:bg-[#2A2825]">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[#1D1B17]">
                  <Icon className="h-4 w-4 text-[#AEAEAE]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#AEAEAE]">{item.label}</p>
                  <p className="text-[11px] text-[#666360]">{item.sub}</p>
                </div>
              </button>
            )
          })}
        </div>

        {/* ── ¿Es baneable? ─────────────────────────────────────────────────── */}
        <div className="rounded-xl border border-[#2A2825] bg-[#252320] overflow-hidden">
          {/* Header verde */}
          <div className="flex items-center gap-2.5 px-4 py-3 bg-emerald-500/10 border-b border-emerald-500/20">
            <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/20">
              <svg className="h-3 w-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="text-xs font-semibold text-emerald-400">¿Es baneable usar YUMMAN RIVALS?</span>
            <span className="ml-auto text-[10px] font-medium text-emerald-500/70 bg-emerald-500/10 px-2 py-0.5 rounded-full">NO</span>
          </div>

          <div className="px-4 py-3 flex flex-col gap-3">
            {/* Explicación */}
            <p className="text-[11px] text-[#888580] leading-relaxed">
              YUMMAN RIVALS solo modifica <span className="text-[#AEAEAE] font-medium">archivos locales del cliente</span> — texturas, skyboxes y fuentes en tu PC. Roblox no puede detectar cambios en archivos locales desde el servidor. No hay inyección de código, no hay modificación de memoria en tiempo real.
            </p>

            {/* Cita oficial Roblox */}
            <div className="rounded-lg border border-[#3A3835] bg-[#1D1B17] px-3 py-2.5">
              <div className="flex items-center gap-2 mb-1.5">
                <img
                  src="https://static.wikia.nocookie.net/logopedia/images/5/51/RivalsLogo.png/revision/latest?cb=20260110001756"
                  alt="Roblox" className="h-3.5 w-3.5 object-contain opacity-60" crossOrigin="anonymous"
                />
                <span className="text-[10px] font-semibold text-[#666360] uppercase tracking-wider">Roblox Developer Forum — Oficial</span>
              </div>
              <p className="text-[11px] text-[#AEAEAE] leading-relaxed italic">
                "Will I face consequences if I attempt to use Fast Flags that are not on the Fast Flag Allowlist?
                <span className="text-emerald-400 not-italic font-medium"> No. Fast Flags not on the Allowlist will simply be ignored. No further action will be taken against a user attempting to use a restricted Fast Flag.</span>"
              </p>
              <a
                href="https://devforum.roblox.com/t/allowlist-for-local-client-configuration-via-fast-flags/3966569"
                target="_blank" rel="noopener noreferrer"
                className="mt-1.5 flex items-center gap-1 text-[10px] text-[#555250] hover:text-[#AEAEAE] transition-colors"
                onClick={e => { e.preventDefault(); window.open("https://devforum.roblox.com/t/allowlist-for-local-client-configuration-via-fast-flags/3966569", "_blank", "noopener,noreferrer") }}
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                devforum.roblox.com — Allowlist for local client configuration via Fast Flags
              </a>
            </div>

            {/* Tabla de qué hace cada cosa */}
            <div className="flex flex-col gap-1">
              {[
                { label: "Skyboxes / Texturas / Fuentes", safe: true, note: "Archivos locales, indetectable" },
                { label: "Fast Flags (allowlist)", safe: true, note: "Oficial y permitido por Roblox" },
                { label: "Fast Flags (fuera de allowlist)", safe: true, note: "Simplemente ignorados, sin ban" },
                { label: "Exploits / inyección de código", safe: false, note: "Baneable — esto NO lo hace la app" },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2.5 py-1">
                  <div className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${item.safe ? "bg-emerald-500" : "bg-red-500"}`} />
                  <span className="text-[11px] text-[#AEAEAE] flex-1">{item.label}</span>
                  <span className={`text-[10px] ${item.safe ? "text-emerald-500/70" : "text-red-500/70"}`}>{item.note}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    ),

    sky: (
      <div className="flex flex-col gap-4 h-full">
        <div>
          <h2 className="text-base font-semibold text-[#AEAEAE]">Cielos</h2>
          <p className="text-xs text-[#666360] mt-0.5">Selecciona un cielo para aplicar en Rivals</p>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="grid grid-cols-4 gap-2 pr-1">
            {skyboxes.map(s => (
              <button key={s.id} onClick={() => setSelectedSky(s.id)}
                className={`relative overflow-hidden rounded-xl border-2 transition-all hover:scale-[1.02] ${selectedSky === s.id ? "border-[#AEAEAE]" : "border-[#2A2825] hover:border-[#3A3835]"}`}
                style={{ aspectRatio: "4/3" }}>
                <img src={s.image} alt={s.nameEn} className="h-full w-full object-cover" crossOrigin="anonymous" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-1.5 py-1">
                  <p className="text-center text-[10px] font-medium text-[#AEAEAE]">{s.name}</p>
                </div>
                {selectedSky === s.id && (
                  <div className="absolute top-1.5 right-1.5 rounded-full bg-[#AEAEAE] p-0.5">
                    <Check className="h-2.5 w-2.5 text-[#1D1B17]" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={handleApplySky} disabled={!selectedSky || applyingSky}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#E6E6E6] py-2.5 text-sm font-semibold text-[#1D1B17] transition-all hover:bg-[#CFCFCF] disabled:opacity-30">
            {applyingSky ? <Loader2 className="h-4 w-4 animate-spin" /> : skyApplied ? <Check className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {applyingSky ? "Aplicando..." : skyApplied ? "¡Aplicado!" : "Aplicar cielo"}
          </button>
          <button onClick={handleConvert} disabled={convertingSky}
            className="flex items-center gap-2 rounded-xl border border-[#2A2825] px-4 py-2.5 text-sm text-[#AEAEAE] hover:bg-[#252320] disabled:opacity-40">
            {convertingSky ? <Loader2 className="h-4 w-4 animate-spin" /> : <Image className="h-4 w-4" />}
            Desde imagen
          </button>
          {customReady && (
            <button onClick={handleApplyCustom} disabled={applyingCustom}
              className="flex items-center gap-2 rounded-xl border border-[#2A2825] px-4 py-2.5 text-sm text-[#AEAEAE] hover:bg-[#252320] disabled:opacity-40">
              {applyingCustom ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Aplicar imagen
            </button>
          )}
        </div>
        <p className="text-[10px] text-[#444240] leading-relaxed">
          💡 <span className="text-[#555250]">Tip:</span> Para mejor resultado usa una imagen panorámica 360° (ratio 2:1, ej. 4096×2048). Con cualquier otra imagen se aplica en las 6 caras directamente.
        </p>
      </div>
    ),

    textures: (
      <div className="flex flex-col gap-4 h-full">
        <div>
          <h2 className="text-base font-semibold text-[#AEAEAE]">Texturas</h2>
          <p className="text-xs text-[#666360] mt-0.5">Modifica las texturas del juego para mejor rendimiento o visibilidad</p>
        </div>
        <div className="flex flex-col gap-3">
          {[
            { label: "Dark Textures", sub: "Texturas oscuras para mejor visibilidad en combate", on: darkOn, fn: handleDark },
            { label: "Potato Textures", sub: "Studs planos ultra optimizados — requiere calidad gráfica 2", on: potatoTexOn, fn: handlePotatoTex },
          ].map(item => (
            <button key={item.label} onClick={item.fn} disabled={applyingTex}
              className={`flex items-center gap-4 rounded-xl border p-4 text-left transition-all hover:scale-[1.005] disabled:opacity-50 ${item.on ? "border-[#3A3835] bg-[#252320]" : "border-[#2A2825] bg-[#252320] hover:border-[#3A3835]"}`}>
              <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${item.on ? "bg-[#3A3835]" : "bg-[#1D1B17]"}`}>
                <Moon className="h-5 w-5 text-[#AEAEAE]" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-[#AEAEAE]">{item.label}</p>
                <p className="text-xs text-[#666360] mt-0.5">{item.sub}</p>
              </div>
              <div className={`rounded-full px-3 py-1 text-[11px] font-medium ${item.on ? "bg-[#3A3835] text-[#AEAEAE]" : "bg-[#1D1B17] text-[#666360]"}`}>
                {applyingTex ? "Aplicando..." : item.on ? "Desactivar" : "Activar"}
              </div>
            </button>
          ))}
        </div>
      </div>
    ),

    fonts: (
      <div className="flex flex-col gap-4 h-full">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-[#AEAEAE]">Fuentes</h2>
            <p className="text-xs text-[#666360] mt-0.5">Cambia la fuente del juego</p>
          </div>
          <button onClick={handleImportFont}
            className="flex items-center gap-2 rounded-lg border border-[#2A2825] bg-[#252320] px-3 py-2 text-xs text-[#AEAEAE] hover:bg-[#2A2825] hover:border-[#3A3835] transition-all">
            <Upload className="h-3.5 w-3.5" />Importar fuente
          </button>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0 space-y-1 pr-1">
          {filteredFonts.length === 0 ? (
            <p className="text-center text-sm text-[#555250] py-8">No hay fuentes disponibles</p>
          ) : filteredFonts.map(f => (
            <div key={f.file}
              className={`flex items-center justify-between rounded-xl border px-4 py-3 transition-all ${activeFont === f.file ? "border-[#3A3835] bg-[#252320]" : "border-[#2A2825] hover:border-[#3A3835]"}`}>
              <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                <span className="text-[10px] text-[#555250]">{f.name}</span>
                <span className="text-sm text-[#AEAEAE]" style={{ fontFamily: `"${f.name}", sans-serif` }}>
                  Probar fuente — YUMMAN RIVALS
                </span>
              </div>
              <button onClick={() => handleApplyFont(f)} disabled={!!applyingFont}
                className="ml-4 flex-shrink-0 rounded-lg border border-[#2A2825] bg-[#1D1B17] px-3 py-1.5 text-xs font-medium text-[#AEAEAE] hover:bg-[#252320] hover:border-[#3A3835] disabled:opacity-40 transition-all">
                {applyingFont === f.file ? <Loader2 className="h-3 w-3 animate-spin" /> : fontApplied === f.file ? <Check className="h-3 w-3" /> : "Aplicar"}
              </button>
            </div>
          ))}
        </div>
        <button onClick={handleRestoreFonts}
          className="flex items-center justify-center gap-2 rounded-xl border border-[#2A2825] py-2.5 text-xs text-[#666360] hover:text-[#AEAEAE] hover:border-[#3A3835] transition-all">
          <RotateCcw className="h-3.5 w-3.5" />Restaurar fuentes originales
        </button>
      </div>
    ),

    potato: (
      <div className="flex flex-col gap-4 h-full">
        <div>
          <h2 className="text-base font-semibold text-[#AEAEAE]">Potato Mode</h2>
          <p className="text-xs text-[#666360] mt-0.5">Máximo rendimiento — aplica flags y texturas optimizadas</p>
        </div>
        <div className={`rounded-xl border p-5 transition-all ${potatoOn ? "border-[#3A3835] bg-[#252320]" : "border-[#2A2825] bg-[#252320]"}`}>
          <ul className="space-y-1.5 mb-5">
            {["~30 flags de rendimiento", "Texturas potato (studs planos)", "Cielo gris (sin nubes)", "Sin hierba ni sombras", "Requiere calidad gráfica 2 en Roblox"].map((item, i) => (
              <li key={i} className="flex items-center gap-2 text-xs text-[#888580]">
                <ChevronRight className="h-3 w-3 text-[#555250] flex-shrink-0" />{item}
              </li>
            ))}
          </ul>
          {potatoOn ? (
            <button onClick={handleDisablePotato} disabled={applyingPotato}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-[#2A2825] py-3 text-sm font-semibold text-[#AEAEAE] hover:bg-[#252320] hover:border-[#3A3835] transition-all disabled:opacity-50">
              {applyingPotato ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
              Desactivar Potato Mode
            </button>
          ) : (
            <button onClick={handlePotato} disabled={applyingPotato}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold bg-[#E6E6E6] text-[#1D1B17] hover:bg-[#CFCFCF] transition-all disabled:opacity-50">
              {applyingPotato ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              Activar Potato Mode
            </button>
          )}
        </div>
        <button onClick={handleLowLat}
          className={`flex items-center gap-4 rounded-xl border p-4 text-left transition-all hover:scale-[1.005] ${lowLatOn ? "border-[#3A3835] bg-[#252320]" : "border-[#2A2825] bg-[#252320] hover:border-[#3A3835]"}`}>
          <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${lowLatOn ? "bg-[#3A3835]" : "bg-[#1D1B17]"}`}>
            <Flag className="h-5 w-5 text-[#AEAEAE]" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-[#AEAEAE]">Low Latency</p>
            <p className="text-xs text-[#666360] mt-0.5">Reduce el delay y la latencia de red</p>
          </div>
          <div className={`rounded-full px-3 py-1 text-[11px] font-medium ${lowLatOn ? "bg-[#3A3835] text-[#AEAEAE]" : "bg-[#1D1B17] text-[#666360]"}`}>
            {lowLatOn ? "Activo" : "Inactivo"}
          </div>
        </button>
      </div>
    ),

    flags: (
      <div className="flex flex-col gap-3 h-full">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-[#AEAEAE]">Editor de Fast Flags</h2>
            <p className="text-xs text-[#666360] mt-0.5">Gestiona tus Fast Flags. Edita ClientAppSettings.json.</p>
          </div>
          <span className="text-[11px] text-[#555250]">{Object.keys(flags).length} flags</span>
        </div>

        {/* Warning */}
        <div className="flex items-start gap-2.5 rounded-xl border border-[#FFB71E]/20 bg-[#FFB71E]/5 px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-[#FFB71E] flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-[#FFB71E]/80 leading-relaxed">
            <span className="font-semibold text-[#FFB71E]">Advertencia</span> — Roblox solo aplica flags en lista blanca. Modifica solo si sabes lo que haces.
          </p>
        </div>

        {/* Toolbar */}
        <div className="flex gap-2">
          <button onClick={openFlagModal}
            className="flex items-center gap-2 rounded-lg border border-[#2A2825] bg-[#252320] px-3 py-2 text-xs text-[#AEAEAE] hover:bg-[#2A2825] hover:border-[#3A3835] transition-all">
            <Plus className="h-3.5 w-3.5" />Agregar nuevo
          </button>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#555250]" />
            <input value={flagSearch} onChange={e => setFlagSearch(e.target.value)}
              placeholder="Buscar..."
              className="w-full rounded-lg border border-[#2A2825] bg-[#252320] pl-9 pr-3 py-2 text-xs text-[#AEAEAE] placeholder:text-[#555250] focus:outline-none focus:border-[#3A3835]" />
          </div>
        </div>

        {/* Column headers */}
        <div className="flex items-center px-3 gap-2">
          <span className="flex-1 text-[11px] text-[#555250]">Nombre</span>
          <span className="w-28 text-[11px] text-[#555250] text-right">Valor</span>
          <span className="w-6" />
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto min-h-0 space-y-1 pr-1">
          {filteredFlags.length === 0 ? (
            <p className="text-center text-xs text-[#555250] py-6">No hay flags configurados</p>
          ) : filteredFlags.map(([k, v]) => (
            <div key={k} className="flex items-center gap-2 rounded-lg border border-[#2A2825] bg-[#252320]/50 px-3 py-2">
              <span className="flex-1 truncate text-[11px] text-[#AEAEAE] font-mono">{k}</span>
              <span className="text-[11px] text-[#666360] font-mono w-28 text-right truncate">{v}</span>
              <button onClick={() => removeFlag(k)} className="text-[#444240] hover:text-[#AEAEAE] transition-colors w-6 flex justify-center">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Save / Clear */}
        <div className="flex gap-2">
          <button onClick={saveFlags} disabled={savingFlags}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#E6E6E6] py-2.5 text-sm font-semibold text-[#1D1B17] hover:bg-[#CFCFCF] disabled:opacity-40 transition-all">
            {savingFlags ? <Loader2 className="h-4 w-4 animate-spin text-[#1D1B17]" /> : flagsSaved ? <Check className="h-4 w-4" /> : null}
            {flagsSaved ? "¡Guardado!" : "Guardar Flags"}
          </button>
          <button onClick={clearFlags}
            className="rounded-xl border border-[#2A2825] px-4 text-[#555250] hover:text-[#AEAEAE] hover:border-[#3A3835] transition-all">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        {/* Modal */}
        {showFlagModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="w-[420px] rounded-2xl border border-[#2A2825] bg-[#1D1B17] shadow-2xl overflow-hidden">
              {/* Modal header */}
              <div className="flex items-center justify-between border-b border-[#2A2825] px-5 py-4">
                <span className="text-sm font-semibold text-[#AEAEAE]">Agregar Fast Flag</span>
                <button onClick={() => setShowFlagModal(false)} className="text-[#555250] hover:text-[#AEAEAE] transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-[#2A2825]">
                {(["single", "json"] as const).map(t => (
                  <button key={t} onClick={() => { setFlagModalTab(t); setModalError("") }}
                    className={`flex-1 py-3 text-sm font-medium transition-all ${flagModalTab === t ? "bg-[#252320] text-[#AEAEAE]" : "text-[#666360] hover:text-[#AEAEAE]"}`}>
                    {t === "single" ? "Agregar uno solo" : "Importar JSON"}
                  </button>
                ))}
              </div>

              {/* Modal body */}
              <div className="p-5">
                {flagModalTab === "single" ? (
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-[#888580]">Nombre</label>
                      <input value={modalFlagKey} onChange={e => setModalFlagKey(e.target.value)}
                        placeholder="FFlagExample"
                        className="rounded-lg border border-[#2A2825] bg-[#252320] px-3 py-2.5 text-sm text-[#AEAEAE] placeholder:text-[#555250] focus:outline-none focus:border-[#3A3835] font-mono" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-[#888580]">Valor</label>
                      <input value={modalFlagVal} onChange={e => setModalFlagVal(e.target.value)}
                        placeholder="True"
                        className="rounded-lg border border-[#2A2825] bg-[#252320] px-3 py-2.5 text-sm text-[#AEAEAE] placeholder:text-[#555250] focus:outline-none focus:border-[#3A3835] font-mono" />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-[#888580]">Pega tu JSON aquí</label>
                    <textarea value={modalJsonText} onChange={e => setModalJsonText(e.target.value)}
                      placeholder={'{\n  "FFlagExample": "True"\n}'}
                      rows={6}
                      className="rounded-lg border border-[#2A2825] bg-[#252320] px-3 py-2.5 text-xs text-[#AEAEAE] placeholder:text-[#555250] focus:outline-none focus:border-[#3A3835] font-mono resize-none" />
                  </div>
                )}
                {modalError && <p className="mt-2 text-xs text-red-400">{modalError}</p>}
              </div>

              {/* Modal footer */}
              <div className="flex gap-3 border-t border-[#2A2825] px-5 py-4">
                <button onClick={confirmFlagModal}
                  className="flex-1 rounded-xl bg-[#E6E6E6] py-2.5 text-sm font-semibold text-[#1D1B17] hover:bg-[#CFCFCF] transition-all">
                  OK
                </button>
                <button onClick={() => setShowFlagModal(false)}
                  className="flex-1 rounded-xl border border-[#2A2825] py-2.5 text-sm text-[#AEAEAE] hover:bg-[#252320] transition-all">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    ),

    guia: (
      <div className="flex flex-col gap-4 h-full overflow-y-auto pr-1">
        <div>
          <h2 className="text-base font-semibold text-[#AEAEAE]">Cómo usar YUMMAN RIVALS</h2>
          <p className="text-xs text-[#666360] mt-0.5">Guía completa de todas las funciones</p>
        </div>

        {/* ── Cielos ── */}
        <Section icon={<Cloud className="h-4 w-4 text-[#AEAEAE]" />} title="Cielos" badge="25+ skyboxes">
          <Step n={1} text="Ve al tab Cielos y selecciona cualquier skybox de la galería." />
          <Step n={2} text='Pulsa "Aplicar cielo". El cambio se aplica inmediatamente, sin reiniciar Roblox.' />
          <Divider />
          <p className="text-[11px] text-[#888580] font-medium mb-1">Cielo desde imagen propia</p>
          <Step n={1} text='Pulsa "Desde imagen" y selecciona un archivo PNG/JPG/WEBP.' />
          <Step n={2} text="Si la imagen es panorámica 360° (ratio 2:1, ej. 4096×2048) se generan 6 caras reales. Cualquier otra imagen se aplica en las 6 caras directamente." />
          <Step n={3} text='Cuando aparezca el botón "Aplicar imagen", púlsalo para aplicarlo.' />
          <Tip text="Panorámicas 360° gratis en polyhaven.com/hdris — descarga en 2K o 4K." />
        </Section>

        {/* ── Texturas ── */}
        <Section icon={<Moon className="h-4 w-4 text-[#AEAEAE]" />} title="Texturas">
          <p className="text-[11px] text-[#888580] font-medium mb-1">Dark Textures</p>
          <Step n={1} text="Activa Dark Textures para reemplazar los materiales del juego por versiones oscuras." />
          <Step n={2} text="Mejora la visibilidad de enemigos en combate. Requiere que Roblox esté cerrado." />
          <Divider />
          <p className="text-[11px] text-[#888580] font-medium mb-1">Potato Textures</p>
          <Step n={1} text="Aplica studs planos ultra optimizados. Máximo FPS." />
          <Step n={2} text="Requiere calidad gráfica 2 en Roblox para que se vean correctamente." />
        </Section>

        {/* ── Fuentes ── */}
        <Section icon={<Type className="h-4 w-4 text-[#AEAEAE]" />} title="Fuentes">
          <Step n={1} text="Busca una fuente en la lista o usa el buscador." />
          <Step n={2} text='Pulsa "Aplicar" — la fuente se copia a la carpeta de fuentes de Roblox.' />
          <Step n={3} text='Para volver a la fuente original pulsa "Restaurar fuentes originales".' />
          <Tip text='Usa "Importar fuente" para añadir cualquier .ttf/.otf de tu PC a la lista.' />
        </Section>

        {/* ── Potato Mode ── */}
        <Section icon={<Zap className="h-4 w-4 text-[#FFB71E]" />} title="Potato Mode" badge="máx. rendimiento">
          <Step n={1} text="Activa Potato Mode para aplicar de golpe: flags de rendimiento + texturas potato + cielo gris." />
          <Step n={2} text="Pon la calidad gráfica en 2 dentro de Roblox para que las texturas potato se vean bien." />
          <Divider />
          <p className="text-[11px] text-[#888580] font-medium mb-1">Low Latency</p>
          <Step n={1} text="Activa Low Latency para aplicar flags de red que reducen el ping y el delay." />
          <Tip text="Los flags se guardan en YUMMAN RIVALS\ClientSettings\ y se sincronizan automáticamente a Roblox." />
        </Section>

        {/* ── Fast Flags ── */}
        <Section icon={<Flag className="h-4 w-4 text-[#AEAEAE]" />} title="Fast Flags">
          <Step n={1} text='Pulsa "Agregar nuevo" para añadir un flag individual o importar un JSON completo.' />
          <Step n={2} text='Pulsa "Guardar Flags" para escribir los cambios. Se guardan en YUMMAN RIVALS y se sincronizan a Roblox.' />
          <Step n={3} text="El icono de papelera limpia todos los flags." />
          <Warn text="Desde sept. 2025 Roblox tiene una allowlist oficial. Flags fuera de ella son ignorados (no baneables)." />
          <div className="mt-2 rounded-lg border border-[#2A2825] bg-[#1D1B17] px-3 py-2">
            <p className="text-[10px] text-[#555250] mb-1 font-medium">Flags en la allowlist oficial (funcionan):</p>
            <p className="text-[10px] text-[#666360] font-mono leading-relaxed">
              FFlagHandleAltEnterFullscreenManually · DFFlagTextureQualityOverrideEnabled · DFIntTextureQualityOverride · DFIntDebugFRMQualityLevelOverride · FIntFRMMaxGrassDistance · FFlagDebugGraphicsPreferVulkan · FFlagDebugGraphicsPreferD3D11 · FFlagDebugGraphicsPreferOpenGL · FFlagDebugSkyGray · DFFlagDebugPauseVoxelizer · DFFlagDisableDPIScale · FIntDebugForceMSAASamples · DFIntCSGLevelOfDetailSwitching*
            </p>
          </div>
        </Section>

        {/* ── Dónde se guardan los cambios ── */}
        <Section icon={<Cpu className="h-4 w-4 text-[#AEAEAE]" />} title="Dónde se guardan los cambios">
          {[
            { label: "Fast Flags",        path: "%LOCALAPPDATA%\\YUMMAN RIVALS\\ClientSettings\\ClientAppSettings.json" },
            { label: "Texturas / Cielos", path: "%LOCALAPPDATA%\\Roblox\\Versions\\<version>\\PlatformContent\\pc\\textures\\" },
            { label: "Fuentes",           path: "%LOCALAPPDATA%\\Roblox\\Versions\\<version>\\content\\fonts\\" },
            { label: "Backup texturas",   path: "%APPDATA%\\YUMMAN RIVALS\\backup\\" },
          ].map(item => (
            <div key={item.label} className="flex flex-col gap-0.5 py-1 border-b border-[#2A2825] last:border-0">
              <span className="text-[11px] text-[#AEAEAE] font-medium">{item.label}</span>
              <span className="text-[10px] text-[#555250] font-mono break-all">{item.path}</span>
            </div>
          ))}
        </Section>
      </div>
    ),
  }

  return (
    <div className="flex h-screen w-screen bg-[#1D1B17] select-none overflow-hidden"
      style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif" }}>
      {/* Sidebar */}
      <motion.nav
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="flex w-52 flex-col border-r py-4"
        style={{ borderColor: "rgba(255,255,255,0.06)" }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 pb-4 mb-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <button
            onClick={onBack}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 8 }}
          >
            <img
              src="https://tr.rbxcdn.com/30DAY-AvatarHeadshot-695CED98FDC232201477E9A144B99CE4-Png/150/150/AvatarHeadshot/Webp/noFilter"
              alt="YUMMAN" className="h-7 w-7 object-cover rounded-full" crossOrigin="anonymous"
              style={{ border: "1px solid rgba(255,255,255,0.1)" }}
            />
            <span style={{ color: "#666360", fontSize: 11, fontWeight: 600 }}>YUMMAN RIVALS</span>
          </button>
        </div>

        {/* Nav items */}
        <div className="flex flex-col gap-0.5 px-2 flex-1">
          {NAV.map((item, i) => {
            const Icon = item.icon
            const active = tab === item.id
            return (
              <motion.button
                key={item.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04, duration: 0.25 }}
                onClick={() => setTab(item.id)}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-all relative"
                style={{
                  color: active ? "#AEAEAE" : "#555250",
                  background: active ? "rgba(255,255,255,0.07)" : "transparent",
                  border: "none", cursor: "pointer", textAlign: "left", width: "100%",
                }}
                whileHover={{ x: active ? 0 : 2 }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.color = "#888580" }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.color = "#555250" }}
              >
                {active && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 rounded-xl"
                    style={{ background: "rgba(255,255,255,0.07)" }}
                    transition={{ type: "spring", stiffness: 400, damping: 35 }}
                  />
                )}
                <Icon className="h-4 w-4 relative z-10" style={{ color: active ? "#AEAEAE" : "#555250" }} />
                <span className="relative z-10">{item.label}</span>
              </motion.button>
            )
          })}
        </div>

        {/* Version */}
        <div className="px-4 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <p style={{ color: "#333230", fontSize: 10 }}>v{appVersion} · YUMMAN</p>
        </div>
      </motion.nav>

      {/* Main content */}
      <main className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="h-full flex flex-col"
            >
              {content[tab]}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}

// ── Helper components para el tab "Cómo usar" ────────────────────────────────

function Section({
  icon, title, badge, children
}: {
  icon: React.ReactNode
  title: string
  badge?: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-[#2A2825] bg-[#252320] overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-[#2A2825]">
        {icon}
        <span className="text-xs font-semibold text-[#AEAEAE]">{title}</span>
        {badge && (
          <span className="ml-auto text-[10px] text-[#555250] bg-[#1D1B17] px-2 py-0.5 rounded-full border border-[#2A2825]">
            {badge}
          </span>
        )}
      </div>
      <div className="px-4 py-3 flex flex-col gap-1.5">
        {children}
      </div>
    </div>
  )
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="flex-shrink-0 flex h-4 w-4 items-center justify-center rounded-full bg-[#1D1B17] border border-[#3A3835] text-[9px] font-bold text-[#666360] mt-0.5">
        {n}
      </span>
      <p className="text-[11px] text-[#888580] leading-relaxed">{text}</p>
    </div>
  )
}

function Divider() {
  return <div className="border-t border-[#2A2825] my-1" />
}

function Tip({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 mt-1 rounded-lg bg-[#1D1B17] border border-[#2A2825] px-3 py-2">
      <span className="text-[10px] flex-shrink-0 mt-0.5">💡</span>
      <p className="text-[10px] text-[#555250] leading-relaxed">{text}</p>
    </div>
  )
}

function Warn({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 mt-1 rounded-lg border border-[#FFB71E]/20 bg-[#FFB71E]/5 px-3 py-2">
      <span className="text-[10px] flex-shrink-0 mt-0.5">⚠</span>
      <p className="text-[10px] text-[#FFB71E]/70 leading-relaxed">{text}</p>
    </div>
  )
}
