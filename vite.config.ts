import { defineConfig } from 'vite';
export default defineConfig({
  server: { host: '127.0.0.1', port: 5173, strictPort: true, proxy: { '/api': 'http://127.0.0.1:4318', '/assets/modules':'http://127.0.0.1:4318' } },
  build: { chunkSizeWarningLimit: 650, rollupOptions: { output: { manualChunks: { three: ['three'] } } } }
});
