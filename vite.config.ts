import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/Photo_app/',
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      '@ericblade/quagga2': path.resolve(__dirname, 'node_modules/@ericblade/quagga2/lib/quagga.js'),
      buffer: 'buffer',
    }
  },
  define: {
    'global': 'globalThis',
  },
  optimizeDeps: {
    include: ['buffer'],
    esbuildOptions: {
      define: {
        global: 'globalThis'
      }
    }
  },
  ssr: {
    noExternal: ['@ericblade/quagga2']
  }
});
