/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Para Electron con loadFile: usar rutas relativas
  assetPrefix: './',
  basePath: '',
  trailingSlash: true,
}

export default nextConfig
