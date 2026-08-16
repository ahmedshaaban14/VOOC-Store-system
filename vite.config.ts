import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Custom Vite plugin to fix the preload script output.
 * 
 * Problem: vite-plugin-electron detects "type": "module" in package.json
 * and forces ESM output format (format: "es"), wrapping CJS code in:
 *   var __commonJS = ...;
 *   var require_preload = __commonJS({ ... });
 *   export default require_preload();
 * 
 * The "export default" line is invalid CJS/CommonJS and crashes Electron's
 * preload script loader. Even with .cjs extension, the wrapper causes issues.
 * 
 * Solution: After each build, if preload.cjs exists, rewrite it to be pure CJS
 * by extracting the inner function body from the __commonJS wrapper.
 */
function fixPreloadCjs(): Plugin {
  const cleanPreload = (outDir: string) => {
    const preloadPath = path.resolve(outDir, 'preload.cjs');
    if (!fs.existsSync(preloadPath)) return;
    
    let content = fs.readFileSync(preloadPath, 'utf-8');
    
    // Check if the file has ESM export pattern
    if (content.includes('export default') || content.includes('export {')) {
      // 1. Handle minified wrapper pattern: export default <fn>(); -> <fn>();
      content = content.replace(/export\s+default\s+([^;]+);?/g, '$1;');
      // 2. Remove any remaining named exports: export { ... };
      content = content.replace(/export\s*\{[^}]*\};?/g, '');
      
      fs.writeFileSync(preloadPath, content, 'utf-8');
      console.log('[fix-preload-cjs] Stripped ESM wrapper from preload.cjs for Electron CJS loader');
    }
  };

  return {
    name: 'fix-preload-cjs',
    writeBundle(options) {
      const outDir = options.dir || path.resolve(__dirname, 'dist-electron');
      cleanPreload(outDir);
    },
    closeBundle() {
      cleanPreload(path.resolve(__dirname, 'dist-electron'));
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        // Main-process entrypoint of the Electron App.
        entry: 'electron/main.ts',
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: ['sql.js', 'electron'],
            },
          },
          define: {
            __dirname: 'import.meta.dirname',
            __filename: 'import.meta.filename',
          },
        },
      },
      {
        entry: 'electron/preload.ts',
        onstart(options) {
          options.reload();
        },
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: ['electron'],
              output: {
                entryFileNames: 'preload.cjs',
              },
            },
          },
          plugins: [fixPreloadCjs()],
        },
      },
    ]),
    renderer(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, './src/shared'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
