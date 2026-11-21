import { useEffect, useRef, useState } from 'react';
import { navigateLink } from '../../lib/navigation.js';
import './DuoBooth.css';

const api = (import.meta.env.VITE_PIXBOOTH_API_URL || 'https://pixbooth-api.chrbuilds.dev').replace(/\/$/, '');
const websocket = import.meta.env.VITE_PIXBOOTH_WEBSOCKET_URL || 'wss://realtime.chrbuilds.dev/connection/websocket';

async function request(path, { token, method = 'GET', photo, signal } = {}) {
  const response = await fetch(api + '/api/rooms' + path, {
    method, body: photo, signal: signal || AbortSignal.timeout(6000),
    headers: token ? { Authorization: 'Bearer ' + token } : undefined,
  });
  if (!response.ok) throw Object.assign(new Error('Room request failed'), { status: response.status });
  if (response.status === 204) return;
  return response.headers.get('Content-Type')?.startsWith('application/json')
    ? response.json() : response.blob();
}

function capture(video, width, quality) {
  if (!video?.videoWidth || video.readyState < 2) return Promise.resolve(null);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = Math.round(width * 1.5);
  const ctx = canvas.getContext('2d');
  const sourceWidth = Math.min(video.videoWidth, video.videoHeight / 1.5);
  const sourceHeight = sourceWidth * 1.5;
  ctx.translate(width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, (video.videoWidth - sourceWidth) / 2, (video.videoHeight - sourceHeight) / 2,
    sourceWidth, sourceHeight, 0, 0, width, canvas.height);
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
}

export function BoothMode() {
  return (
    <main className="duo-page">
      <a href="/" onClick={navigateLink}>Back</a>
      <h1 tabIndex={-1}>Who’s in the booth?</h1>
      <div className="duo-actions">
        <a className="button" href="/templates" onClick={navigateLink}>Solo</a>
        <a className="button button-outline" href="/duo" onClick={navigateLink}>Duo</a>
      </div>
    </main>
  );
}

export function DuoBooth() {
  const [room, setRoom] = useState(null);
  const [code, setCode] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function enter(event, joining) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError('');
    try {
      const roomId = code.replace(/\s/g, '');
      const result = await request(joining ? '/' + roomId + '/join' : '', { method: 'POST' });
      setRoom({ ...result, roomId: result.roomId || roomId, role: joining ? 'guest' : 'host' });
    } catch (failure) {
      setError(failure.status === 404 ? 'Room closed or code not found.' :
        failure.status === 409 ? 'This room already has two people.' : 'Could not connect to the booth. Try again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="duo-page">
      <a href="/play" onClick={navigateLink}>Back to Solo or Duo</a>
      <h1 tabIndex={-1}>Duo booth</h1>
      {room ? <DuoRoom room={room} onLeave={() => setRoom(null)} /> : (
        <div className="duo-actions">
          <button className="button" disabled={pending} onClick={(event) => enter(event, false)}>Create room</button>
          <form onSubmit={(event) => enter(event, true)}>
            <label htmlFor="duo-code">Room code</label>
            <div className="duo-actions">
              <input id="duo-code" inputMode="numeric" autoComplete="off" required pattern="[0-9]{10}"
                maxLength={10} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))} />
              <button className="button button-outline" disabled={pending} type="submit">Join room</button>
            </div>
          </form>
        </div>
      )}
      {error && <p role="alert">{error}</p>}
    </main>
  );
}

function DuoRoom({ room, onLeave }) {
  const { role, roomId, memberToken: token } = room;
  const video = useRef(null);
  const stream = useRef(null);
  const [camera, setCamera] = useState(false);
  const [opening, setOpening] = useState(false);
  const [remote, setRemote] = useState('');
  const [state, setState] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const call = (suffix, options) => request('/' + roomId + suffix, { token, ...options });
  const last = state?.shots.at(-1);
  const completeIndex = state?.shots.findLastIndex((shot) => shot.photos.length === 2) ?? -1;
  const waitingForPhotos = last && last.photos.length < 2 && state.serverTime < last.captureAt + 12_000;
  const canStart = camera && state?.ready.length === 2 && !waitingForPhotos && state.shots.length < 4;

  useEffect(() => () => {
    stream.current?.getTracks().forEach((track) => track.stop());
  }, []);

  async function enableCamera() {
    setOpening(true);
    setError('');
    try {
      const opened = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      if (!video.current) {
        opened.getTracks().forEach((track) => track.stop());
        return;
      }
      stream.current = opened;
      video.current.srcObject = opened;
      await video.current.play();
      setCamera(true);
    } catch {
      stream.current?.getTracks().forEach((track) => track.stop());
      setError('Camera unavailable. Check this site’s camera permission and try again.');
    } finally {
      setOpening(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    const send = (suffix, options) => request('/' + roomId + suffix, {
      token, signal: AbortSignal.any([signal, AbortSignal.timeout(5500)]), ...options,
    });
    let previewUrl;
    let refreshTimer;
    let shotTimer;
    let countdownTimer;
    let scheduled = -1;
    let refreshing = false;
    let refreshRequested = false;
    let centrifuge;

    function schedule(snapshot, started) {
      const index = snapshot.shots.length - 1;
      const shot = snapshot.shots[index];
      if (!camera || !shot || index === scheduled || shot.photos.includes(role)) return;
      const received = performance.now();
      const offset = shot.captureAt - snapshot.serverTime - (received - started) / 2;
      if (offset < -700) return;
      const target = received + offset;
      scheduled = index;
      clearTimeout(shotTimer);
      clearInterval(countdownTimer);
      const tick = () => setCountdown(Math.max(1, Math.ceil((target - performance.now()) / 1000)));
      tick();
      countdownTimer = setInterval(tick, 80);
      shotTimer = setTimeout(async () => {
        clearInterval(countdownTimer);
        setCountdown(null);
        try {
          const photo = await capture(video.current, 560, 0.78);
          if (!photo) throw new Error();
          await send('/photos/' + index + '/' + role, { method: 'PUT', photo });
          refresh();
        } catch {
          if (!signal.aborted) setError('Your photo didn’t reach the booth. Try the next shot.');
        }
      }, Math.max(0, offset));
    }

    async function refresh() {
      if (signal.aborted) return;
      if (refreshing) {
        refreshRequested = true;
        return;
      }
      refreshing = true;
      clearTimeout(refreshTimer);
      try {
        const started = performance.now();
        const snapshot = await send('');
        if (signal.aborted) return;
        setState(snapshot);
        schedule(snapshot, started);
        const peer = role === 'host' ? 'guest' : 'host';
        const preview = snapshot.ready.includes(peer) ? await send('/preview').catch(() => null) : null;
        if (signal.aborted) return;
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        previewUrl = preview ? URL.createObjectURL(preview) : '';
        setRemote(previewUrl);
      } catch (failure) {
        if (!signal.aborted && failure.status === 404) {
          stream.current?.getTracks().forEach((track) => track.stop());
          setCamera(false);
          setState(null);
          setError('This room has closed. Leave and create or join another room.');
          controller.abort();
        }
      } finally {
        refreshing = false;
        if (!signal.aborted) {
          refreshTimer = setTimeout(refresh, refreshRequested ? 0 : 850);
          refreshRequested = false;
        }
      }
    }

    let previewTimer;
    async function uploadPreview() {
      try {
        const photo = await capture(video.current, 160, 0.55);
        if (photo) await send('/preview', { method: 'PUT', photo });
      } catch {
        // The next frame replaces a missed preview.
      } finally {
        if (!signal.aborted) previewTimer = setTimeout(uploadPreview, 700);
      }
    }

    import('centrifuge').then(({ Centrifuge }) => {
      if (signal.aborted) return;
      centrifuge = new Centrifuge(websocket, {
        getToken: async () => (await send('/token', { method: 'POST' })).token,
      });
      centrifuge.on('publication', refresh);
      centrifuge.connect();
    }).catch(() => {});
    refresh();
    if (camera) uploadPreview();
    return () => {
      controller.abort();
      centrifuge?.disconnect();
      clearTimeout(refreshTimer);
      clearTimeout(previewTimer);
      clearTimeout(shotTimer);
      clearInterval(countdownTimer);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [roomId, token, role, camera]);

  async function start() {
    setBusy(true);
    setError('');
    try {
      await call('/start', { method: 'POST' });
    } catch (failure) {
      if (failure.status !== 409) setError('Could not start the countdown. Try again.');
    } finally {
      setBusy(false);
    }
  }

  async function download() {
    setBusy(true);
    try {
      const photos = await Promise.all(['host', 'guest'].map(async (person) =>
        createImageBitmap(await call('/photos/' + completeIndex + '/' + person))));
      const canvas = document.createElement('canvas');
      const width = photos[0].width;
      canvas.width = width * 2;
      canvas.height = photos[0].height;
      const ctx = canvas.getContext('2d');
      photos.forEach((photo, index) => {
        ctx.drawImage(photo, index * width, 0);
        photo.close();
      });
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/jpeg', 0.94);
      link.download = 'pixbooth-duo-' + (completeIndex + 1) + '.jpg';
      link.click();
    } catch {
      setError('Could not download the picture. Try again.');
    } finally {
      setBusy(false);
    }
  }

  const pane = (position, label) => (
    <div className="duo-pane">
      {role === position ? <video ref={video} autoPlay muted playsInline /> :
        remote ? <img src={remote} alt="" /> : <span className="duo-empty">{state?.guestJoined ? 'Camera off' : 'Waiting for a friend'}</span>}
      <span className="duo-person">{label}{role === position ? ' · You' : ''}</span>
    </div>
  );

  return (
    <>
      <div className="duo-room-bar">
        <span>Room <strong>{roomId}</strong></span>
        <button className="button button-outline" onClick={async () => {
          try {
            await navigator.clipboard.writeText(roomId);
            setCopied(true);
          } catch {
            setError('Copy the room code shown above.');
          }
        }}>{copied ? 'Copied' : 'Copy code'}</button>
        <button className="button button-outline" onClick={onLeave}>Leave</button>
      </div>
      <div className="duo-view">
        {pane('host', 'Person 1')}
        {pane('guest', 'Person 2')}
        {countdown !== null && <span className="duo-countdown" aria-live="polite">{countdown}</span>}
      </div>
      <div className="duo-actions duo-controls">
        {!camera && <button className="button button-outline" disabled={opening} onClick={enableCamera}>
          {opening ? 'Opening camera…' : 'Enable camera'}
        </button>}
        <button className="button duo-shutter" onClick={start} disabled={!canStart || busy}>Take photo</button>
        {completeIndex >= 0 && <button className="button button-outline" onClick={download} disabled={busy}>Download photo</button>}
      </div>
      <p role="status">{waitingForPhotos ? 'Shared shot in progress' : state?.shots.length === 4 ?
        'All four shots taken' : canStart ? 'Both cameras ready' : 'Both cameras must be on to take a photo'}</p>
      {error && <p role="alert">{error}</p>}
    </>
  );
}
