import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const SERVER = process.env.GAME_SERVER ?? 'http://localhost:3001';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // reachable from phones on the LAN
    proxy: {
      '/socket.io': { target: SERVER, ws: true },
      '/themes': SERVER,
    },
  },
  test: {
    name: 'client',
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
  },
});
