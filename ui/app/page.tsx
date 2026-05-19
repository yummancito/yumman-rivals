"use client"

import { useState } from "react"
import { HomeView } from "@/components/texture-manager/home"
import { SettingsView } from "@/components/texture-manager/settings-view"
import { electronAPI } from "@/lib/electron-api"

export default function Page() {
  const [view, setView] = useState<"home" | "settings">("home")

  const goSettings = () => {
    void electronAPI.resizeWindow("settings")
    setView("settings")
  }

  const goHome = () => {
    void electronAPI.resizeWindow("home")
    setView("home")
  }

  if (view === "settings") {
    return <SettingsView onBack={goHome} />
  }

  return <HomeView onSettings={goSettings} />
}
