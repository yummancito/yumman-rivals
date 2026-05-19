"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Settings, Loader2, Check, X, ChevronRight, ArrowRight } from "lucide-react"
import { electronAPI } from "@/lib/electron-api"

type LaunchState = "idle" | "launching" | "done" | "error"
interface HomeViewProps { onSettings: () => void }

const AVATAR       = "https://tr.rbxcdn.com/30DAY-AvatarHeadshot-695CED98FDC232201477E9A144B99CE4-Png/150/150/AvatarHeadshot/Webp/noFilter"
const ROBLOX_ICON  = "https://static.wikia.nocookie.net/logopedia/images/d/da/Roblox_2018_O_Icon_final_-_Gray.svg/revision/latest/scale-to-width-down/250?cb=20190809191156"
const DISCORD_ICON = "https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/discord-white-icon.png"

const TIPS = [
  "Si usas escopeta doble eres una rata",
  "El que hace camping no tiene skill",
  "YUMMAN estuvo aquí",
  "El que spamea tiene 0 aim",
  "Si pierdes la culpa es del lag, siempre",
  "Rivals es el mejor juego de Roblox, punto",
  "No hay excusas, solo malos jugadores",
  "Si te matan con pistola, gg",
  "Activa Potato Mode y vuela",
  "Dark textures = mejor visibilidad en combate",
  "YUMMAN RIVALS — el launcher que necesitabas",
  "El que hace team kill es lo peor",
  "Si no tienes 60 FPS no eres real",
]

export function HomeView({ onSettings }: HomeViewProps) {
  const [launchState, setLaunchState] = useState<LaunchState>("idle")
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false)
  const [updateMessage, setUpdateMessage] = useState<string | null>(null)
  const [tipIdx, setTipIdx]           = useState(() => Math.floor(Math.random() * TIPS.length))
  const [tipVis, setTipVis]           = useState(true)
  const [version, setVersion]         = useState("—")

  useEffect(() => {
    const t = setInterval(() => {
      setTipVis(false)
      setTimeout(() => { setTipIdx(i => (i + 1) % TIPS.length); setTipVis(true) }, 300)
    }, 5000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    electronAPI.getAppVersion().then(v => { if (v) setVersion(v) })
    setTimeout(() => { void electronAPI.checkForUpdates() }, 3000)
  }, [])

  const ext = (url: string) => window.open(url, "_blank", "noopener,noreferrer")

  const handleLaunch = async () => {
    if (launchState !== "idle") return
    setLaunchState("launching")
    try {
      const r = await electronAPI.launchRoblox("roblox")
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
      await electronAPI.checkForUpdates()
      setUpdateMessage("✓ Verificación completada")
      setTimeout(() => setUpdateMessage(null), 3000)
    } catch {
      setUpdateMessage("✗ Error al verificar")
      setTimeout(() => setUpdateMessage(null), 3000)
    } finally {
      setTimeout(() => setIsCheckingUpdate(false), 1000)
    }
  }

  const font = "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif"

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
    <motion.button
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.32 }}
      whileHover={{ x: 2 }}
      whileTap={{ scale: 0.98 }}
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
      <div style={{ color: "#888580", flexShrink: 0, width: 20, display: "flex", justifyContent: "center" }}>
        {icon}
      </div>
      {/* Label */}
      <span style={{
        flex: 1, textAlign: "left",
        color: "#C8C8C8", fontSize: 14, fontWeight: 500,
        letterSpacing: "-0.01em",
      }}>
        {label}
      </span>
      {/* Chevron derecha */}
      <ChevronRight size={16} style={{ color: "#444240", flexShrink: 0 }} />
    </motion.button>
  )

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      height: "100vh", width: "100vw", overflow: "hidden",
      userSelect: "none", backgroundColor: "#1C1A18", fontFamily: font,
    }}>

      {/* ── CUERPO ─────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* ── IZQUIERDA ─────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.38 }}
          style={{
            width: 220, display: "flex", flexDirection: "column",
            padding: "32px 24px",
            flexShrink: 0, justifyContent: "center",
          }}
        >
          {/* Logo + nombre + versión */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.08, duration: 0.4 }}
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
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.14, duration: 0.3 }}
            >
              <p style={{ color: "#D8D8D8", fontSize: 14, fontWeight: 700, margin: 0, letterSpacing: "-0.02em", whiteSpace: "nowrap" }}>
                YUMMAN RIVALS
              </p>
              <p style={{ color: "#555250", fontSize: 11, margin: "2px 0 0 0" }}>
                Versión {version}
              </p>
            </motion.div>
          </div>

          {/* Spacer */}
          <div style={{ height: 20 }} />

          {/* Links */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.3 }}
            style={{ display: "flex", flexDirection: "column", gap: 12 }}
          >
            {[
              { label: "Acerca de YUMMAN", url: "https://www.roblox.com/es/users/4018950771/profile", icon: (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              )},
              { label: "Unirse al Discord", url: "https://discord.com/invite/EVWqd5swAt", icon: (
                <img src={DISCORD_ICON} alt="Discord"
                  style={{ width: 14, height: 14, objectFit: "contain", opacity: 0.5 }}
                  crossOrigin="anonymous" />
              )},
            ].map(item => (
              <motion.button key={item.label} whileHover={{ x: 3 }}
                onClick={() => ext(item.url)}
                style={{ display: "flex", alignItems: "center", gap: 9, color: "#444240",
                  fontSize: 12, background: "none", border: "none", cursor: "pointer",
                  padding: 0, fontWeight: 500, transition: "color 0.15s" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#888580")}
                onMouseLeave={e => (e.currentTarget.style.color = "#444240")}
              >
                <span style={{ color: "inherit", display: "flex" }}>{item.icon}</span>
                {item.label}
              </motion.button>
            ))}
          </motion.div>
        </motion.div>

        {/* ── DERECHA ───────────────────────────────────────────────── */}
        <div style={{
          flex: 1, display: "flex", flexDirection: "column",
          justifyContent: "center", padding: "0 28px 0 12px", gap: 8,
        }}>

          {/* Iniciar Roblox */}
          <motion.button
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1, duration: 0.32 }}
            whileHover={{ x: 2 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleLaunch}
            disabled={launchState !== "idle"}
            style={{
              display: "flex", alignItems: "center",
              width: "100%", padding: "14px 18px",
              borderRadius: 10, cursor: launchState !== "idle" ? "not-allowed" : "pointer",
              border: `1px solid ${launchState === "done" ? "rgba(34,197,94,0.2)" : launchState === "error" ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.07)"}`,
              background: launchState === "done" ? "rgba(34,197,94,0.05)" : launchState === "error" ? "rgba(239,68,68,0.05)" : "rgba(255,255,255,0.03)",
              transition: "all 0.15s", gap: 14,
            }}
            onMouseEnter={e => { if (launchState === "idle") { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.12)" } }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.07)" }}
          >
            <div style={{ color: "#888580", flexShrink: 0, width: 20, display: "flex", justifyContent: "center" }}>
              {launchState === "launching" ? <Loader2 size={18} className="animate-spin" />
               : launchState === "done" ? <Check size={18} style={{ color: "#22c55e" }} />
               : launchState === "error" ? <X size={18} style={{ color: "#ef4444" }} />
               : <ArrowRight size={18} />}
            </div>
            <span style={{ flex: 1, textAlign: "left", color: "#C8C8C8", fontSize: 14, fontWeight: 500, letterSpacing: "-0.01em" }}>
              {launchState === "launching" ? "Iniciando Roblox..." : launchState === "done" ? "¡Roblox iniciado!" : launchState === "error" ? "Error al iniciar" : "Iniciar Roblox"}
            </span>
            <ChevronRight size={16} style={{ color: "#444240", flexShrink: 0 }} />
          </motion.button>

          {/* Configurar ajustes */}
          <NavBtn
            icon={<Settings size={18} />}
            label="Configurar ajustes"
            onClick={onSettings}
            delay={0.16}
          />

          {/* Buscar actualizaciones */}
          <motion.button
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.22, duration: 0.32 }}
            whileHover={{ x: 2 }}
            whileTap={{ scale: 0.98 }}
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
            <div style={{ color: "#888580", flexShrink: 0, width: 20, display: "flex", justifyContent: "center" }}>
              {isCheckingUpdate ? <Loader2 size={18} className="animate-spin" /> : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
              )}
            </div>
            <span style={{ flex: 1, textAlign: "left", color: "#C8C8C8", fontSize: 14, fontWeight: 500, letterSpacing: "-0.01em" }}>
              {updateMessage || (isCheckingUpdate ? "Verificando..." : "Buscar actualizaciones")}
            </span>
            <ChevronRight size={16} style={{ color: "#444240", flexShrink: 0 }} />
          </motion.button>

        </div>
      </div>

      {/* ── TIP ─────────────────────────────────────────────────────────── */}
      <div style={{
        borderTop: "1px solid rgba(255,255,255,0.04)",
        padding: "8px 24px",
        display: "flex", alignItems: "center", gap: 10,
        background: "rgba(0,0,0,0.1)", flexShrink: 0,
      }}>
        <span style={{ color: "#252320", fontSize: 9, fontWeight: 700, letterSpacing: "0.07em", flexShrink: 0 }}>
          YUMMAN TIP
        </span>
        <div style={{ width: 1, height: 8, background: "rgba(255,255,255,0.04)", flexShrink: 0 }} />
        <AnimatePresence mode="wait">
          {tipVis && (
            <motion.p key={tipIdx}
              initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6 }} transition={{ duration: 0.25 }}
              style={{ color: "#333230", fontSize: 11, margin: 0, flex: 1 }}
            >
              {TIPS[tipIdx]}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

    </div>
  )
}
