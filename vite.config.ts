import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import { fileURLToPath } from 'node:url';
import tailwindConfig from './tailwind.config';

const root = fileURLToPath(new URL('./client', import.meta.url));

export default defineConfig({
  root,
  plugins: [react()],
  css: { postcss: { plugins: [tailwindcss(tailwindConfig), autoprefixer()] } },
  server: {
    port: 5173,
    strictPort: true,
    fs: { allow: [fileURLToPath(new URL('.', import.meta.url))] },
    proxy: { '/api': { target: `http://127.0.0.1:${process.env.API_PORT || 4000}`, changeOrigin: false } },
  },
  build: { outDir: '../dist/client', emptyOutDir: true },
});
