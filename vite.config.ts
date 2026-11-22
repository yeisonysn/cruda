import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), basicSsl()],
  build: {
    chunkSizeWarningLimit: 650,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-three': [
            'three',
            'three/examples/jsm/controls/OrbitControls.js',
            'three/examples/jsm/loaders/STLLoader.js',
          ],
          'vendor-icons': ['lucide-react'],
        },
      },
    },
  },
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        secure: false,
      },
      '/n8n-webhook': {
        target: 'http://127.0.0.1:5678',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/n8n-webhook/, '/webhook'),
      },
    },
  },
});
