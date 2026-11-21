import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { createBoothServer } from './backend/server.mjs';

const localDuo = {
  name: 'local-duo',
  configureServer(server) {
    const port = server.config.server.port;
    const api = createBoothServer({
      origins: ['http://localhost:' + port, 'http://127.0.0.1:' + port],
      realtime: async () => ({}),
    });
    server.middlewares.use('/__duo', (request, response) => api.emit('request', request, response));
    server.httpServer?.once('close', () => api.emit('close'));
  },
};

export default defineConfig({
  plugins: [react(), tailwindcss(), localDuo],
  server: {
    port: 5174,
  },
});
