import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  // Pe GitHub Pages site-ul e servit din https://rithm4.github.io/SlavicSite/
  base: command === 'build' ? '/SlavicSite/' : '/',
}))
