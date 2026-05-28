"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import {
  Cloud, Moon, Heart, HelpCircle, Settings,
  Check, ExternalLink, Play, Globe, User,
} from "lucide-react"
import type { OnboardingSettings } from "./onboarding"
import { skyboxes } from "@/lib/skyboxes"
import { electronAPI } from "@/lib/electron-api"
import { ProfileSection } from "./profile-section"

interface DashboardProps {
  initialSettings: OnboardingSettings
}

const skies = skyboxes

// as const + tipo derivado — evita string genérico en activeTab
const tabs = [
  { id: "skies",    icon: Cloud,      labelEs: "Cielos",        labelEn: "Skies"         },
  { id: "textures", icon: Moon,       labelEs: "Textura Negra", labelEn: "Black Texture" },
  { id: "donate",   icon: Heart,      labelEs: "Donar",         labelEn: "Donate"        },
  { id: "help",     icon: HelpCircle, labelEs: "Help",          labelEn: "Help"          },
  { id: "settings", icon: Settings,   labelEs: "Configuración", labelEn: "Settings"      },
] as const

type DashboardTab = typeof tabs[number]["id"]

const translations = {
  es: {
    selectSky: "Selecciona un cielo para aplicar",
    applySky: "Aplicar Cielo", skyApplied: "Cielo aplicado",
    activateBlack: "Activar Arena Negra",
    blackTextureDesc: "Aplica texturas oscuras para mejorar la visibilidad del juego",
    textureActive: "Textura activa", textureInactive: "Textura inactiva",
    supportUs: "Apoya el proyecto",
    donateRoblox: "Donar en Roblox", donateRobloxDesc: "Visita mi perfil y apóyame",
    donatePaypal: "Donar por PayPal", donatePaypalDesc: "$5 USD",
    needHelp: "¿Necesitas ayuda?",
    joinDiscord: "Únete a nuestro Discord si tienes dudas",
    joinButton: "Unirse al Discord",
    settingsTitle: "Configuración", language: "Idioma", theme: "Tema",
    darkMode: "Modo Oscuro", lightModeDisabled: "Modo Claro (Deshabilitado)",
    versionPrefix: "YUMMAN RIVALS v",
    restoreOriginal: "Restaurar Texturas Originales",
    restoreDesc: "Quita arena negra y cielo personalizado",
    restoring: "Restaurando...", restored: "Restaurado",
  },
  en: {
    selectSky: "Select a sky to apply",
    applySky: "Apply Sky", skyApplied: "Sky applied",
    activateBlack: "Activate Black Arena",
    blackTextureDesc: "Apply dark textures to improve game visibility",
    textureActive: "Texture active", textureInactive: "Texture inactive",
    supportUs: "Support the project",
    donateRoblox: "Donate on Roblox", donateRobloxDesc: "Visit my profile and support me",
    donatePaypal: "Donate via PayPal", donatePaypalDesc: "$5 USD",
    needHelp: "Need help?",
    joinDiscord: "Join our Discord if you have questions",
    joinButton: "Join Discord",
    settingsTitle: "Settings", language: "Language", theme: "Theme",
    darkMode: "Dark Mode", lightModeDisabled: "Light Mode (Disabled)",
    versionPrefix: "YUMMAN RIVALS v",
    restoreOriginal: "Restore Original Textures",
    restoreDesc: "Remove black arena and custom sky",
    restoring: "Restoring...", restored: "Restored",
  },
}

export function Dashboard({ initialSettings }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<DashboardTab>("skies")
  const [language, setLanguage] = useState(initialSettings.language)
  const [selectedSky, setSelectedSky] = useState<string | null>(initialSettings.selectedSky)
  const [blackTextureActive, setBlackTextureActive] = useState(initialSettings.darkTextures)
  const [skyApplied, setSkyApplied] = useState(false)
  const [texturePath, setTexturePath] = useState("")
  const [isApplying, setIsApplying] = useState(false)
  const [executorInfo, setExecutorInfo] = useState("")
  const [isRestoring, setIsRestoring] = useState(false)
  const [restored, setRestored] = useState(false)
  const [appVersion, setAppVersion] = useState("—")

  // Ref para el scroll del carrusel — evita querySelector genérico
  const skyScrollRef = useRef<HTMLDivElement>(null)

  const t = translations[language]

  useEffect(() => {
    async function loadPaths() {
      const result = await electronAPI.getExecutorTexturePath(
        initialSettings.executor || 'yumman',
        initialSettings.customExecutorPath || undefined
      )
      if (result.valid) {
        setTexturePath(result.texturePath)
        setExecutorInfo(`${result.executor} - ${result.version}`)
      } else {
        // Fallback a YUMMAN RIVALS por defecto
        const result = await electronAPI.getExecutorTexturePath('yumman')
        if (result.valid) {
          setTexturePath(result.texturePath)
          setExecutorInfo(`${result.executor} - ${result.version}`)
        }
      }
    }
    loadPaths()
  }, [initialSettings.executor, initialSettings.customExecutorPath])

  useEffect(() => {
    electronAPI.getAppVersion().then(v => { if (v) setAppVersion(v) })
  }, [])

  const handleApplySky = async () => {
    if (!selectedSky || isApplying) return
    setIsApplying(true); setSkyApplied(false)
    try {
      const result = await electronAPI.applySky(selectedSky, texturePath)
      if (result?.success) {
        setSkyApplied(true)
        setTimeout(() => setSkyApplied(false), 2000)
      } else {
        toast.error(`Error: ${result?.message || 'No se pudo aplicar el cielo'}`)
      }
    } catch (e) {
      toast.error(`Error: ${e}`)
    } finally {
      setTimeout(() => setIsApplying(false), 100)
    }
  }

  const handleToggleTexture = async () => {
    setIsApplying(true)
    try {
      const result = await electronAPI.applyDarkTextures(!blackTextureActive, texturePath)
      if (result.success) setBlackTextureActive(v => !v)
    } catch (e) {
      console.error(e)
    } finally {
      setIsApplying(false)
    }
  }

  const openExternal = (url: string) => electronAPI.openExternal(url)

  const handleRestoreOriginal = async () => {
    if (isRestoring) return
    setIsRestoring(true); setRestored(false)
    try {
      const result = await electronAPI.restoreOriginal(texturePath)
      if (result?.success) {
        setRestored(true); setBlackTextureActive(false); setSelectedSky(null)
        setTimeout(() => setRestored(false), 3000)
      } else {
        toast.error(`Error: ${result?.message || 'No se pudo restaurar'}`)
      }
    } catch (e) {
      toast.error(`Error: ${e}`)
    } finally {
      setTimeout(() => setIsRestoring(false), 100)
    }
  }

  const tabContent: Record<DashboardTab, React.ReactNode> = {
    skies: (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
        <p className="text-center text-xl font-medium text-white">{t.selectSky}</p>
        <div className="relative">
          {/* Ref en el contenedor — evita querySelector genérico */}
          <div ref={skyScrollRef} className="flex gap-8 overflow-x-auto pb-6 px-16 scrollbar-hide snap-x snap-mandatory">
            {skies.map(sky => (
              <button key={sky.id} onClick={() => setSelectedSky(sky.id)}
                className={`group relative flex-shrink-0 snap-center overflow-hidden rounded-2xl border-4 transition-all ${
                  selectedSky === sky.id ? "border-white scale-110 shadow-2xl" : "border-border hover:border-white/50 hover:scale-105"
                }`}
                style={{ width: 320, height: 240 }}>
                <img src={sky.image} alt={language === "es" ? sky.name : sky.nameEn} className="h-full w-full object-cover" crossOrigin="anonymous" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-5">
                  <p className="text-center text-lg font-bold text-white">{language === "es" ? sky.name : sky.nameEn}</p>
                </div>
                {selectedSky === sky.id && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/10">
                    <div className="rounded-full bg-white p-4"><Check className="h-10 w-10 text-black" /></div>
                  </div>
                )}
              </button>
            ))}
          </div>
          <button onClick={() => skyScrollRef.current?.scrollBy({ left: -340, behavior: 'smooth' })}
            className="absolute left-0 top-1/2 -translate-y-1/2 rounded-full bg-muted/80 p-4 backdrop-blur-sm transition-all hover:bg-white hover:text-black">
            <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button onClick={() => skyScrollRef.current?.scrollBy({ left: 340, behavior: 'smooth' })}
            className="absolute right-0 top-1/2 -translate-y-1/2 rounded-full bg-muted/80 p-4 backdrop-blur-sm transition-all hover:bg-white hover:text-black">
            <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        <div className="flex justify-center pt-4">
          <button onClick={handleApplySky} disabled={!selectedSky || isApplying}
            className="btn-gray inline-flex items-center justify-center gap-3 rounded-xl px-10 py-5 text-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed">
            {skyApplied ? <><Check className="h-7 w-7" />{t.skyApplied}</> : <><Play className="h-7 w-7 text-icon" />{t.applySky}</>}
          </button>
        </div>
      </motion.div>
    ),

    textures: (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
        className="flex flex-col items-center justify-center space-y-8">
        <button onClick={handleToggleTexture}
          className={`group relative mb-4 overflow-hidden rounded-3xl border-4 p-12 transition-all hover:border-button-hover ${
            blackTextureActive ? "border-white bg-muted" : "border-border bg-card hover:bg-muted"
          }`}>
          <Moon className={`relative mx-auto h-24 w-24 transition-colors ${blackTextureActive ? "text-white" : "text-icon"}`} />
          <h3 className="relative mt-6 text-2xl font-bold text-white">{t.activateBlack}</h3>
          <p className="relative mt-3 max-w-md text-base text-muted-foreground">{t.blackTextureDesc}</p>
        </button>
        <div className={`inline-flex items-center gap-3 rounded-full px-6 py-3 text-base font-medium ${
          blackTextureActive ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"
        }`}>
          <span className={`h-3 w-3 rounded-full ${blackTextureActive ? "bg-success" : "bg-muted-foreground"}`} />
          {blackTextureActive ? t.textureActive : t.textureInactive}
        </div>
      </motion.div>
    ),

    donate: (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
        <h3 className="text-center text-2xl font-bold text-white">{t.supportUs}</h3>
        <div className="grid gap-6 sm:grid-cols-2 max-w-3xl mx-auto">
          <button onClick={() => openExternal("https://www.roblox.com/es/users/4018950771/profile")}
            className="card-glass flex flex-col items-center gap-4 p-10 transition-all hover:bg-button-hover">
            <img src="https://tr.rbxcdn.com/30DAY-AvatarHeadshot-695CED98FDC232201477E9A144B99CE4-Png/150/150/AvatarHeadshot/Webp/noFilter"
              alt="Perfil de Roblox" className="h-28 w-28 rounded-full object-cover border-4 border-white" crossOrigin="anonymous" />
            <div className="text-center">
              <p className="font-semibold text-white text-xl">{t.donateRoblox}</p>
              <p className="text-base text-muted-foreground mt-2">{t.donateRobloxDesc}</p>
            </div>
          </button>
          <button onClick={() => openExternal("https://www.paypal.com/paypalme/miguelbird/5")}
            className="card-glass flex flex-col items-center gap-4 p-10 transition-all hover:bg-button-hover">
            <Heart className="h-28 w-28 text-[#00457C]" />
            <div className="text-center">
              <p className="font-semibold text-white text-xl">{t.donatePaypal}</p>
              <p className="text-base text-muted-foreground mt-2">{t.donatePaypalDesc}</p>
            </div>
          </button>
        </div>
      </motion.div>
    ),

    help: (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
        className="flex flex-col items-center justify-center text-center space-y-6">
        <HelpCircle className="h-20 w-20 text-[#5865F2]" />
        <h3 className="text-2xl font-bold text-white">{t.needHelp}</h3>
        <p className="text-lg text-muted-foreground max-w-md">{t.joinDiscord}</p>
        <button onClick={() => openExternal("https://discord.com/invite/EVWqd5swAt")}
          className="inline-flex items-center gap-3 rounded-xl bg-[#5865F2] px-8 py-4 text-lg font-semibold text-white transition-all hover:bg-[#4752C4]">
          <ExternalLink className="h-6 w-6" />{t.joinButton}
        </button>
      </motion.div>
    ),

    settings: (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
        className="space-y-8 max-w-2xl mx-auto">
        <ProfileSection />
        <h3 className="text-2xl font-bold text-white text-center">{t.settingsTitle}</h3>
        <div className="space-y-5">
          <div className="card-glass flex items-center justify-between p-6">
            <div className="flex items-center gap-4">
              <Globe className="h-6 w-6 text-icon" />
              <span className="font-medium text-white text-lg">{t.language}</span>
            </div>
            <div className="flex gap-3">
              {(["es", "en"] as const).map(l => (
                <button key={l} onClick={() => setLanguage(l)}
                  className={`rounded-lg px-5 py-2 text-base font-medium transition-all ${
                    language === l ? "bg-white text-black" : "bg-muted text-white hover:bg-button-hover"
                  }`}>{l.toUpperCase()}</button>
              ))}
            </div>
          </div>
          <div className="card-glass flex items-center justify-between p-6 opacity-50">
            <div className="flex items-center gap-4">
              <Moon className="h-6 w-6 text-icon" />
              <span className="font-medium text-white text-lg">{t.theme}</span>
            </div>
            <span className="rounded-lg bg-white px-5 py-2 text-base font-medium text-black">{t.darkMode}</span>
          </div>
          <p className="text-center text-sm text-muted-foreground">{t.lightModeDisabled}</p>
          <div className="card-glass p-6 mt-6">
            <button onClick={handleRestoreOriginal} disabled={isRestoring}
              className="w-full flex flex-col items-center gap-4 p-6 rounded-xl bg-destructive/10 hover:bg-destructive/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
              <div className="flex items-center gap-3">
                <svg className="h-8 w-8 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="text-xl font-bold text-white">
                  {restored ? t.restored : isRestoring ? t.restoring : t.restoreOriginal}
                </span>
              </div>
              <p className="text-sm text-muted-foreground text-center">{t.restoreDesc}</p>
            </button>
          </div>
        </div>
      </motion.div>
    ),
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-center relative">
          <div className="flex items-center gap-3">
            <img src="https://static.wikia.nocookie.net/logopedia/images/5/51/RivalsLogo.png/revision/latest?cb=20260110001756"
              alt="Rivals Logo" className="h-10 w-10 object-contain" crossOrigin="anonymous" />
            <h1 className="text-xl font-bold text-white">YUMMAN RIVALS</h1>
          </div>
          <div className="absolute right-0 flex flex-col items-end gap-1">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-success" />
              <span className="text-sm text-muted-foreground">{language === "es" ? "Conectado" : "Connected"}</span>
            </div>
            {executorInfo && <span className="text-xs text-muted-foreground">{executorInfo}</span>}
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        <nav className="w-64 border-r border-border p-4">
          <div className="space-y-1">
            {tabs.map(tab => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left font-medium transition-all ${
                    isActive ? "bg-muted text-white" : "text-muted-foreground hover:bg-muted hover:text-white"
                  }`}>
                  <Icon className={`h-5 w-5 ${isActive ? "text-white" : "text-icon"}`} />
                  {language === "es" ? tab.labelEs : tab.labelEn}
                </button>
              )
            })}
          </div>
        </nav>
        <main className="flex flex-1 items-center justify-center p-6">
          <div className="w-full max-w-6xl">
            <AnimatePresence mode="wait">
              {tabContent[activeTab]}
            </AnimatePresence>
          </div>
        </main>
      </div>

      <footer className="border-t border-border px-6 py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-center">
          <span className="text-xs text-muted-foreground">{t.versionPrefix}{appVersion}</span>
        </div>
      </footer>
    </div>
  )
}
