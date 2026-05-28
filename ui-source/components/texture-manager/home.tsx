"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Settings, Loader2, Check, X, ChevronRight, ArrowRight } from "lucide-react"
import { electronAPI } from "@/lib/electron-api"

type LaunchState = "idle" | "launching" | "done" | "error"
interface HomeViewProps { onSettings: () => void; onStartOnboarding: () => void }

const AVATAR       = "https://tr.rbxcdn.com/30DAY-AvatarHeadshot-695CED98FDC232201477E9A144B99CE4-Png/150/150/AvatarHeadshot/Webp/noFilter"
const ROBLOX_ICON  = "https://static.wikia.nocookie.net/logopedia/images/d/da/Roblox_2018_O_Icon_final_-_Gray.svg/revision/latest/scale-to-width-down/250?cb=20190809191156"
const DISCORD_ICON = "https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/discord-white-icon.png"

export function HomeView({ onSettings, onStartOnboarding }: HomeViewProps) {
  const [launchState, setLaunchState] = useState<LaunchState>("idle")
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false)
  const [updateMessage, setUpdateMessage] = useState<string | null>(null)
  const [version, setVersion]         = useState("—")
  const [discordInfo, setDiscordInfo] = useState({ name: "User", username: "@username", connections: "500+ Connections" })

  useEffect(() => {
    electronAPI.getAppVersion().then(v => { if (v) setVersion(v) })
    setTimeout(() => { void electronAPI.checkForUpdates() }, 3000)

    // Cargar información del usuario para Discord
    electronAPI.loadAppConfig().then(config => {
      if (config?.config) {
        const username = config.config.robloxUsername || "User"
        const displayName = config.config.displayName || username
        setDiscordInfo({
          name: displayName,
          username: `@${username}`,
          connections: "500+ Connections"
        })
      }
    })

    // Prevenir scroll con rueda del ratón
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
    }

    window.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      window.removeEventListener('wheel', handleWheel)
    }

    // Escuchar mensajes del updater
    let removeListener: (() => void) | null = null
    if (typeof window !== 'undefined' && window.electronAPI?.onUpdateStatus) {
      removeListener = window.electronAPI.onUpdateStatus((data: { message: string; progress?: number }) => {
        setUpdateMessage(data.message)
        setTimeout(() => setUpdateMessage(null), 5000)
      })
    }

    return () => {
      // Cleanup: remover listener cuando el componente se desmonte
      if (removeListener) removeListener()
    }
  }, [])

  const ext = (url: string) => window.open(url, "_blank", "noopener,noreferrer")

  const handleLaunch = async () => {
    if (launchState !== "idle") return
    setLaunchState("launching")
    try {
      const r = await electronAPI.launchRoblox("yumman")
      setLaunchState(r?.success ? "done" : "error")
      setTimeout(() => setLaunchState("idle"), 3000)
    } catch {
      setLaunchState("error")
      setTimeout(() => setLaunchState("idle"), 3000)
    }
  }

  const handleCheckUpdate = async () => {
    if (isCheckingUpdate) return
    setIsCheckingUpdate(true)
    setUpdateMessage(null)
    try {
      // 1. Verificar actualizaciones de la app
      await electronAPI.checkForUpdates()
      
      // 2. Verificar recursos
      const resourcesResult = await electronAPI.checkAndUpdateResources()
      
      if (resourcesResult?.needsDownload) {
        // Si necesita descargar recursos, hacerlo
        setUpdateMessage("Descargando recursos...")
        const downloadResult = await electronAPI.forceDownloadResources()
        
        if (downloadResult?.success) {
          setUpdateMessage("✓ Recursos actualizados")
        } else {
          setUpdateMessage("✗ Error descargando recursos")
        }
      } else {
        setUpdateMessage("✓ Recursos actualizados")
      }
    } catch (error) {
      setUpdateMessage("✗ Error verificando actualizaciones")
    } finally {
      setIsCheckingUpdate(false)
    }
  }

  const handleForceOnboarding = async () => {
    try {
      const result = await electronAPI.forceOnboarding()
      if (result?.success) {
        setUpdateMessage("✓ Onboarding forzado - reinicia la app")
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      } else {
        setUpdateMessage("✗ Error forzando onboarding")
      }
    } catch (error) {
      setUpdateMessage("✗ Error forzando onboarding")
    }
  }

  const font = "'gg sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif"

  // Botón estilo Fishstrap
  const NavBtn = ({
    icon, label, onClick, accent, delay
  }: {
    icon: React.ReactNode
    label: string
    onClick: () => void
    accent?: boolean
    delay: number
  }) => (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center",
        width: "100%", padding: "14px 18px",
        borderRadius: 10, cursor: "pointer",
        border: "1px solid rgba(255,255,255,0.07)",
        background: "rgba(255,255,255,0.03)",
        transition: "all 0.15s", gap: 14,
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"
        ;(e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.12)"
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)"
        ;(e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.07)"
      }}
    >
      {/* Icono izquierda */}
      <div style={{ color: "#B5BAC1", flexShrink: 0, width: 20, display: "flex", justifyContent: "center" }}>
        {icon}
      </div>
      {/* Label */}
      <span style={{
        flex: 1, textAlign: "left",
        color: "#F2F3F5", fontSize: 14, fontWeight: 500,
        letterSpacing: "-0.01em",
      }}>
        {label}
      </span>
      {/* Chevron derecha */}
      <ChevronRight size={16} style={{ color: "#393A41", flexShrink: 0 }} />
    </button>
  )

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      height: "100vh", width: "100vw", overflow: "hidden",
      userSelect: "none", backgroundColor: "transparent", fontFamily: font,
      position: "relative", zIndex: 1,
      opacity: 1,
      touchAction: "none",
    }}>
      {/* Close button */}
      <button
        onClick={() => {
          if (electronAPI.isElectron()) {
            window.electronAPI?.quit?.()
          } else {
            window.close()
          }
        }}
        style={{
          position: "absolute", top: 20, right: 20,
          width: 36, height: 36, borderRadius: 8,
          border: "1px solid rgba(255,255,255,0.07)",
          background: "rgba(255,255,255,0.03)",
          cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 0.15s", zIndex: 100,
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"
          ;(e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.12)"
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)"
          ;(e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.07)"
        }}
      >
        <X size={18} style={{ color: "#B5BAC1" }} />
      </button>

      {/* ── CUERPO ─────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* ── IZQUIERDA ─────────────────────────────────────────────── */}
        <div
          style={{
            width: 220, display: "flex", flexDirection: "column",
            padding: "32px 24px",
            flexShrink: 0, justifyContent: "center",
          }}
        >
          {/* Logo + nombre + versión */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
            <div
              style={{
                width: 48, height: 48, borderRadius: 12,
                overflow: "hidden", flexShrink: 0,
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
              }}
            >
              <img src={AVATAR} alt="YUMMAN"
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                crossOrigin="anonymous" />
            </div>
            <div>
              <p style={{ color: "#F2F3F5", fontSize: 14, fontWeight: 700, margin: 0, letterSpacing: "-0.02em", whiteSpace: "nowrap" }}>
                YUMMAN RIVALS
              </p>
              <p style={{ color: "#B5BAC1", fontSize: 11, margin: "2px 0 0 0" }}>
                Versión {version}
              </p>
            </div>
          </div>

          {/* Spacer */}
          <div style={{ height: 20 }} />

          {/* Links */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { label: "Acerca de YUMMAN", url: "https://www.roblox.com/es/users/4018950771/profile", icon: (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              )},
            ].map(item => (
              <button key={item.label}
                onClick={() => ext(item.url)}
                style={{ display: "flex", alignItems: "center", gap: 9, color: "#B5BAC1",
                  fontSize: 12, background: "none", border: "none", cursor: "pointer",
                  padding: 0, fontWeight: 500, transition: "color 0.15s" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#F2F3F5")}
                onMouseLeave={e => (e.currentTarget.style.color = "#B5BAC1")}
              >
                <span style={{ color: "inherit", display: "flex" }}>{item.icon}</span>
                {item.label}
              </button>
            ))}

            {/* Discord button */}
            <div className="flex flex-col gap-6 max-w-xs mx-auto relative z-10">
              <button
                className="group relative p-3 rounded-xl backdrop-blur-xl border-2 border-indigo-500/30 bg-gradient-to-br from-indigo-900/40 via-black-900/60 to-black/80 shadow-2xl hover:shadow-indigo-500/30 hover:shadow-2xl hover:scale-[1.02] hover:-translate-y-1 active:scale-95 transition-all duration-500 ease-out cursor-pointer hover:border-indigo-400/60 overflow-hidden"
                onClick={() => ext("https://discord.com/invite/EVWqd5swAt")}
              >
                <div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-400/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out"
                ></div>

                <div
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500/10 via-indigo-400/20 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                ></div>

                <div className="relative z-10 flex items-center gap-3">
                  <div
                    className="p-2 rounded-lg bg-gradient-to-br from-indigo-500/30 to-indigo-600/10 backdrop-blur-sm group-hover:from-indigo-400/40 group-hover:to-indigo-500/20 transition-all duration-300"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 640 512"
                      className="w-5 h-5 fill-current text-indigo-400 group-hover:text-indigo-300 transition-all duration-300 group-hover:scale-110 drop-shadow-lg"
                    >
                      <path
                        d="M524.531 69.836a1.5 1.5 0 0 0-.764-.7A485.065 485.065 0 0 0 404.081 32.03a1.816 1.816 0 0 0-1.923.91 337.461 337.461 0 0 0-14.9 30.6 447.848 447.848 0 0 0-134.426 0 309.541 309.541 0 0 0-15.135-30.6 1.89 1.89 0 0 0-1.924-.91 483.689 483.689 0 0 0-119.688 37.107 1.712 1.712 0 0 0-.788.676C39.068 183.651 18.186 294.69 28.43 404.354a2.016 2.016 0 0 0 .765 1.375 487.666 487.666 0 0 0 146.825 74.189 1.9 1.9 0 0 0 2.063-.676A348.2 348.2 0 0 0 208.12 430.4a1.86 1.86 0 0 0-1.019-2.588 321.173 321.173 0 0 1-45.868-21.853 1.885 1.885 0 0 1-.185-3.126 251.047 251.047 0 0 0 9.109-7.137 1.819 1.819 0 0 1 1.9-.256c96.229 43.917 200.41 43.917 295.5 0a1.812 1.812 0 0 1 1.924.233 234.533 234.533 0 0 0 9.132 7.16 1.884 1.884 0 0 1-.162 3.126 301.407 301.407 0 0 1-45.89 21.83 1.875 1.875 0 0 0-1 2.611 391.055 391.055 0 0 0 30.014 48.815 1.864 1.864 0 0 0 2.063.7A486.048 486.048 0 0 0 610.7 405.729a1.882 1.882 0 0 0 .765-1.352c12.264-126.783-20.532-236.912-86.934-334.541zM222.491 337.58c-28.972 0-52.844-26.587-52.844-59.239s23.409-59.241 52.844-59.241c29.665 0 53.306 26.82 52.843 59.239 0 32.654-23.41 59.241-52.843 59.241zm195.38 0c-28.971 0-52.843-26.587-52.843-59.239s23.409-59.241 52.843-59.241c29.667 0 53.307 26.820 52.844 59.239 0 32.654-23.177 59.241-52.844 59.241z"
                      ></path>
                    </svg>
                  </div>
                  <div className="flex-1 text-left">
                    <p
                      className="text-indigo-400 font-bold text-base group-hover:text-indigo-300 transition-colors duration-300 drop-shadow-sm"
                    >
                      Discord
                    </p>
                    <p
                      className="text-indigo-300/60 text-xs group-hover:text-indigo-200/80 transition-colors duration-300"
                    >
                      Join community
                    </p>
                  </div>
                  <div
                    className="opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      fill="none"
                      className="w-4 h-4 text-indigo-400"
                    >
                      <path
                        d="M9 5l7 7-7 7"
                        strokeWidth="2"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                      ></path>
                    </svg>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* ── DERECHA ───────────────────────────────────────────────── */}
        <div style={{
          flex: 1, display: "flex", flexDirection: "column",
          justifyContent: "center", padding: "0 28px 0 12px", gap: 8,
        }}>

          {/* Iniciar Roblox */}
          <button
            onClick={handleLaunch}
            disabled={launchState !== "idle"}
            style={{
              display: "flex", alignItems: "center",
              width: "100%", padding: "14px 18px",
              borderRadius: 10, cursor: launchState !== "idle" ? "not-allowed" : "pointer",
              border: `1px solid ${launchState === "done" ? "rgba(35,165,90,0.2)" : launchState === "error" ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.07)"}`,
              background: launchState === "done" ? "rgba(35,165,90,0.05)" : launchState === "error" ? "rgba(239,68,68,0.05)" : "rgba(255,255,255,0.03)",
              transition: "all 0.15s", gap: 14,
            }}
            onMouseEnter={e => { if (launchState === "idle") { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.12)" } }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.07)" }}
          >
            <div style={{ color: "#B5BAC1", flexShrink: 0, width: 20, display: "flex", justifyContent: "center" }}>
              {launchState === "launching" ? <Loader2 size={18} className="animate-spin" />
               : launchState === "done" ? <Check size={18} style={{ color: "#23A55A" }} />
               : launchState === "error" ? <X size={18} style={{ color: "#ef4444" }} />
               : <ArrowRight size={18} />}
            </div>
            <span style={{ flex: 1, textAlign: "left", color: "#F2F3F5", fontSize: 14, fontWeight: 500, letterSpacing: "-0.01em" }}>
              {launchState === "launching" ? "Iniciando Roblox..." : launchState === "done" ? "¡Roblox iniciado!" : launchState === "error" ? "Error al iniciar" : "Iniciar Roblox"}
            </span>
            <ChevronRight size={16} style={{ color: "#393A41", flexShrink: 0 }} />
          </button>

          {/* Configurar ajustes */}
          <NavBtn
            icon={<Settings size={18} />}
            label="Configurar ajustes"
            onClick={onSettings}
            delay={0.16}
          />

          {/* Buscar actualizaciones */}
          <button
            onClick={handleCheckUpdate}
            disabled={isCheckingUpdate}
            style={{
              display: "flex", alignItems: "center",
              width: "100%", padding: "14px 18px",
              borderRadius: 10, cursor: isCheckingUpdate ? "not-allowed" : "pointer",
              border: "1px solid rgba(255,255,255,0.07)",
              background: "rgba(255,255,255,0.03)",
              transition: "all 0.15s", gap: 14,
              opacity: isCheckingUpdate ? 0.5 : 1,
            }}
            onMouseEnter={e => { if (!isCheckingUpdate) { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.12)" } }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.07)" }}
          >
            <div style={{ color: "#B5BAC1", flexShrink: 0, width: 20, display: "flex", justifyContent: "center" }}>
              {isCheckingUpdate ? <Loader2 size={18} className="animate-spin" /> : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
              )}
            </div>
            <span style={{ flex: 1, textAlign: "left", color: "#F2F3F5", fontSize: 14, fontWeight: 500, letterSpacing: "-0.01em" }}>
              {updateMessage || (isCheckingUpdate ? "Verificando..." : "Buscar actualizaciones")}
            </span>
            <ChevronRight size={16} style={{ color: "#393A41", flexShrink: 0 }} />
          </button>

        </div>
      </div>

    </div>
  )
}
