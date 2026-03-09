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
      entry: resolve(__dirname, 'src/main.ts'),
      name: 'HttpCacheRemote',
      fileName: () => 'main.js',
      formats: ['es'],
    },
    rollupOptions: {
      external: [],
    },
  },
})
