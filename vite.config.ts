import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  server: {
    port: 5174
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/remote-entry.ts'),
      name: 'HttpCacheRemote',
      fileName: () => 'remote-entry.js',
      formats: ['es'],
    },
    rollupOptions: {
      external: [],
    },
  },
})
