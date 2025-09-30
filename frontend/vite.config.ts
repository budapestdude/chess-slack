import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Split React and related libraries into separate chunk
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // Redux and state management
          'redux-vendor': ['@reduxjs/toolkit', 'react-redux', 'zustand'],
          // UI components and icons
          'ui-vendor': ['@headlessui/react', '@heroicons/react', 'clsx'],
          // Heavy chess-related libraries (will be lazy-loaded)
          'chess-vendor': ['chess.js', 'react-chessboard'],
          // Emoji picker (will be lazy-loaded)
          'emoji-vendor': ['emoji-picker-react'],
          // Socket.io and networking
          'network-vendor': ['socket.io-client', 'axios'],
          // Utility libraries
          'utils-vendor': ['date-fns', 'react-hot-toast'],
        },
      },
    },
    // Increase chunk size warning limit since we're intentionally splitting
    chunkSizeWarningLimit: 600,
    // Disable modulepreload polyfill to reduce initial bundle
    modulePreload: {
      polyfill: false,
    },
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://backend:3001',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://backend:3001',
        changeOrigin: true,
        ws: true,
      },
    },
  },
});