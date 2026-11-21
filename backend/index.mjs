import { createBoothServer } from './server.mjs';

const { REALTIME_API_URL, REALTIME_API_KEY, PIXBOOTH_ORIGINS, PORT = '3000' } = process.env;
if (!REALTIME_API_URL || !REALTIME_API_KEY || !PIXBOOTH_ORIGINS) {
  throw new Error('Set REALTIME_API_URL, REALTIME_API_KEY and PIXBOOTH_ORIGINS');
}

const server = createBoothServer({
  origins: PIXBOOTH_ORIGINS.split(',').map((origin) => origin.trim()),
  async realtime(path, data) {
    const response = await fetch(new URL(path, REALTIME_API_URL), {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + REALTIME_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) throw new Error('Realtime request failed');
    return response.json();
  },
});

server.listen(Number(PORT), '0.0.0.0');
process.on('SIGTERM', () => server.close());
