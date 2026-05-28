"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import {
  Cloud, Moon, Type, Zap, Flag, Search, Plus, Trash2,
  Check, Loader2, RotateCcw, AlertTriangle, X, Image,
  Play, ChevronRight, Settings, Home, Upload, FileJson,
  ExternalLink, Globe, Layers, Palette, Cpu, Heart
} from "lucide-react"
import { skyboxes } from "@/lib/skyboxes"
import { electronAPI } from "@/lib/electron-api"
import { ProfileSection } from "./profile-section"

type Tab = "inicio" | "profile" | "sky" | "textures" | "fonts" | "potato" | "flags" | "donar"
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
  { id: "profile" as Tab, icon: Settings, label: "Perfil"      },
  { id: "sky"    as Tab, icon: Cloud,    label: "Cielos"      },
  { id: "textures" as Tab, icon: Moon,   label: "Texturas"    },
  { id: "fonts"  as Tab, icon: Type,     label: "Fuentes"     },
  { id: "potato" as Tab, icon: Zap,      label: "Potato Mode" },
  { id: "flags"  as Tab, icon: Flag,     label: "Fast Flags"  },
  { id: "donar"  as Tab, icon: Heart,    label: "Donar"       },
]

interface SettingsViewProps {
  onBack?: () => void
}

export function SettingsView({ onBack }: SettingsViewProps = {}) {
  const [tab, setTab] = useState<Tab>("inicio")
  const [texturePath, setTexturePath] = useState("")
  const [appVersion, setAppVersion] = useState("—")

  // Messages
  const [messages, setMessages] = useState<Array<{ id: string; type: 'error' | 'success'; title: string; description: string }>>([])

  const addMessage = (type: 'error' | 'success', title: string, description: string) => {
    const id = Date.now().toString()
    setMessages(prev => [...prev, { id, type, title, description }])
    setTimeout(() => {
      setMessages(prev => prev.filter(m => m.id !== id))
    }, 5000)
  }

  const removeMessage = (id: string) => {
    setMessages(prev => prev.filter(m => m.id !== id))
  }

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
  const [applyingLowLat, setApplyingLowLat] = useState(false)

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
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null)

  const api = typeof window !== "undefined" ? window.electronAPI : null

  useEffect(() => {
    async function init() {
      const r = await electronAPI.getExecutorTexturePath("yumman")
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
      // Limpiar flags que afectan el cielo antes de aplicar skybox
      await api?.clearFlags?.()
      setFlags({})
      setPotatoOn(false)
      setLowLatOn(false)
      await electronAPI.saveAppConfig({ potatoOn: false, lowLatOn: false })

      const r = await electronAPI.applySky(selectedSky, texturePath)
      if (r?.success) {
        setSkyApplied(true)
        setTimeout(() => setSkyApplied(false), 2500)
        // Persistir selección
        await electronAPI.saveAppConfig({ selectedSky })
        addMessage('success', 'Cielo aplicado', `Skybox ${selectedSky} aplicado correctamente. Flags del cielo limpiadas.`)
      } else if (r?.message) {
        addMessage('error', 'Error al aplicar cielo', r.message)
      }
    } catch (e: any) {
      addMessage('error', 'Error al aplicar cielo', e.message || 'Error desconocido al aplicar skybox')
    } finally { setTimeout(() => setApplyingSky(false), 200) }
  }

  const handleConvert = async () => {
    setConvertingSky(true)
    try {
      const r = await api?.selectAndConvertSky?.()
      if (r?.success) {
        setCustomReady(true)
        toast.success("Imagen convertida correctamente")
      } else if (r?.message && r.message !== 'Cancelado') {
        toast.error(`Error al convertir imagen: ${r.message}`)
      }
    } catch (e) {
      console.error(e)
      toast.error(`Error: ${e}`)
    } finally {
      setConvertingSky(false)
    }
  }

  const handleApplyCustom = async () => {
    setApplyingCustom(true)
    try {
      const r = await api?.applyConvertedSky?.(texturePath)
      if (r?.success) {
        toast.success(r.message || "Cielo aplicado correctamente")
      } else {
        toast.error(r?.message || 'No se pudo aplicar el cielo')
      }
    } catch (e) {
      console.error(e)
      toast.error(`Error: ${e}`)
    } finally {
      setApplyingCustom(false)
    }
  }

  const handleDark = async () => {
    setApplyingTex(true)
    try {
      // Limpiar flags que afectan el cielo antes de aplicar texturas
      await api?.clearFlags?.()
      setFlags({})
      setPotatoOn(false)
      setLowLatOn(false)
      await electronAPI.saveAppConfig({ potatoOn: false, lowLatOn: false })

      const r = await electronAPI.applyDarkTextures(!darkOn, texturePath)
      if (r?.success) {
        const next = !darkOn
        setDarkOn(next)
        if (!next) {
          setPotatoTexOn(false)
          await electronAPI.saveAppConfig({ darkOn: false, potatoTexOn: false })
          addMessage('success', 'Dark Textures desactivadas', 'Texturas originales restauradas correctamente')
        } else {
          setPotatoTexOn(false)
          await electronAPI.saveAppConfig({ darkOn: true, potatoTexOn: false })
          addMessage('success', 'Dark Textures activadas', 'Texturas oscuras aplicadas correctamente. Flags del cielo limpiadas.')
        }
      } else if (r?.message) {
        addMessage('error', 'Error en Dark Textures', r.message)
      }
    } catch (e: any) {
      addMessage('error', 'Error en Dark Textures', e.message || 'Error desconocido al aplicar texturas')
    } finally { setApplyingTex(false) }
  }

  const handlePotatoTex = async () => {
    setApplyingTex(true)
    try {
      // Limpiar flags que afectan el cielo antes de aplicar texturas
      await api?.clearFlags?.()
      setFlags({})
      setPotatoOn(false)
      setLowLatOn(false)
      await electronAPI.saveAppConfig({ potatoOn: false, lowLatOn: false })

      if (!potatoTexOn) {
        // Activar
        const r = await api?.applyPotatoTextures?.(texturePath)
        if (r?.success) {
          setPotatoTexOn(true)
          setDarkOn(false)
          await electronAPI.saveAppConfig({ potatoTexOn: true, darkOn: false })
          addMessage('success', 'Potato Textures activadas', 'Texturas potato aplicadas correctamente. Flags del cielo limpiadas.')
        } else {
          addMessage('error', 'Error en Potato Textures', r?.message || 'No se pudieron aplicar las texturas potato')
        }
      } else {
        // Desactivar - restaurar texturas originales
        const r = await electronAPI.restoreOriginal(texturePath)
        if (r?.success) {
          setPotatoTexOn(false)
          setDarkOn(false)
          await electronAPI.saveAppConfig({ potatoTexOn: false, darkOn: false })
          addMessage('success', 'Potato Textures desactivadas', 'Texturas originales restauradas correctamente')
        } else if (r?.message) {
          addMessage('error', 'Error en Potato Textures', r.message)
        }
      }
    } catch (e: any) {
      addMessage('error', 'Error en Potato Textures', e.message || 'Error desconocido al aplicar texturas')
    } finally { setApplyingTex(false) }
  }

  const handleApplyFont = async (f: FontEntry) => {
    setApplyingFont(f.file); setFontApplied(null)
    try {
      const r = await api?.applyFontPack?.(f.file)
      if (r?.success) { setActiveFont(f.file); setFontApplied(f.file); setTimeout(() => setFontApplied(null), 2500) }
      else { toast.error(r?.message || "No se pudo aplicar la fuente") }
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
      setPotatoOn(true)
      setDarkOn(false)
      await electronAPI.saveAppConfig({ potatoOn: true, darkOn: false })
    } finally { setApplyingPotato(false) }
  }

  const handleDisablePotato = async () => {
    setApplyingPotato(true)
    try {
      // Limpiar flags de potato
      await api?.clearFlags?.()
      setFlags({})
      setPotatoOn(false)
      setDarkOn(false)
      await electronAPI.saveAppConfig({ potatoOn: false, darkOn: false })
    } finally { setApplyingPotato(false) }
  }

  const handleLowLat = async () => {
    setApplyingLowLat(true)
    try {
      const next = !lowLatOn
      const newFlags = next
        ? { ...flags, ...LOW_LATENCY_FLAGS }
        : Object.fromEntries(Object.entries(flags).filter(([k]) => !LOW_LATENCY_FLAGS[k]))
      setFlags(newFlags); setLowLatOn(next)
      await api?.saveFlags?.(newFlags)
      await electronAPI.saveAppConfig({ lowLatOn: next })
    } finally { setApplyingLowLat(false) }
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

    profile: (
      <ProfileSection />
    ),

    inicio: (
      <div className="flex flex-col gap-4 h-full">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-[#AEAEAE]">Bienvenido a YUMMAN RIVALS</h2>
            <p className="text-xs text-[#B5BAC1] mt-0.5">Personaliza tu experiencia en Rivals</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: Settings, label: "Perfil", sub: "Ver tu información", tab: "profile" as Tab },
            { icon: Cloud, label: "Cielos", sub: "25+ skyboxes personalizados", tab: "sky" as Tab },
            { icon: Moon, label: "Texturas", sub: "Dark & Potato textures", tab: "textures" as Tab },
            { icon: Type, label: "Fuentes", sub: "Cambia la fuente del juego", tab: "fonts" as Tab },
            { icon: Zap, label: "Potato Mode", sub: "Máximo rendimiento", tab: "potato" as Tab },
            { icon: Flag, label: "Fast Flags", sub: "Editor de ClientAppSettings", tab: "flags" as Tab },
          ].map(item => {
            const Icon = item.icon
            return (
              <button key={item.tab} onClick={() => setTab(item.tab)}
                className="flex items-center gap-3 rounded-xl border border-[#2A2825] bg-[#111214] p-4 text-left transition-all hover:border-[#393A41] hover:bg-[#232328]">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[#1A1A1E]">
                  <Icon className="h-4 w-4 text-[#F2F3F5]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#AEAEAE]">{item.label}</p>
                  <p className="text-[11px] text-[#B5BAC1]">{item.sub}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    ),

    sky: (
      <div className="flex flex-col gap-4 h-full">
        <div>
          <h2 className="text-base font-semibold text-[#AEAEAE]">Cielos</h2>
          <p className="text-xs text-[#B5BAC1] mt-0.5">Selecciona un cielo para aplicar en Rivals</p>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="grid grid-cols-4 gap-2 pr-1">
            {skyboxes.map(s => (
              <button key={s.id} onClick={() => setSelectedSky(s.id)}
                className={`relative overflow-hidden rounded-xl border-2 transition-all hover:scale-[1.02] ${selectedSky === s.id ? "border-[#AEAEAE]" : "border-[#2A2825] hover:border-[#393A41]"}`}
                style={{ aspectRatio: "4/3" }}>
                <img src={s.image} alt={s.nameEn} className="h-full w-full object-cover" crossOrigin="anonymous" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-1.5 py-1">
                  <p className="text-center text-[10px] font-medium text-[#AEAEAE]">{s.name}</p>
                </div>
                {selectedSky === s.id && (
                  <div className="absolute top-1.5 right-1.5 rounded-full bg-[#F2F3F5] p-0.5">
                    <Check className="h-2.5 w-2.5 text-[#1A1A1E]" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={handleApplySky} disabled={!selectedSky || applyingSky}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#5865F2] py-2.5 text-sm font-semibold text-[#1A1A1E] transition-all hover:bg-[#4752C4] disabled:opacity-30">
            {applyingSky ? <Loader2 className="h-4 w-4 animate-spin" /> : skyApplied ? <Check className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {applyingSky ? "Aplicando..." : skyApplied ? "¡Aplicado!" : "Aplicar cielo"}
          </button>
          <button onClick={handleConvert} disabled={convertingSky}
            className="flex items-center gap-2 rounded-xl border border-[#2A2825] px-4 py-2.5 text-sm text-[#AEAEAE] hover:bg-[#111214] disabled:opacity-40">
            {convertingSky ? <Loader2 className="h-4 w-4 animate-spin" /> : <Image className="h-4 w-4" />}
            Desde imagen
          </button>
          {customReady && (
            <button onClick={handleApplyCustom} disabled={applyingCustom}
              className="flex items-center gap-2 rounded-xl border border-[#2A2825] px-4 py-2.5 text-sm text-[#AEAEAE] hover:bg-[#111214] disabled:opacity-40">
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
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-[#AEAEAE]">Texturas</h2>
            <p className="text-xs text-[#B5BAC1] mt-0.5">Modifica las texturas del juego</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0 space-y-1 pr-1">
          {[
            { label: "Dark Textures", sub: "Texturas oscuras para mejor visibilidad en combate", on: darkOn, fn: handleDark },
            { label: "Potato Textures", sub: "Studs planos ultra optimizados — requiere calidad gráfica 2", on: potatoTexOn, fn: handlePotatoTex },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between rounded-xl border px-4 py-3 transition-all border-[#2A2825] hover:border-[#393A41]">
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${item.on ? "bg-[#393A41]" : "bg-[#1A1A1E]"}`}>
                  <Moon className="h-4 w-4 text-[#F2F3F5]" />
                </div>
                <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                  <span className="text-[10px] text-[#555250]">Textura</span>
                  <span className="text-sm text-[#AEAEAE]">{item.label}</span>
                  <span className="text-xs text-[#888580]">{item.sub}</span>
                </div>
              </div>
              <button onClick={item.fn} disabled={applyingTex}
                className="ml-4 flex-shrink-0 rounded-lg border border-[#2A2825] bg-[#1A1A1E] px-3 py-1.5 text-xs font-medium text-[#AEAEAE] hover:bg-[#111214] hover:border-[#393A41] disabled:opacity-40 transition-all">
                {applyingTex ? <Loader2 className="h-3 w-3 animate-spin" /> : item.on ? <Check className="h-3 w-3" /> : item.on ? "Desactivar" : "Activar"}
              </button>
            </div>
          ))}
        </div>
      </div>
    ),

    fonts: (
      <div className="flex flex-col gap-4 h-full">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-[#AEAEAE]">Fuentes</h2>
            <p className="text-xs text-[#B5BAC1] mt-0.5">Cambia la fuente del juego</p>
          </div>
          <button onClick={handleImportFont}
            className="flex items-center gap-2 rounded-lg border border-[#2A2825] bg-[#111214] px-3 py-2 text-xs text-[#AEAEAE] hover:bg-[#2A2825] hover:border-[#393A41] transition-all">
            <Upload className="h-3.5 w-3.5" />Importar fuente
          </button>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0 space-y-1 pr-1">
          {filteredFonts.length === 0 ? (
            <p className="text-center text-sm text-[#555250] py-8">No hay fuentes disponibles</p>
          ) : filteredFonts.map(f => (
            <div key={f.file}
              className={`flex items-center justify-between rounded-xl border px-4 py-3 transition-all ${activeFont === f.file ? "border-[#393A41] bg-[#111214]" : "border-[#2A2825] hover:border-[#393A41]"}`}>
              <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                <span className="text-[10px] text-[#555250]">{f.name}</span>
                <span className="text-sm text-[#AEAEAE]" style={{ fontFamily: `"${f.name}", sans-serif` }}>
                  Probar fuente — YUMMAN RIVALS
                </span>
              </div>
              <button onClick={() => handleApplyFont(f)} disabled={!!applyingFont}
                className="ml-4 flex-shrink-0 rounded-lg border border-[#2A2825] bg-[#1A1A1E] px-3 py-1.5 text-xs font-medium text-[#AEAEAE] hover:bg-[#111214] hover:border-[#393A41] disabled:opacity-40 transition-all">
                {applyingFont === f.file ? <Loader2 className="h-3 w-3 animate-spin" /> : fontApplied === f.file ? <Check className="h-3 w-3" /> : "Aplicar"}
              </button>
            </div>
          ))}
        </div>
        <button onClick={handleRestoreFonts}
          className="flex items-center justify-center gap-2 rounded-xl border border-[#2A2825] py-2.5 text-xs text-[#B5BAC1] hover:text-[#AEAEAE] hover:border-[#393A41] transition-all">
          <RotateCcw className="h-3.5 w-3.5" />Restaurar fuentes originales
        </button>
      </div>
    ),

    potato: (
      <div className="flex flex-col gap-4 h-full">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-[#AEAEAE]">Potato Mode</h2>
            <p className="text-xs text-[#B5BAC1] mt-0.5">Máximo rendimiento</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0 space-y-1 pr-1">
          <div className="flex items-center justify-between rounded-xl border px-4 py-3 transition-all border-[#2A2825] hover:border-[#393A41]">
            <div className="flex items-center gap-4 min-w-0 flex-1">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[#1A1A1E]">
                <Zap className="h-4 w-4 text-[#F2F3F5]" />
              </div>
              <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                <span className="text-[10px] text-[#555250]">Optimización</span>
                <span className="text-sm text-[#AEAEAE]">Potato Mode</span>
                <span className="text-xs text-[#888580]">~30 flags de rendimiento, texturas potato, cielo gris</span>
              </div>
            </div>
            <button onClick={potatoOn ? handleDisablePotato : handlePotato} disabled={applyingPotato}
              className="ml-4 flex-shrink-0 rounded-lg border border-[#2A2825] bg-[#1A1A1E] px-3 py-1.5 text-xs font-medium text-[#AEAEAE] hover:bg-[#111214] hover:border-[#393A41] disabled:opacity-40 transition-all">
              {applyingPotato ? <Loader2 className="h-3 w-3 animate-spin" /> : potatoOn ? <Check className="h-3 w-3" /> : potatoOn ? "Desactivar" : "Activar"}
            </button>
          </div>

          <div className="flex items-center justify-between rounded-xl border px-4 py-3 transition-all border-[#2A2825] hover:border-[#393A41]">
            <div className="flex items-center gap-4 min-w-0 flex-1">
              <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${lowLatOn ? "bg-[#393A41]" : "bg-[#1A1A1E]"}`}>
                <Flag className="h-4 w-4 text-[#F2F3F5]" />
              </div>
              <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                <span className="text-[10px] text-[#555250]">Rendimiento</span>
                <span className="text-sm text-[#AEAEAE]">Low Latency</span>
                <span className="text-xs text-[#888580]">Reduce input lag</span>
              </div>
            </div>
            <button onClick={handleLowLat} disabled={applyingLowLat}
              className="ml-4 flex-shrink-0 rounded-lg border border-[#2A2825] bg-[#1A1A1E] px-3 py-1.5 text-xs font-medium text-[#AEAEAE] hover:bg-[#111214] hover:border-[#393A41] disabled:opacity-40 transition-all">
              {applyingLowLat ? <Loader2 className="h-3 w-3 animate-spin" /> : lowLatOn ? <Check className="h-3 w-3" /> : lowLatOn ? "Desactivar" : "Activar"}
            </button>
          </div>
        </div>
      </div>
    ),

    flags: (
      <div className="flex flex-col gap-3 h-full">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-[#AEAEAE]">Editor de Fast Flags</h2>
            <p className="text-xs text-[#B5BAC1] mt-0.5">Gestiona tus Fast Flags. Edita ClientAppSettings.json.</p>
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
            className="flex items-center gap-2 rounded-lg border border-[#2A2825] bg-[#111214] px-3 py-2 text-xs text-[#AEAEAE] hover:bg-[#2A2825] hover:border-[#393A41] transition-all">
            <Plus className="h-3.5 w-3.5" />Agregar nuevo
          </button>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#555250]" />
            <input value={flagSearch} onChange={e => setFlagSearch(e.target.value)}
              placeholder="Buscar..."
              className="w-full rounded-lg border border-[#2A2825] bg-[#111214] pl-9 pr-3 py-2 text-xs text-[#AEAEAE] placeholder:text-[#555250] focus:outline-none focus:border-[#393A41]" />
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
            <div key={k} className="flex items-center gap-2 rounded-lg border border-[#2A2825] bg-[#111214]/50 px-3 py-2">
              <span className="flex-1 truncate text-[11px] text-[#AEAEAE] font-mono">{k}</span>
              <span className="text-[11px] text-[#B5BAC1] font-mono w-28 text-right truncate">{v}</span>
              <button onClick={() => removeFlag(k)} className="text-[#444240] hover:text-[#AEAEAE] transition-colors w-6 flex justify-center">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Save / Clear */}
        <div className="flex gap-2">
          <button onClick={saveFlags} disabled={savingFlags}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#E6E6E6] py-2.5 text-sm font-semibold text-[#1A1A1E] hover:bg-[#4752C4] disabled:opacity-40 transition-all">
            {savingFlags ? <Loader2 className="h-4 w-4 animate-spin text-[#1A1A1E]" /> : flagsSaved ? <Check className="h-4 w-4" /> : null}
            {flagsSaved ? "¡Guardado!" : "Guardar Flags"}
          </button>
          <button onClick={clearFlags}
            className="rounded-xl border border-[#2A2825] px-4 text-[#555250] hover:text-[#AEAEAE] hover:border-[#393A41] transition-all">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        {/* Modal */}
        {showFlagModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="w-[420px] rounded-2xl border border-[#2A2825] bg-[#1A1A1E] shadow-2xl overflow-hidden">
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
                    className={`flex-1 py-3 text-sm font-medium transition-all ${flagModalTab === t ? "bg-[#111214] text-[#AEAEAE]" : "text-[#B5BAC1] hover:text-[#AEAEAE]"}`}>
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
                        className="rounded-lg border border-[#2A2825] bg-[#111214] px-3 py-2.5 text-sm text-[#AEAEAE] placeholder:text-[#555250] focus:outline-none focus:border-[#393A41] font-mono" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-[#888580]">Valor</label>
                      <input value={modalFlagVal} onChange={e => setModalFlagVal(e.target.value)}
                        placeholder="True"
                        className="rounded-lg border border-[#2A2825] bg-[#111214] px-3 py-2.5 text-sm text-[#AEAEAE] placeholder:text-[#555250] focus:outline-none focus:border-[#393A41] font-mono" />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-[#888580]">Pega tu JSON aquí</label>
                    <textarea value={modalJsonText} onChange={e => setModalJsonText(e.target.value)}
                      placeholder={'{\n  "FFlagExample": "True"\n}'}
                      rows={6}
                      className="rounded-lg border border-[#2A2825] bg-[#111214] px-3 py-2.5 text-xs text-[#AEAEAE] placeholder:text-[#555250] focus:outline-none focus:border-[#393A41] font-mono resize-none" />
                  </div>
                )}
                {modalError && <p className="mt-2 text-xs text-red-400">{modalError}</p>}
              </div>

              {/* Modal footer */}
              <div className="flex gap-3 border-t border-[#2A2825] px-5 py-4">
                <button onClick={confirmFlagModal}
                  className="flex-1 rounded-xl bg-[#E6E6E6] py-2.5 text-sm font-semibold text-[#1A1A1E] hover:bg-[#4752C4] transition-all">
                  OK
                </button>
                <button onClick={() => setShowFlagModal(false)}
                  className="flex-1 rounded-xl border border-[#2A2825] py-2.5 text-sm text-[#AEAEAE] hover:bg-[#111214] transition-all">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    ),

    donar: (
      <div className="flex flex-col gap-4 h-full">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-[#AEAEAE]">Donar</h2>
            <p className="text-xs text-[#B5BAC1] mt-0.5">Apoya el desarrollo de YUMMAN RIVALS</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0 pr-1">
          <div className="w-full p-4 rounded-xl border border-[#2A2825] bg-[#111214]">
            <p className="text-sm font-semibold text-[#AEAEAE] mb-2">Método de pago</p>
            <p className="text-[10px] text-[#888580] mb-4">Selecciona cómo quieres donar</p>
            
            <div className="flex flex-col gap-2">
              {/* PayPal */}
              <label
                className={`inline-flex justify-between w-full items-center rounded-lg p-3 border transition-all cursor-pointer relative overflow-hidden ${
                  selectedPayment === "paypal"
                    ? "border-[#4752C4] bg-[#4752C4]/10"
                    : "border-[#2A2825] bg-[#1A1A1E] hover:bg-[#232328]"
                }`}
              >
                <div className="inline-flex items-center justify-center gap-3 relative z-10">
                  <svg
                    fill="currentColor"
                    height="24"
                    width="24"
                    viewBox="0 0 576 512"
                    xmlns="http://www.w3.org/2000/svg"
                    className="text-[#F2F3F5]"
                  >
                    <path d="M186.3 258.2c0 12.2-9.7 21.5-22 21.5-9.2 0-16-5.2-16-15 0-12.2 9.5-22 21.7-22 9.3 0 16.3 5.7 16.3 15.5zM80.5 209.7h-4.7c-1.5 0-3 1-3.2 2.7l-4.3 26.7 8.2-.3c11 0 19.5-1.5 21.5-14.2 2.3-13.4-6.2-14.9-17.5-14.9zm284 0H360c-1.8 0-3 1-3.2 2.7l-4.2 26.7 8-.3c13 0 22-3 22-18-.1-10.6-9.6-11.1-18.1-11.1zM576 80v352c0 26.5-21.5 48-48 48H48c-26.5 0-48-21.5-48-48V80c0-26.5 21.5-48 48-48h480c26.5 0 48 21.5 48 48zM128.3 215.4c0-21-16.2-28-34.7-28h-40c-2.5 0-5 2-5.2 4.7L32 294.2c-.3 2 1.2 4 3.2 4h19c2.7 0 5.2-2.9 5.5-5.7l4.5-26.6c1-7.2 13.2-4.7 18-4.7 28.6 0 46.1-17 46.1-45.8zm84.2 8.8h-19c-3.8 0-4 5.5-4.2 8.2-5.8-8.5-14.2-10-23.7-10-24.5 0-43.2 21.5-43.2 45.2 0 19.5 12.2 32.2 31.7 32.2 9 0 20.2-4.9 26.5-11.9-.5 1.5-1 4.7-1 6.2 0 2.3 1 4 3.2 4H200c2.7 0 5-2.9 5.5-5.7l10.2-64.3c.3-1.9-1.2-3.9-3.2-3.9zm40.5 97.9l63.7-92.6c.5-.5.5-1 .5-1.7 0-1.7-1.5-3.5-3.2-3.5h-19.2c-1.7 0-3.5 1-4.5 2.5l-26.5 39-11-37.5c-.8-2.2-3-4-5.5-4h-18.7c-1.7 0-3.2 1.8-3.2 3.5 0 1.2 19.5 56.8 21.2 62.1-2.7 3.8-20.5 28.6-20.5 31.6 0 1.8 1.5 3.2 3.2 3.2h19.2c1.8-.1 3.5-1.1 4.5-2.6zm159.3-106.7c0-21-16.2-28-34.7-28h-39.7c-2.7 0-5.2 2-5.5 4.7l-16.2 102c-.2 2 1.3 4 3.2 4h20.5c2 0 3.5-1.5 4-3.2l4.5-29c1-7.2 13.2-4.7 18-4.7 28.4 0 45.9-17 45.9-45.8zm84.2 8.8h-19c-3.8 0-4 5.5-4.3 8.2-5.5-8.5-14-10-23.7-10-24.5 0-43.2 21.5-43.2 45.2 0 19.5 12.2 32.2 31.7 32.2 9.3 0 20.5-4.9 26.5-11.9-.3 1.5-1 4.7-1 6.2 0 2.3 1 4 3.2 4H484c2.7 0 5-2.9 5.5-5.7l10.2-64.3c.3-1.9-1.2-3.9-3.2-3.9zm47.5-33.3c0-2-1.5-3.5-3.2-3.5h-18.5c-1.5 0-3 1.2-3.2 2.7l-16.2 104-.3.5c0 1.8 1.5 3.5 3.5 3.5h16.5c2.5 0 5-2.9 5.2-5.7L544 191.2v-.3zm-90 51.8c-12.2 0-21.7 9.7-21.7 22 0 9.7 7 15 16.2 15 12 0 21.7-9.2 21.7-21.5.1-9.8-6.9-15.5-16.2-15.5z"></path>
                  </svg>
                  <p className="text-sm font-semibold text-[#AEAEAE]">PayPal</p>
                </div>
                <input
                  className="sr-only"
                  value="paypal"
                  name="payment"
                  type="radio"
                  checked={selectedPayment === "paypal"}
                  onChange={(e) => {
                    setSelectedPayment(e.target.value)
                    window.open("https://www.paypal.com/paypalme/MiguelBird", "_blank")
                  }}
                />
              </label>

              {/* Roblox */}
              <label
                className={`inline-flex justify-between w-full items-center rounded-lg p-3 border transition-all cursor-pointer relative overflow-hidden ${
                  selectedPayment === "roblox"
                    ? "border-[#4752C4] bg-[#4752C4]/10"
                    : "border-[#2A2825] bg-[#1A1A1E] hover:bg-[#232328]"
                }`}
              >
                <div className="inline-flex items-center justify-center gap-3 relative z-10">
                  <img
                    src="https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Roblox_%282025%29_%28App_Icon%29.svg/500px-Roblox_%282025%29_%28App_Icon%29.svg.png"
                    alt="Roblox"
                    className="h-6 w-6 object-contain"
                    crossOrigin="anonymous"
                  />
                  <p className="text-sm font-semibold text-[#AEAEAE]">Roblox</p>
                </div>
                <input
                  className="sr-only"
                  value="roblox"
                  name="payment"
                  type="radio"
                  checked={selectedPayment === "roblox"}
                  onChange={(e) => {
                    setSelectedPayment(e.target.value)
                    window.open("https://www.roblox.com/es/users/4018950771/profile", "_blank")
                  }}
                />
              </label>
            </div>
          </div>
        </div>
      </div>
    ),
  }

  return (
    <div className="flex h-screen w-screen bg-transparent select-none overflow-hidden"
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
            <span style={{ color: "#B5BAC1", fontSize: 11, fontWeight: 600 }}>Volver</span>
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
          <p style={{ color: "#B5BAC1", fontSize: 10 }}>v{appVersion} · YUMMAN</p>
        </div>
      </motion.nav>

      {/* Main content */}
      <main className="flex flex-1 flex-col overflow-hidden relative">
        {/* Messages */}
        <div className="absolute top-4 right-4 z-50 flex flex-col gap-2">
          <AnimatePresence>
            {messages.map(msg => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 50 }}
                transition={{ duration: 0.2 }}
              >
                {msg.type === 'error' ? (
                  <div className="flex flex-col gap-2 w-72 sm:w-80 text-[10px] sm:text-xs z-50">
                    <div className="error-alert cursor-default flex items-start justify-between w-full min-h-12 sm:min-h-14 rounded-lg bg-[#232531] px-[10px] py-3">
                      <div className="flex gap-2 flex-1 min-w-0">
                        <div className="text-[#d65563] bg-white/5 backdrop-blur-xl p-1 rounded-lg flex-shrink-0">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"></path>
                          </svg>
                        </div>
                        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                          <p className="text-white font-medium truncate">{msg.title}</p>
                          <p className="text-gray-500 break-words whitespace-normal">{msg.description}</p>
                        </div>
                      </div>
                      <button onClick={() => removeMessage(msg.id)} className="text-gray-600 hover:bg-white/10 p-1 rounded-md transition-colors ease-linear flex-shrink-0 ml-2">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12"></path>
                        </svg>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 w-72 sm:w-80 text-[10px] sm:text-xs z-50">
                    <div className="success-alert cursor-default flex items-start justify-between w-full min-h-12 sm:min-h-14 rounded-lg bg-[#232531] px-[10px] py-3">
                      <div className="flex gap-2 flex-1 min-w-0">
                        <div className="text-[#22c55e] bg-white/5 backdrop-blur-xl p-1 rounded-lg flex-shrink-0">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"></path>
                          </svg>
                        </div>
                        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                          <p className="text-white font-medium truncate">{msg.title}</p>
                          <p className="text-gray-500 break-words whitespace-normal">{msg.description}</p>
                        </div>
                      </div>
                      <button onClick={() => removeMessage(msg.id)} className="text-gray-600 hover:bg-white/10 p-1 rounded-md transition-colors ease-linear flex-shrink-0 ml-2">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12"></path>
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

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
