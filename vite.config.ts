import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    // This is crucial for GitHub Pages deployment. 
    base: './', 
    resolve: {
      alias: {
        '@': path.resolve((process as any).cwd(), './src'),
        '@components': path.resolve((process as any).cwd(), './components'),
      }
    },
    define: {
      // Strictly define process.env.API_KEY for the @google/genai SDK
      'process.env.API_KEY': JSON.stringify(env.API_KEY || env.VITE_API_KEY || ''),
      // Fallback for other process.env usage
      'process.env': {
        API_KEY: env.API_KEY || env.VITE_API_KEY || '',
        NODE_ENV: process.env.NODE_ENV || 'development'
      }
    }
  };
});