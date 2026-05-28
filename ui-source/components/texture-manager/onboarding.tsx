"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import { 
  User, 
  Check, 
  Loader2,
  Sparkles,
  X
} from "lucide-react"
import { electronAPI } from "@/lib/electron-api"

export interface OnboardingSettings {
  robloxUsername: string
  robloxUserId: string
  displayName: string
  avatar: string
  onboardingCompleted: boolean
}

interface OnboardingProps {
  onComplete: (settings: OnboardingSettings) => void
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const [username, setUsername] = useState("")
  const [isValidating, setIsValidating] = useState(false)

  const handleContinue = async () => {
    if (!username.trim()) {
      toast.error("Por favor ingresa tu usuario de Roblox")
      return
    }

    setIsValidating(true)
    try {
      console.log('Obteniendo perfil de Roblox para:', username.trim())
      const result = await electronAPI.getRobloxProfile(username.trim())
      console.log('Resultado de getRobloxProfile:', result)
      
      if (result.success && result.profile) {
        console.log('Perfil encontrado, llamando a loginUser')
        // Guardar usuario en Supabase usando loginUser
        const loginResult = await electronAPI.loginUser(
          username.trim(),
          true,
          '1.0.4',
          'latest'
        )
        console.log('Resultado de loginUser:', loginResult)

        const settings: OnboardingSettings = {
          robloxUsername: username.trim(),
          robloxUserId: result.profile.id.toString(),
          displayName: result.profile.displayName || result.profile.name,
          avatar: result.profile.avatar || "",
          onboardingCompleted: true,
        }
        
        console.log('Llamando a onComplete con settings:', settings)
        onComplete(settings)
        console.log('onComplete llamado')
        toast.success("Usuario validado correctamente")
      } else {
        console.log('Error en getRobloxProfile:', result.error)
        toast.error(result.error || "Usuario no encontrado en Roblox")
      }
    } catch (error) {
      console.error("Error validando usuario:", error)
      toast.error("Error al validar el usuario. Intenta de nuevo.")
    } finally {
      setIsValidating(false)
    }
  }

  const handleClose = async () => {
    try {
      if (electronAPI.isElectron()) {
        await window.electronAPI?.quit?.()
      } else {
        window.close()
      }
    } catch (error) {
      console.error("Error cerrando la app:", error)
    }
  }

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      height: "100vh", width: "100vw", overflow: "hidden",
      userSelect: "none", backgroundColor: "transparent",
      position: "relative", zIndex: 1,
      fontFamily: "'gg sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
    }}>
      <div style={{
        display: "flex", flex: 1, alignItems: "center", justifyContent: "center",
        padding: 24,
      }}>
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ 
            duration: 0.6, 
            ease: [0.16, 1, 0.3, 1],
          }}
          style={{
            width: "100%", maxWidth: 400,
          }}
        >
          {/* Close button */}
          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            onClick={handleClose}
            style={{
              position: "absolute", top: -60, right: 0,
              width: 36, height: 36, borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.07)",
              background: "rgba(255,255,255,0.03)",
              cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)"
              ;(e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.15)"
              ;(e.currentTarget as HTMLElement).style.transform = "scale(1.05)"
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)"
              ;(e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.07)"
              ;(e.currentTarget as HTMLElement).style.transform = "scale(1)"
            }}
          >
            <X size={18} style={{ color: "#B5BAC1" }} />
          </motion.button>

          {/* Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            style={{
              border: "1px solid rgba(255,255,255,0.07)",
              background: "rgba(255,255,255,0.02)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              borderRadius: 16,
              padding: 36,
              boxShadow: "0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05) inset",
            }}
          >
            {/* Header */}
            <div style={{ textAlign: "center", marginBottom: 36 }}>
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              >
                <h2 style={{
                  color: "#F2F3F5", fontSize: 22, fontWeight: 600,
                  letterSpacing: "-0.01em", marginBottom: 10,
                }}>
                  Bienvenido a YUMMAN RIVALS
                </h2>
                <p style={{
                  color: "#B5BAC1", fontSize: 14, fontWeight: 400,
                  letterSpacing: "-0.01em", lineHeight: 1.5,
                }}>
                  Ingresa tu usuario de Roblox para comenzar
                </p>
              </motion.div>
            </div>

            {/* Input */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              style={{ marginBottom: 28 }}
            >
              <motion.div
                animate={{
                  borderColor: isValidating ? "rgba(88,101,242,0.3)" : "rgba(255,255,255,0.07)",
                }}
                transition={{ duration: 0.3 }}
                style={{
                  position: "relative",
                  marginBottom: 18,
                }}
              >
                <motion.div
                  animate={{
                    opacity: isValidating ? 1 : 0,
                  }}
                  transition={{ duration: 0.3 }}
                  style={{
                    position: "absolute", inset: 0,
                    borderRadius: 12,
                    background: "linear-gradient(135deg, rgba(88,101,242,0.1) 0%, rgba(124,58,237,0.1) 100%)",
                    pointerEvents: "none",
                  }}
                />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleContinue()}
                  placeholder="Usuario de Roblox"
                  disabled={isValidating}
                  style={{
                    width: "100%",
                    padding: "16px",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.07)",
                    background: "rgba(255,255,255,0.02)",
                    backdropFilter: "blur(10px)",
                    WebkitBackdropFilter: "blur(10px)",
                    color: "#F2F3F5",
                    fontSize: 15,
                    fontWeight: 500,
                    letterSpacing: "-0.01em",
                    outline: "none",
                    transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                    position: "relative", zIndex: 1,
                  }}
                  onFocus={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(88,101,242,0.3)"
                    ;(e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"
                  }}
                  onBlur={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.07)"
                    ;(e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.02)"
                  }}
                />
              </motion.div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleContinue}
                disabled={isValidating || !username.trim()}
                animate={{
                  background: isValidating 
                    ? "linear-gradient(135deg, rgba(88,101,242,0.15) 0%, rgba(124,58,237,0.15) 100%)"
                    : "rgba(255,255,255,0.02)",
                  borderColor: isValidating
                    ? "rgba(88,101,242,0.3)"
                    : "rgba(255,255,255,0.07)",
                }}
                transition={{ duration: 0.3 }}
                style={{
                  width: "100%",
                  padding: "16px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.07)",
                  color: "#F2F3F5",
                  fontSize: 15,
                  fontWeight: 500,
                  letterSpacing: "-0.01em",
                  cursor: isValidating || !username.trim() ? "not-allowed" : "pointer",
                  transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
                  opacity: isValidating || !username.trim() ? 0.5 : 1,
                  backdropFilter: "blur(10px)",
                  WebkitBackdropFilter: "blur(10px)",
                }}
                onMouseEnter={e => {
                  if (!isValidating && username.trim()) {
                    (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"
                    ;(e.currentTarget as HTMLElement).style.borderColor = "rgba(88,101,242,0.3)"
                  }
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.02)"
                  ;(e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.07)"
                }}
              >
                {isValidating ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <Loader2 size={18} />
                    </motion.div>
                    Validando...
                  </>
                ) : (
                  <>
                    <Check size={18} />
                    Continuar
                  </>
                )}
              </motion.button>
            </motion.div>

            {/* Info */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              style={{ textAlign: "center" }}
            >
              <p style={{
                color: "#80858B", fontSize: 12, fontWeight: 400,
                letterSpacing: "-0.01em", lineHeight: 1.5,
              }}>
                Validaremos tu usuario con la API de Roblox
              </p>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
