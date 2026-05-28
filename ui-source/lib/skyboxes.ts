// Lista de skyboxes disponibles con imágenes reales
export const skyboxes = [
  { id: "night", name: "Noche", nameEn: "Night", image: "skybox://night.png" },
  { id: "aurora", name: "Aurora Boreal", nameEn: "Aurora", image: "skybox://aurora.png" },
  { id: "moonlight", name: "Luz de Luna", nameEn: "Moonlight", image: "skybox://moonlight.png" },
  { id: "space-blue", name: "Espacio Azul", nameEn: "Space Blue", image: "skybox://space-blue.png" },
  { id: "universe", name: "Universo", nameEn: "Universe", image: "skybox://universe.png" },
  { id: "pink-sunrise", name: "Amanecer Rosa", nameEn: "Pink Sunrise", image: "skybox://pink-sunrise.png" },
  { id: "beautiful", name: "Hermoso", nameEn: "Beautiful", image: "skybox://beautiful.png" },
  { id: "neonsky", name: "Neón", nameEn: "Neon Sky", image: "skybox://neonsky.png" },
  { id: "neonsky2", name: "Neón 2", nameEn: "Neon Sky 2", image: "skybox://neonsky2.png" },
  { id: "hades", name: "Hades", nameEn: "Hades", image: "skybox://hades.png" },
  { id: "spooky", name: "Espeluznante", nameEn: "Spooky", image: "skybox://spooky.png" },
  { id: "goodnight", name: "Buenas Noches", nameEn: "Goodnight", image: "skybox://goodnight.png" },
  { id: "overcast", name: "Nublado", nameEn: "Overcast", image: "skybox://overcast.png" },
  { id: "hazy", name: "Brumoso", nameEn: "Hazy", image: "skybox://hazy.png" },
  { id: "blue", name: "Azul", nameEn: "Blue", image: "skybox://blue.png" },
  { id: "light-blue", name: "Azul Claro", nameEn: "Light Blue", image: "skybox://light-blue.png" },
  { id: "cyan", name: "Cian", nameEn: "Cyan", image: "skybox://cyan.png" },
  { id: "orange", name: "Naranja", nameEn: "Orange", image: "skybox://orange.png" },
  { id: "red", name: "Rojo", nameEn: "Red", image: "skybox://red.png" },
  { id: "chill-pink", name: "Rosa Relajante", nameEn: "Chill Pink", image: "skybox://chill-pink.png" },
  { id: "light-pink", name: "Rosa Claro", nameEn: "Light Pink", image: "skybox://light-pink.png" },
  { id: "chill-gray", name: "Gris Relajante", nameEn: "Chill Gray", image: "skybox://chill-gray.png" },
  { id: "pandora", name: "Pandora", nameEn: "Pandora", image: "skybox://pandora.png" },
  { id: "chromakey", name: "Chroma Key", nameEn: "Chroma Key", image: "skybox://chromakey.png" },
  { id: "emo", name: "Emo", nameEn: "Emo", image: "skybox://emo.png" },
];

// Skyboxes destacados para el onboarding (los 4 más populares)
export const featuredSkyboxes = (["night", "aurora", "space-blue", "pink-sunrise"] as const)
  .map(id => skyboxes.find(s => s.id === id))
  .filter((s): s is typeof skyboxes[number] => s !== undefined);
