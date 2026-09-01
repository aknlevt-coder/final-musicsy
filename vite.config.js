import { defineConfig } from 'vite'

export default defineConfig({
  // Eğer daha önceden burada başka ayarların varsa onları silme, kalsın.
  
  server: {
    watch: {
      ignored: ["**/src-tauri/**"]
    }
  }
})