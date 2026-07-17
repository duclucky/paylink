import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Stellar SDK (and some deps) reference Node's `global`; polyfill it for the browser
  // so module evaluation doesn't throw "global is not defined" (blank page otherwise).
  define: { global: 'globalThis' },
});
