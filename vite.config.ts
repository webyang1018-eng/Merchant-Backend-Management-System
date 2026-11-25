import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
    strictPort: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    allowedHosts: true,
  },
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        pet: 'pet.html',
      },
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-dom/client'],
          icons: ['lucide-react'],
        },
      },
    },
  },
});
