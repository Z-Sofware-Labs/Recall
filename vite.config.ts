import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

const host = process.env.TAURI_DEV_HOST;

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
    // 1. prevent vite from obscuring rust errors
    clearScreen: false,
    server: {
      port: 3000,
      strictPort: true,
      host: host || false,
      hmr: process.env.DISABLE_HMR === 'true' 
        ? false 
        : host
          ? {
              protocol: 'ws',
              host,
              port: 3001,
            }
          : undefined,
      watch: process.env.DISABLE_HMR === 'true' 
        ? null 
        : {
            ignored: ['**/src-tauri/**'],
          },
    },
    // Env variables starting with the item of `envPrefix` will be exposed in tauri's source code through `import.meta.env`.
    envPrefix: ['VITE_', 'TAURI_ENV_*'],
    build: {
      // Tauri uses Chromium on Windows and WebKit on macOS and Linux
      target:
        process.env.TAURI_ENV_PLATFORM === 'windows'
          ? 'chrome105'
          : ['es2021', 'chrome100', 'safari13'],
      // don't minify for debug builds
      minify: !process.env.TAURI_ENV_DEBUG ? ('esbuild' as const) : false,
      // produce sourcemaps for debug builds
      sourcemap: !!process.env.TAURI_ENV_DEBUG,
      chunkSizeWarningLimit: 1500,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom'],
            'vendor-icons': ['lucide-react'],
            'vendor-utils': ['jszip', 'qrcode'],
          },
        },
      },
    },
  };
});
