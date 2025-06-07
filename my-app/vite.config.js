import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: { 
    // These help if __app_id or __firebase_config are meant to be injected by an environment
    // but allow the app to fallback to defaults in App.js if not present.
    '__app_id': JSON.stringify(process.env.APP_ID || 'haccp-forms-dev-app'),
    '__firebase_config': JSON.stringify(process.env.FIREBASE_CONFIG || '{}') 
  }
})