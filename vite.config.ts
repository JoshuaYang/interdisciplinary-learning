import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    ...(mode === 'singlefile' ? [viteSingleFile()] : []),
  ],
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  test: {
    exclude: ['**/node_modules/**', '**/dist/**', '**/legacy/**'],
  },
}));
