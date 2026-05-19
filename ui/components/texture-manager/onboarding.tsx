"use client"

import { useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Globe, 
  Moon, 
  Cloud, 
  Gamepad2, 
  Check, 
  Loader2,
  Sparkles
} from "lucide-react"
import { featuredSkyboxes } from "@/lib/skyboxes"
import { electronAPI } from "@/lib/electron-api"

export interface OnboardingSettings {
  language: "es" | "en"
  darkTextures: boolean
  selectedSky: string | null
  executor: string
  customExecutorPath: string
}

interface OnboardingProps {
  onComplete: (settings: OnboardingSettings) => void
}

const skies = featuredSkyboxes;

const executors = [
  { id: "yumman",   name: "YUMMAN RIVALS" },
  { id: "roblox",   name: "Roblox Normal" },
  { id: "fishtrap", name: "Fishtrap"      },
  { id: "bloxtrap", name: "Bloxtrap"      },
  { id: "other",    name: "Otro / Other"  },
]

const translations = {
  es: {
    welcome: "Bienvenido a",
    welcomeDesc: "Para empezar a usar la app y saber cómo funciona pulse aquí",
    start: "Empezar",
    languageTitle: "¿Qué idioma quieres usar?",
    darkTexturesTitle: "¿Quieres usar texturas oscuras?",
    darkTexturesDesc: "Las texturas oscuras mejoran la visibilidad en el juego",
    yes: "Sí",
    no: "No",
    skyTitle: "Selecciona tu cielo",
    executorTitle: "¿Qué ejecutador usas?",
    selectPath: "Seleccionar ruta de /Versions/",
    pathSelected: "Ruta seleccionada",
    finish: "Finalizar",
    applying: "Aplicando cambios...",
    continue: "Continuar",
    skip: "Omitir",
  },
  en: {
    welcome: "Welcome to",
    welcomeDesc: "To start using the app and learn how it works, click here",
    start: "Start",
    languageTitle: "What language do you want to use?",
    darkTexturesTitle: "Do you want to use dark textures?",
    darkTexturesDesc: "Dark textures improve visibility in the game",
    yes: "Yes",
    no: "No",
    skyTitle: "Select your sky",
    executorTitle: "What executor do you use?",
    selectPath: "Select /Versions/ path",
    pathSelected: "Path selected",
    finish: "Finish",
    applying: "Applying changes...",
    continue: "Continue",
    skip: "Skip",
  },
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0)
  const [isApplying, setIsApplying] = useState(false)
  const [settings, setSettings] = useState<OnboardingSettings>({
    language: "es",
    darkTextures: false,
    selectedSky: null,
    executor: "roblox",
    customExecutorPath: "",
  })
  const skyScrollRef = useRef<HTMLDivElement>(null)
  
  const t = translations[settings.language]

  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  }

  const handleFinish = async () => {
    setIsApplying(true)
    
    try {
      console.log('=== FINALIZANDO ONBOARDING ===');
      
      const executorResult = await electronAPI.getExecutorTexturePath(
        settings.executor,
        settings.customExecutorPath || undefined
      );
      
      if (!executorResult.valid) {
        console.error('❌ Error al obtener ruta del ejecutor:', executorResult.message);
        alert(`Error: ${executorResult.message}\n\nLa app continuará pero puede que no funcione correctamente.`);
        setIsApplying(false)
        onComplete(settings);
        return;
      }
      
      const texturePath = executorResult.texturePath || '';
      
      if (settings.darkTextures && texturePath) {
        const textureResult = await electronAPI.applyDarkTextures(true, texturePath);
        if (!textureResult.success) {
          console.error('❌ Error al aplicar texturas:', textureResult.message);
        }
      }
      
      if (settings.selectedSky && texturePath) {
        const skyResult = await electronAPI.applySky(settings.selectedSky, texturePath);
        if (!skyResult.success) {
          console.error('❌ Error al aplicar skybox:', skyResult.message);
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 1500))
      setIsApplying(false)
      onComplete(settings)
    } catch (error) {
      console.error('❌ Error crítico en onboarding:', error)
      alert(`Error crítico: ${error}\n\nRevisa la consola para más detalles.`);
      setIsApplying(false)
      setTimeout(() => { onComplete(settings) }, 1000)
    }
  }

  const nextStep = () => setStep(prev => prev + 1)

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <AnimatePresence mode="wait">
        {/* Step 0: Loading Logo */}
        {step === 0 && (
          <motion.div
            key="loading"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center gap-8"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="relative"
            >
              <div className="relative flex h-32 w-32 items-center justify-center rounded-full border border-border bg-card overflow-hidden">
                <img 
                  src="https://tr.rbxcdn.com/30DAY-AvatarHeadshot-695CED98FDC232201477E9A144B99CE4-Png/150/150/AvatarHeadshot/Webp/noFilter"
                  alt="YUMMAN Profile"
                  className="h-full w-full object-cover"
                  crossOrigin="anonymous"
                />
              </div>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-4xl font-bold text-white"
            >
              YUMMAN RIVALS
            </motion.h1>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <button
                onClick={nextStep}
                className="btn-gray rounded-xl px-8 py-3 font-semibold transition-transform hover:scale-105"
              >
                {t.start}
              </button>
            </motion.div>
          </motion.div>
        )}

        {/* Step 1: Welcome */}
        {step === 1 && (
          <motion.div
            key="welcome"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.4 }}
            className="card-glass max-w-lg p-8 text-center"
          >
            <img 
              src="https://tr.rbxcdn.com/30DAY-AvatarHeadshot-695CED98FDC232201477E9A144B99CE4-Png/150/150/AvatarHeadshot/Webp/noFilter"
              alt="YUMMAN Profile"
              className="mx-auto mb-6 h-16 w-16 rounded-full object-cover"
              crossOrigin="anonymous"
            />
            <h2 className="mb-2 text-3xl font-bold text-white">
              {t.welcome} <span className="text-white">YUMMAN RIVALS</span>
            </h2>
            <p className="mb-8 text-muted-foreground">
              {t.welcomeDesc}
            </p>
            <button
              onClick={nextStep}
              className="btn-gray w-full rounded-xl py-3 font-semibold transition-transform hover:scale-[1.02]"
            >
              {t.start}
            </button>
          </motion.div>
        )}

        {/* Step 2: Language */}
        {step === 2 && (
          <motion.div
            key="language"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.4 }}
            className="card-glass max-w-lg p-8 text-center"
          >
            <Globe className="mx-auto mb-6 h-16 w-16 text-icon" />
            <h2 className="mb-8 text-2xl font-bold text-white">{t.languageTitle}</h2>
            <div className="flex gap-4">
              <button
                onClick={() => { setSettings(prev => ({ ...prev, language: "es" })); nextStep(); }}
                className={`flex-1 rounded-xl border-2 p-4 transition-all hover:scale-[1.02] hover:bg-button-hover ${
                  settings.language === "es" ? "border-white bg-muted" : "border-border hover:border-white/50"
                }`}
              >
                <span className="text-2xl">ES</span>
                <p className="mt-2 font-semibold text-white">Español</p>
              </button>
              <button
                onClick={() => { setSettings(prev => ({ ...prev, language: "en" })); nextStep(); }}
                className={`flex-1 rounded-xl border-2 p-4 transition-all hover:scale-[1.02] hover:bg-button-hover ${
                  settings.language === "en" ? "border-white bg-muted" : "border-border hover:border-white/50"
                }`}
              >
                <span className="text-2xl">EN</span>
                <p className="mt-2 font-semibold text-white">English</p>
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Dark Textures */}
        {step === 3 && (
          <motion.div
            key="dark-textures"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.4 }}
            className="card-glass max-w-lg p-8 text-center"
          >
            <Moon className="mx-auto mb-6 h-16 w-16 text-icon" />
            <h2 className="mb-2 text-2xl font-bold text-white">{t.darkTexturesTitle}</h2>
            <p className="mb-8 text-muted-foreground">{t.darkTexturesDesc}</p>
            <div className="flex gap-4">
              <button
                onClick={() => { setSettings(prev => ({ ...prev, darkTextures: true })); nextStep(); }}
                className="flex-1 rounded-xl border-2 border-border bg-card p-4 transition-all hover:scale-[1.02] hover:border-success hover:bg-muted"
              >
                <Check className="mx-auto h-8 w-8 text-success" />
                <p className="mt-2 font-semibold text-white">{t.yes}</p>
              </button>
              <button
                onClick={() => { setSettings(prev => ({ ...prev, darkTextures: false })); nextStep(); }}
                className="flex-1 rounded-xl border-2 border-border bg-card p-4 transition-all hover:scale-[1.02] hover:border-muted-foreground hover:bg-muted"
              >
                <span className="mx-auto block text-2xl text-muted-foreground">✕</span>
                <p className="mt-2 font-semibold text-white">{t.no}</p>
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 4: Sky Selection */}
        {step === 4 && (
          <motion.div
            key="sky"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.4 }}
            className="card-glass max-w-4xl p-8"
          >
            <Cloud className="mx-auto mb-6 h-16 w-16 text-icon" />
            <h2 className="mb-8 text-center text-2xl font-bold text-white">{t.skyTitle}</h2>
            
            {/* Lista Horizontal Deslizable */}
            <div className="relative mb-8">
              <div ref={skyScrollRef} className="flex gap-4 overflow-x-auto pb-4 px-12 scrollbar-hide snap-x snap-mandatory">
                {skies.map(sky => (
                  <button
                    key={sky.id}
                    onClick={() => setSettings(prev => ({ ...prev, selectedSky: sky.id }))}
                    className={`relative flex-shrink-0 snap-center overflow-hidden rounded-xl border-4 transition-all ${
                      settings.selectedSky === sky.id 
                        ? "border-white scale-110 shadow-2xl" 
                        : "border-border hover:border-white/50 hover:scale-105"
                    }`}
                    style={{ width: '200px', height: '140px' }}
                  >
                    <img
                      src={sky.image}
                      alt={settings.language === "es" ? sky.name : sky.nameEn}
                      className="h-full w-full object-cover"
                      crossOrigin="anonymous"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-2">
                      <p className="text-center text-xs font-bold text-white">
                        {settings.language === "es" ? sky.name : sky.nameEn}
                      </p>
                    </div>
                    {settings.selectedSky === sky.id && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/10">
                        <div className="rounded-full bg-white p-2">
                          <Check className="h-6 w-6 text-black" />
                        </div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
              
              {/* Flechas de navegación */}
              <button
                onClick={() => skyScrollRef.current?.scrollBy({ left: -220, behavior: 'smooth' })}
                className="absolute left-0 top-1/2 -translate-y-1/2 rounded-full bg-muted/80 p-2 backdrop-blur-sm transition-all hover:bg-white hover:text-black"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={() => skyScrollRef.current?.scrollBy({ left: 220, behavior: 'smooth' })}
                className="absolute right-0 top-1/2 -translate-y-1/2 rounded-full bg-muted/80 p-2 backdrop-blur-sm transition-all hover:bg-white hover:text-black"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            <button
              onClick={nextStep}
              disabled={!settings.selectedSky}
              className="btn-gray w-full rounded-xl py-3 font-semibold transition-transform hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
            >
              {t.continue}
            </button>
          </motion.div>
        )}

        {/* Step 5: Executor */}
        {step === 5 && (
          <motion.div
            key="executor"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.4 }}
            className="card-glass max-w-lg p-8 text-center"
          >
            <Gamepad2 className="mx-auto mb-6 h-16 w-16 text-icon" />
            <h2 className="mb-6 text-2xl font-bold text-white">{t.executorTitle}</h2>
            
            <div className="mb-6 grid grid-cols-2 gap-3">
              {executors.map(exec => (
                <button
                  key={exec.id}
                  onClick={() => setSettings(prev => ({ ...prev, executor: exec.id }))}
                  className={`rounded-xl border-2 p-4 text-sm font-medium transition-all hover:scale-[1.02] hover:bg-button-hover ${
                    settings.executor === exec.id 
                      ? "border-white bg-muted text-white" 
                      : "border-border text-white hover:border-white/50"
                  }`}
                >
                  {exec.name}
                </button>
              ))}
            </div>

            {settings.executor === "other" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mb-6"
              >
                <button
                  onClick={async () => {
                    if (!electronAPI.isElectron()) return;
                    const api = window.electronAPI;
                    const folderPath = await api.selectFolder('Seleccionar carpeta /Versions/');
                    if (folderPath) {
                      setSettings(prev => ({ ...prev, customExecutorPath: folderPath }));
                    }
                  }}
                  className={`w-full rounded-lg border px-4 py-3 text-sm transition-all ${
                    settings.customExecutorPath 
                      ? "border-success bg-success/10 text-success" 
                      : "border-border text-white hover:bg-muted"
                  }`}
                >
                  {settings.customExecutorPath ? `✓ ${t.pathSelected}` : t.selectPath}
                </button>
                {settings.customExecutorPath && (
                  <p className="mt-2 text-xs text-muted-foreground truncate">
                    {settings.customExecutorPath}
                  </p>
                )}
              </motion.div>
            )}

            <button
              onClick={nextStep}
              className="btn-gray w-full rounded-xl py-3 font-semibold transition-transform hover:scale-[1.02]"
            >
              {t.continue}
            </button>
          </motion.div>
        )}

        {/* Step 6: Finish */}
        {step === 6 && (
          <motion.div
            key="finish"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.4 }}
            className="card-glass max-w-lg p-8 text-center"
          >
            {isApplying ? (
              <>
                <Loader2 className="mx-auto mb-6 h-16 w-16 animate-spin text-icon" />
                <h2 className="mb-4 text-2xl font-bold text-white">{t.applying}</h2>
                <div className="mx-auto mb-4 h-2 w-48 overflow-hidden rounded-full bg-muted">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 1.8 }}
                    className="h-full bg-white"
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  {settings.language === "es" 
                    ? "Configurando ejecutor y aplicando cambios..." 
                    : "Configuring executor and applying changes..."}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {settings.language === "es" 
                    ? `Ejecutor: ${settings.executor}` 
                    : `Executor: ${settings.executor}`}
                </p>
              </>
            ) : (
              <>
                <Check className="mx-auto mb-6 h-16 w-16 text-success" />
                <h2 className="mb-2 text-2xl font-bold text-white">YUMMAN RIVALS</h2>
                <p className="mb-8 text-muted-foreground">
                  {settings.language === "es" 
                    ? "Todo listo. Presiona finalizar para entrar a la aplicación."
                    : "All set. Press finish to enter the application."}
                </p>
                <button
                  onClick={handleFinish}
                  className="btn-gray w-full rounded-xl py-3 font-semibold transition-transform hover:scale-[1.02]"
                >
                  {t.finish}
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
