import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
    strictPort: true,
    proxy: {
      '/get-direct-url': 'http://localhost:4000',
      '/stream-video': 'http://localhost:4000',
      '/search': 'http://localhost:4000'
    }
  }
});
