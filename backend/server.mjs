import { createServer } from 'node:http';
import { randomBytes, randomInt } from 'node:crypto';

const roomLifetime = 15 * 60 * 1000;
const guestLifetime = 30_000;
const seats = ['host', 'guest', 'guest2', 'guest3'];
const id = () => randomBytes(24).toString('base64url');
const fail = (status) => Object.assign(new Error(), { status });

async function readText(request, limit) {
  let body = '';
  for await (const chunk of request.iterator({ destroyOnReturn: false })) {
    body += chunk.toString();
    if (body.length > limit) {
      request.resume();
      throw fail(413);
    }
  }
  return body;
}

async function readPhoto(request, limit) {
  if (request.headers['content-type'] !== 'image/jpeg') throw fail(415);
  const chunks = [];
  let size = 0;
  for await (const chunk of request.iterator({ destroyOnReturn: false })) {
    size += chunk.length;
    if (size > limit) {
      request.resume();
      throw fail(413);
    }
    chunks.push(chunk);
  }
  const photo = Buffer.concat(chunks);
  if (size < 4 || photo.readUInt16BE(0) !== 0xffd8 || photo.readUInt16BE(size - 2) !== 0xffd9) {
    throw fail(400);
  }
  return photo;
}

export function createBoothServer({ origins, realtime, now = Date.now }) {
  const rooms = new Map();
  const sweep = setInterval(() => {
    for (const [key, room] of rooms) {
      if (room.expiresAt <= now()) rooms.delete(key);
    }
  }, 60_000);
  sweep.unref();

  const server = createServer(async (request, response) => {
    const send = (status, value) => {
      response.writeHead(status, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify(value));
    };
    const origin = request.headers.origin;
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Vary', 'Origin');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    if (origin) {
      if (!origins.includes(origin)) return send(403, { error: 'Origin denied' });
      response.setHeader('Access-Control-Allow-Origin', origin);
      response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
      response.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    }
    if (request.method === 'OPTIONS') return send(204);
    const path = request.url.split('?')[0];
    if (request.method === 'GET' && path === '/health') return send(200, { status: 'ok' });

    try {
      if (request.method === 'POST' && path === '/api/rooms') {
        if (!origins.includes(origin)) throw fail(403);
        if (rooms.size >= 10) throw fail(503);
        const capacity = Number(new URL(request.url, 'http://localhost').searchParams.get('size') ?? 2);
        if (![2, 3, 4].includes(capacity)) throw fail(400);
        let roomId;
        do {
          roomId = String(randomInt(1_000_000_000, 10_000_000_000));
        } while (rooms.has(roomId));
        const host = id();
        rooms.set(roomId, {
          host, seats: seats.slice(0, capacity), guests: new Map(), previews: {}, shots: [],
          revision: 0, needsReset: false, expiresAt: now() + roomLifetime,
        });
        return send(201, { roomId, memberToken: host, role: 'host' });
      }
      const route = /^\/api\/rooms\/(\d{10})(?:\/(join|leave|setup|start|token|preview|photos))?(?:\/(?:(\d+)\/)?(host|guest[23]?))?$/.exec(path);
      if (!route) throw fail(404);
      const [, roomId, action, shotIndex, role] = route;
      if ((action === 'photos') !== (shotIndex !== undefined) || (role && !['preview', 'photos'].includes(action))) {
        throw fail(404);
      }
      const room = rooms.get(roomId);
      if (!room || room.expiresAt <= now()) throw fail(404);
      const channel = 'pixbooth/room/' + roomId;
      const publish = (data) => realtime('/publish', { channel, data });
      function removeGuest(seat) {
        room.guests.delete(seat);
        delete room.previews[seat];
        if (room.shots.length) {
          if (Object.keys(room.shots.at(-1).photos).length < room.seats.length) room.shots.pop();
          room.needsReset = room.shots.length > 0;
          room.revision++;
        }
        publish({ type: 'left' }).catch(() => {});
      }
      for (const [seat, guest] of room.guests) {
        if (now() - guest.lastSeen >= guestLifetime) removeGuest(seat);
      }
      if (request.method === 'POST' && action === 'join') {
        if (!origins.includes(origin)) throw fail(403);
        const seat = room.seats.slice(1).find((candidate) => !room.guests.has(candidate));
        if (!seat) throw fail(409);
        if (room.needsReset) {
          room.shots = [];
          room.revision++;
          room.needsReset = false;
        }
        const memberToken = id();
        room.guests.set(seat, { token: memberToken, lastSeen: now() });
        publish({ type: 'joined' }).catch(() => {});
        return send(201, { memberToken, role: seat });
      }
      const leaving = request.method === 'POST' && action === 'leave';
      let credential = request.headers.authorization?.match(/^Bearer ([\w-]{32})$/)?.[1];
      if (leaving && !credential && origins.includes(origin)) credential = await readText(request, 32);
      const member = credential === room.host ? 'host' :
        [...room.guests].find(([, guest]) => guest.token === credential)?.[0];
      if (!member) throw fail(403);
      if (leaving) {
        if (member === 'host') {
          rooms.delete(roomId);
          publish({ type: 'closed' }).catch(() => {});
        } else removeGuest(member);
        return send(204);
      }
      room.expiresAt = now() + roomLifetime;
      if (member !== 'host') room.guests.get(member).lastSeen = now();

      const stillMember = () => rooms.get(roomId) === room &&
        (member === 'host' || room.guests.get(member)?.token === credential);
      const ready = () => Object.keys(room.previews).filter((role) => now() - room.previews[role].at < 5000);
      const image = (photo) => {
        response.writeHead(200, { 'Content-Type': 'image/jpeg' });
        response.end(photo);
      };
      const state = () => ({
        guestJoined: room.guests.size > 0,
        members: ['host', ...room.guests.keys()],
        seats: room.seats,
        revision: room.revision,
        setup: room.setup,
        ready: ready(),
        serverTime: now(),
        shots: room.shots.map(({ captureAt, photos }) => ({ captureAt, photos: Object.keys(photos) })),
      });

      if (request.method === 'GET' && !action) return send(200, state());
      if (request.method === 'POST' && action === 'setup') {
        if (member !== 'host') throw fail(403);
        if (room.shots.length) throw fail(409);
        const body = await readText(request, 1024);
        if (!stillMember() || room.shots.length) throw fail(409);
        let setup;
        try { setup = JSON.parse(body); } catch { throw fail(400); }
        if (!setup || typeof setup.layoutId !== 'string' || !/^[a-z0-9-]{1,48}$/.test(setup.layoutId) ||
            !Number.isInteger(setup.count) || setup.count < 1 || setup.count > 4 ||
            !Array.isArray(setup.prompts) || ![0, setup.count].includes(setup.prompts.length) ||
            !setup.prompts.every((index) => Number.isInteger(index) && index >= 0 && index < 256)) throw fail(400);
        room.setup = { layoutId: setup.layoutId, count: setup.count, prompts: setup.prompts };
        publish({ type: 'setup' }).catch(() => {});
        return send(200, state());
      }
      if (request.method === 'POST' && action === 'token') {
        return send(200, await realtime('/token', { channels: [channel], userId: roomId + '-' + member }));
      }
      if (action === 'preview') {
        if (request.method === 'PUT' && !role) {
          const photo = await readPhoto(request, 96 * 1024);
          if (!stillMember()) throw fail(403);
          room.previews[member] = { photo, at: now() };
          return send(204);
        }
        const peer = role ?? (member === 'host' ? 'guest' : 'host');
        if (request.method === 'GET' && peer !== member && ready().includes(peer)) return image(room.previews[peer].photo);
        throw fail(404);
      }
      if (request.method === 'POST' && action === 'start') {
        const previous = room.shots.at(-1);
        const incomplete = previous && Object.keys(previous.photos).length !== room.seats.length;
        if (ready().length !== room.seats.length ||
            (incomplete ? now() < previous.captureAt + 12_000 : room.shots.length >= (room.setup?.count ?? 4))) {
          throw fail(409);
        }
        const shot = { captureAt: now() + 5000, photos: {} };
        if (incomplete) room.shots.pop();
        const index = room.shots.push(shot) - 1;
        publish({ type: 'capture', index, captureAt: shot.captureAt }).catch(() => {});
        return send(201, { index, captureAt: shot.captureAt });
      }
      if (action !== 'photos' || shotIndex === undefined) throw fail(404);
      const shot = room.shots[Number(shotIndex)];
      if (!shot) throw fail(404);
      if (request.method === 'PUT') {
        if (role !== member) throw fail(403);
        const captureTime = new URL(request.url, 'http://localhost').searchParams.get('at');
        if (captureTime !== null && Number(captureTime) !== shot.captureAt) throw fail(409);
        // Clients estimate the server clock from request round trips.
        if (now() < shot.captureAt - 250 || now() > shot.captureAt + 12_000) throw fail(409);
        const photo = await readPhoto(request, 256 * 1024);
        if (!stillMember()) throw fail(403);
        if (shot !== room.shots[Number(shotIndex)]) throw fail(409);
        shot.photos[member] ??= photo;
        publish({ type: 'photo', index: Number(shotIndex), member }).catch(() => {});
        return send(200, state());
      }
      if (request.method === 'GET' && shot.photos[role]) {
        return image(shot.photos[role]);
      }
      throw fail(404);
    } catch (error) {
      const status = error.status || 502;
      return send(status, { error: status === 502 ? 'Realtime service unavailable' : 'Room request rejected' });
    }
  });
  server.on('close', () => clearInterval(sweep));
  return server;
}
