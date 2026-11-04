import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import fs from 'node:fs';
import path from 'node:path';

function copy404Plugin(): Plugin {
  return {
    name: 'copy-404-for-github-pages',
    closeBundle() {
      const distIndex = path.resolve(__dirname, 'dist/index.html');
      const dist404 = path.resolve(__dirname, 'dist/404.html');
      if (fs.existsSync(distIndex)) {
        fs.copyFileSync(distIndex, dist404);
      }
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    copy404Plugin(),
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
