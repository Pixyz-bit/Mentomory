import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';
import { createBoothServer } from '../backend/server.mjs';

test('Duo lets either member fire one shutter and closes empty rooms after 15 minutes', async (t) => {
  const origin = 'https://example.com';
  let now = 10_000;
  const events = [];
  const server = createBoothServer({
    origins: [origin], now: () => now,
    async realtime(endpoint, data) {
      events.push([endpoint, data]);
      return { token: 'test-token' };
    },
  }).listen(0, '127.0.0.1');
  t.after(() => new Promise((resolve) => server.close(resolve)));
  await once(server, 'listening');
  const jpeg = Buffer.from([255, 216, 255, 217]);
  const base = 'http://127.0.0.1:' + server.address().port + '/api/rooms';
  let roomPath = '';
  const call = (path, method = 'GET', token, body) => fetch(base + roomPath + path, {
    method, body,
    headers: {
      Origin: origin,
      ...(token && { Authorization: 'Bearer ' + token }),
      ...(body && { 'Content-Type': 'image/jpeg' }),
    },
  });
  const owner = await (await call('', 'POST')).json();
  assert.match(owner.roomId, /^\d{10}$/);
  roomPath = '/' + owner.roomId;
  assert.equal((await call('')).status, 403);
  assert.equal((await call('/start', 'POST', owner.memberToken)).status, 409);
  const guest = await (await call('/join', 'POST')).json();
  assert.equal((await call('/join', 'POST')).status, 409);
  const setup = { layoutId: 'single', count: 1, prompts: [0] };
  const configure = (token, body) => fetch(base + roomPath + '/setup', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { Origin: origin, Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
  });
  assert.equal((await configure(guest.memberToken, setup)).status, 403);
  assert.equal((await configure(owner.memberToken, { ...setup, count: 5 })).status, 400);
  assert.equal((await configure(owner.memberToken, setup)).status, 200);
  assert.deepEqual((await (await call('', 'GET', guest.memberToken)).json()).setup, setup);
  assert.equal((await call('/token', 'POST', guest.memberToken)).status, 200);
  assert.deepEqual(events.find(([path]) => path === '/token')[1].channels, ['pixbooth/room/' + owner.roomId]);

  for (const token of [owner.memberToken, guest.memberToken]) {
    assert.equal((await call('/preview', 'PUT', token, jpeg)).status, 204);
  }

  const results = await Promise.all([
    call('/start', 'POST', guest.memberToken),
    call('/start', 'POST', owner.memberToken),
  ]);
  assert.deepEqual(results.map(({ status }) => status).sort(), [201, 409]);
  const shot = await results.find(({ status }) => status === 201).json();
  assert.equal(shot.captureAt, now + 5000);
  assert.equal(events.filter(([, event]) => event.data?.type === 'capture').length, 1);
  assert.equal((await call('/photos/0/host', 'PUT', owner.memberToken, jpeg)).status, 409);
  now = shot.captureAt;
  assert.equal((await call('/photos/0/host', 'PUT', guest.memberToken, jpeg)).status, 403);
  assert.equal((await call('/photos/0/host', 'PUT', owner.memberToken, jpeg)).status, 200);
  assert.equal((await call('/photos/0/guest', 'PUT', guest.memberToken, jpeg)).status, 200);
  assert.equal((await call('/start', 'POST', guest.memberToken)).status, 409);
  assert.deepEqual(Buffer.from(await (await call('/photos/0/host', 'GET', guest.memberToken)).arrayBuffer()), jpeg);

  now += 14 * 60_000;
  assert.equal((await call('', 'GET', guest.memberToken)).status, 200);
  now += 15 * 60_000;
  assert.equal((await call('', 'GET', owner.memberToken)).status, 404);
});
