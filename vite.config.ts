import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  root: 'src/renderer',
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src/renderer/src'),
      '@shared': path.resolve(import.meta.dirname, 'src/shared'),
    },
  },
  build: { outDir: '../../dist', emptyOutDir: true },
});
