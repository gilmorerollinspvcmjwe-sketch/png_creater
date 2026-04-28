import { defineConfig } from 'vite';
import { copyFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

export default defineConfig({
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  server: {
    open: true,
  },
  plugins: [
    {
      name: 'copy-worker',
      closeBundle() {
        const srcDir = 'src/workers';
        const destDir = 'dist/assets';
        
        if (!existsSync(destDir)) {
          mkdirSync(destDir, { recursive: true });
        }
        
        const workerFiles = ['imageProcessor.js'];
        for (const file of workerFiles) {
          const srcPath = join(srcDir, file);
          const destPath = join(destDir, file);
          try {
            copyFileSync(srcPath, destPath);
          } catch (e) {
            console.error(`Failed to copy ${file}:`, e);
          }
        }
      },
    },
  ],
});
