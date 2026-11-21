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
  assert.equal((await call('', 'GET', owner.memberToken)).status, 200);
  now += 15 * 60_000;
  assert.equal((await call('', 'GET', owner.memberToken)).status, 404);
});

test('Trio and Quartet reopen departed seats and keep photos private from replacement guests', async (t) => {
  let now = 10_000;
  const origin = 'https://example.com';
  const server = createBoothServer({ origins: [origin], now: () => now, realtime: async () => ({}) })
    .listen(0, '127.0.0.1');
  t.after(() => new Promise((resolve) => server.close(resolve)));
  await once(server, 'listening');
  const base = 'http://127.0.0.1:' + server.address().port + '/api/rooms';
  const call = (path, method = 'GET', token, body, contentType) => fetch(base + path, {
    method, body,
    headers: { Origin: origin, ...(token && { Authorization: 'Bearer ' + token }),
      ...(contentType && { 'Content-Type': contentType }) },
  });
  const jpeg = Buffer.from([255, 216, 255, 217]);

  for (const size of [3, 4]) {
    const host = await (await call('?size=' + size, 'POST')).json();
    const path = '/' + host.roomId;
    const guests = [];
    async function join() {
      const response = await call(path + '/join', 'POST');
      assert.equal(response.status, 201);
      return response.json();
    }
    for (let slot = 1; slot < size; slot++) guests.push(await join());
    assert.equal((await call(path + '/join', 'POST')).status, 409);
    for (const member of [host, ...guests].slice(0, -1)) {
      assert.equal((await call(path + '/preview', 'PUT', member.memberToken, jpeg, 'image/jpeg')).status, 204);
    }
    assert.equal((await call(path + '/start', 'POST', host.memberToken)).status, 409);
    assert.equal((await call(path + '/preview', 'PUT', guests.at(-1).memberToken, jpeg, 'image/jpeg')).status, 204);
    assert.equal((await call(path + '/preview/' + guests.at(-1).role, 'GET', host.memberToken)).status, 200);
    const shot = await (await call(path + '/start', 'POST', guests.at(-1).memberToken)).json();
    now = shot.captureAt;
    for (const member of [host, ...guests]) {
      assert.equal((await call(path + '/photos/0/' + member.role + '?at=' + shot.captureAt, 'PUT',
        member.memberToken, jpeg, 'image/jpeg')).status, 200);
    }

    const departed = guests[0];
    assert.equal((await call(path + '/leave', 'POST', undefined, departed.memberToken, 'text/plain')).status, 204);
    const state = await (await call(path, 'GET', host.memberToken)).json();
    assert.equal(state.members.length, size - 1);
    assert.equal(state.ready.includes(departed.role), false);
    assert.equal((await call(path, 'GET', departed.memberToken)).status, 403);
    const replacement = await join();
    assert.equal(replacement.role, departed.role);
    const newState = await (await call(path, 'GET', replacement.memberToken)).json();
    assert.deepEqual(newState.shots, []);
    assert.equal((await call(path + '/photos/0/' + departed.role, 'GET', replacement.memberToken)).status, 404);

    now += 30_000;
    const timedOut = await join();
    assert.equal(timedOut.role, 'guest');
    assert.equal((await call(path + '/leave', 'POST', host.memberToken)).status, 204);
    assert.equal((await call(path, 'GET', timedOut.memberToken)).status, 404);
  }
});
