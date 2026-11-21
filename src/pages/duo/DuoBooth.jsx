import { useCallback, useEffect, useRef, useState } from 'react';
import { navigate, navigateLink } from '../../lib/navigation.js';
import Brand from '../../components/common/Brand.jsx';
import Icon from '../../components/common/Icon.jsx';
import CapturePage from '../capture/CapturePage.jsx';
import TemplatesPage from '../templates/TemplatesPage.jsx';
import { pickerLayouts } from '../../data/templates.js';
import { memePoses } from '../../data/memePoses.js';
import { boothGrid, defaultSeats } from '../../lib/shared-booth.js';
import './DuoBooth.css';

const localRoom = import.meta.env.DEV && !import.meta.env.VITE_PIXBOOTH_API_URL;
const api = (import.meta.env.VITE_PIXBOOTH_API_URL ||
  (localRoom ? '/__duo' : 'https://pixbooth-api.chrbuilds.dev')).replace(/\/$/, '');
const websocket = import.meta.env.VITE_PIXBOOTH_WEBSOCKET_URL || 'wss://realtime.chrbuilds.dev/connection/websocket';

async function request(path, { token, method = 'GET', photo, setup, signal } = {}) {
  const response = await fetch(api + '/api/rooms' + path, {
    method, body: setup ? JSON.stringify(setup) : photo, signal: signal || AbortSignal.timeout(6000),
    headers: {
      ...(token && { Authorization: 'Bearer ' + token }),
      ...(setup && { 'Content-Type': 'application/json' }),
    },
  });
  if (!response.ok) throw Object.assign(new Error('Room request failed'), { status: response.status });
  if (response.status === 204) return;
  return response.headers.get('Content-Type')?.startsWith('application/json')
    ? response.json() : response.blob();
}

async function capture(video, width, height, quality, limit) {
  if (!video?.videoWidth || video.readyState < 2) return null;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const ratio = width / height;
  const sourceWidth = Math.min(video.videoWidth, video.videoHeight * ratio);
  const sourceHeight = sourceWidth / ratio;
  ctx.translate(width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, (video.videoWidth - sourceWidth) / 2, (video.videoHeight - sourceHeight) / 2,
    sourceWidth, sourceHeight, 0, 0, width, canvas.height);
  for (let jpegQuality = quality; jpegQuality >= .39; jpegQuality -= .12) {
    const image = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', jpegQuality));
    if (!image || image.size <= limit) return image;
  }
  return null;
}

function ChoiceContent({ art, title, detail }) {
  return <>
    <img src={import.meta.env.BASE_URL + 'booth-modes/' + art + '.webp'} width="640" height="426" alt="" />
    <strong>{title}</strong>
    <span>{detail}</span>
  </>;
}

function ChoiceScreen({ title, children }) {
  return (
    <main className="duo-page template-main">
      <header className="intro"><Brand /></header>
      <section className="duo-choice-content workflow-step-enter">
        <h1 tabIndex={-1}>{title}</h1>
        {children}
      </section>
    </main>
  );
}

function ChoiceActions({ back, children }) {
  return <div className="duo-choice-actions">
    <a className="button button-outline" href={back} onClick={navigateLink}>Back</a>
    {children}
  </div>;
}

function ChoiceCard({ selected, onClick, disabled, children, ...content }) {
  return <div className="duo-choice" data-selected={selected}>
    <button type="button" className="duo-choice-button" aria-pressed={selected} disabled={disabled} onClick={onClick}>
      <ChoiceContent {...content} />
      {selected && <span className="duo-choice-check"><Icon name="check" size={15} /></span>}
    </button>
    {children}
  </div>;
}

export function BoothMode() {
  const [choice, setChoice] = useState(null);
  return <ChoiceScreen title="Choose how many people are in the booth">
    <div className="duo-choice-grid" role="group" aria-label="Booth mode">
      <ChoiceCard art="solo" title="Solo" detail="Take photos on your own."
        selected={choice === 1} onClick={() => setChoice(1)} />
      <ChoiceCard art="duo" title="Duo" detail="Share a booth with a friend."
        selected={choice === 2} onClick={() => setChoice(2)} />
      <ChoiceCard art="trio" title="Trio" detail="A booth for three people."
        selected={choice === 3} onClick={() => setChoice(3)} />
      <ChoiceCard art="quartet" title="Quartet" detail="A booth for four people."
        selected={choice === 4} onClick={() => setChoice(4)} />
    </div>
    <ChoiceActions back="/">
      <button className="button button-dark" disabled={!choice}
        onClick={() => navigate(choice === 1 ? '/templates' : '/duo?size=' + choice)}>Continue <Icon name="arrow" /></button>
    </ChoiceActions>
  </ChoiceScreen>;
}

export function DuoBooth({ onContinue }) {
  const [room, setRoom] = useState(null);
  const [capacity] = useState(() => {
    if (typeof window === 'undefined') return 2;
    const size = Number(new URLSearchParams(window.location.search).get('size'));
    return [3, 4].includes(size) ? size : 2;
  });
  const [inviteCode] = useState(() => {
    const value = typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('room');
    return /^\d{10}$/.test(value || '') ? value : '';
  });
  const [code, setCode] = useState(inviteCode);
  const [pending, setPending] = useState(Boolean(inviteCode));
  const [error, setError] = useState('');
  const [choice, setChoice] = useState(inviteCode ? 'join' : null);
  const joining = choice === 'join';
  const inviteAttempted = useRef(false);

  const enter = useCallback(async (isJoin, roomId) => {
    setPending(true);
    setError('');
    try {
      const result = await request(isJoin ? '/' + roomId + '/join' : '?size=' + capacity, { method: 'POST' });
      setRoom({ ...result, roomId: result.roomId || roomId, role: result.role || (isJoin ? 'guest' : 'host') });
    } catch (failure) {
      setError(failure.status === 404 ? 'Room closed or code not found.' :
        failure.status === 409 ? 'This room is full.' : 'Could not connect to the booth. Try again.');
    } finally {
      setPending(false);
    }
  }, [capacity]);

  useEffect(() => {
    if (!inviteCode || inviteAttempted.current) return;
    inviteAttempted.current = true;
    enter(true, inviteCode);
  }, [enter, inviteCode]);

  function submit(event) {
    event.preventDefault();
    if (pending || !choice || (joining && code.length !== 10)) return;
    enter(joining, code);
  }

  if (room) return <DuoRoom room={room} onLeave={() => setRoom(null)} onContinue={onContinue} />;
  function select(next) {
    setChoice(next);
    setError('');
  }
  return <ChoiceScreen title="Join a room or start your own">
    <form onSubmit={submit}>
      <div className="duo-choice-grid" role="group" aria-label="Room options">
        <ChoiceCard art="join" title="Join room" detail="Enter the code your friend gives you."
          selected={joining} disabled={pending} onClick={() => select('join')}>
          <div className="duo-room-field">
            <label htmlFor="duo-code">10-digit room code</label>
            <input id="duo-code" inputMode="numeric" autoComplete="off" required={joining} disabled={pending}
              pattern={joining ? '[0-9]{10}' : undefined} maxLength={10} placeholder="1234567890" value={code}
              onFocus={() => { if (!joining) select('join'); }}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))} />
          </div>
        </ChoiceCard>
        <ChoiceCard art="create" title="Create room" detail={'Start a booth for ' + capacity + ' people.'}
          selected={choice === 'create'} disabled={pending} onClick={() => select('create')} />
      </div>
      {error && <p role="alert">{error}</p>}
      <ChoiceActions back="/play">
        <button className="button button-dark" disabled={!choice || pending || (joining && code.length !== 10)}
          aria-busy={pending || undefined} type="submit">
          Continue
          <Icon name="arrow" />
        </button>
      </ChoiceActions>
    </form>
  </ChoiceScreen>;
}

function DuoRoom({ room, onLeave, onContinue }) {
  const { role, roomId, memberToken: token } = room;
  const video = useRef(null);
  const stream = useRef(null);
  const cameraRequest = useRef(0);
  const [camera, setCamera] = useState(false);
  const [opening, setOpening] = useState(false);
  const [remote, setRemote] = useState({});
  const [state, setState] = useState(null);
  const [disconnected, setDisconnected] = useState(false);
  const revision = useRef(0);
  const [countdown, setCountdown] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const call = (suffix, options) => request('/' + roomId + suffix, { token, ...options });
  const last = state?.shots.at(-1);
  const [captured, setCaptured] = useState([]);
  const seats = state?.seats || defaultSeats;
  const template = pickerLayouts.find((layout) => layout.id === state?.setup?.layoutId);
  const prompts = state?.setup?.prompts.map((index) => memePoses[index]) || [];
  const completeCount = state?.shots.filter((shot) => shot.photos.length === seats.length).length || 0;
  const waitingForPhotos = last && last.photos.length < seats.length && state.serverTime < last.captureAt + 12_000;
  const canStart = camera && state?.ready.length === seats.length && !waitingForPhotos && completeCount < template?.count;

  async function leave() {
    await request('/' + roomId + '/leave', { token, method: 'POST' }).catch(() => {});
    onLeave();
  }

  useEffect(() => {
    function notifyPageClose(event) {
      if (event.persisted) return;
      navigator.sendBeacon(api + '/api/rooms/' + roomId + '/leave', token);
    }
    window.addEventListener('pagehide', notifyPageClose);
    return () => window.removeEventListener('pagehide', notifyPageClose);
  }, [roomId, token]);

  function stopCamera() {
    cameraRequest.current++;
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    setCamera(false);
    setOpening(false);
  }

  useEffect(() => () => {
    cameraRequest.current++;
    stream.current?.getTracks().forEach((track) => track.stop());
  }, []);

  async function enableCamera() {
    const attempt = ++cameraRequest.current;
    setOpening(true);
    setError('');
    try {
      const opened = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      if (attempt !== cameraRequest.current || !video.current) {
        opened.getTracks().forEach((track) => track.stop());
        return;
      }
      stream.current = opened;
      video.current.srcObject = opened;
      await video.current.play();
      if (attempt === cameraRequest.current) setCamera(true);
    } catch {
      if (attempt === cameraRequest.current) {
        stopCamera();
        setError('Camera unavailable. Check this site’s camera permission and try again.');
      }
    } finally {
      if (attempt === cameraRequest.current) setOpening(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    const send = (suffix, options) => request('/' + roomId + suffix, {
      token, signal: AbortSignal.any([signal, AbortSignal.timeout(5500)]), ...options,
    });
    let previewUrls = {};
    let refreshTimer;
    let shotTimer;
    let countdownTimer;
    let scheduled;
    let refreshing = false;
    let refreshRequested = false;
    let centrifuge;

    function schedule(snapshot, started) {
      const index = snapshot.shots.length - 1;
      const shot = snapshot.shots[index];
      if (!camera || !shot || shot.captureAt === scheduled || shot.photos.includes(role)) return;
      const received = performance.now();
      const offset = shot.captureAt - snapshot.serverTime - (received - started) / 2;
      if (offset < -700) return;
      const target = received + offset;
      scheduled = shot.captureAt;
      clearTimeout(shotTimer);
      clearInterval(countdownTimer);
      const tick = () => setCountdown(Math.max(1, Math.ceil((target - performance.now()) / 1000)));
      tick();
      countdownTimer = setInterval(tick, 80);
      shotTimer = setTimeout(async () => {
        clearInterval(countdownTimer);
        setCountdown(null);
        try {
          const { columns, rows } = boothGrid((snapshot.seats || defaultSeats).length);
          const photo = await capture(video.current, 2160 / columns, 1620 / rows, 0.94, 256 * 1024);
          if (!photo) throw new Error();
          await send('/photos/' + index + '/' + role + '?at=' + shot.captureAt, { method: 'PUT', photo });
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
        if ((snapshot.revision ?? 0) !== revision.current) {
          revision.current = snapshot.revision;
          clearTimeout(shotTimer);
          clearInterval(countdownTimer);
          setCountdown(null);
          shotUrls.current.forEach(({ url }) => URL.revokeObjectURL(url));
          shotUrls.current = [];
          setCaptured([]);
        }
        setState(snapshot);
        schedule(snapshot, started);
        const previews = await Promise.all(snapshot.ready.filter((peer) => peer !== role).map(async (peer) => {
          const path = snapshot.seats ? '/preview/' + peer : '/preview';
          return [peer, await send(path).catch(() => null)];
        }));
        if (signal.aborted) return;
        Object.values(previewUrls).forEach((url) => URL.revokeObjectURL(url));
        previewUrls = Object.fromEntries(previews.filter(([, photo]) => photo).map(([peer, photo]) =>
          [peer, URL.createObjectURL(photo)]));
        setRemote(previewUrls);
      } catch (failure) {
        if (!signal.aborted && [403, 404].includes(failure.status)) {
          controller.abort();
          clearTimeout(shotTimer);
          clearInterval(countdownTimer);
          setCountdown(null);
          stream.current?.getTracks().forEach((track) => track.stop());
          setCamera(false);
          setState(null);
          setDisconnected(true);
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
        const { columns, rows } = boothGrid(seats.length);
        const width = 840 / columns;
        const photo = await capture(video.current, width, 630 / rows, 0.77, 96 * 1024);
        if (photo) await send('/preview', { method: 'PUT', photo });
      } catch {
        // The next frame replaces a missed preview.
      } finally {
        if (!signal.aborted) previewTimer = setTimeout(uploadPreview, 700);
      }
    }

    if (!localRoom) import('centrifuge').then(({ Centrifuge }) => {
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
      Object.values(previewUrls).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [roomId, token, role, camera, seats.length]);

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

  async function saveSetup(layoutId, posePrompts) {
    setError('');
    try {
      const layout = pickerLayouts.find((item) => item.id === layoutId);
      const updated = await call('/setup', {
        method: 'POST',
        setup: { layoutId, count: layout.count, prompts: posePrompts.map((pose) => memePoses.indexOf(pose)) },
      });
      setState(updated);
    } catch {
      setError('Could not save the shared layout. Try again.');
    }
  }

  useEffect(() => {
    if (completeCount <= captured.length) return;
    const controller = new AbortController();
    let previewUrl;
    let retained = false;
    let retry;
    const index = captured.length;
    async function loadPair() {
      try {
        const images = await Promise.all(seats.map((person) =>
          request('/' + roomId + '/photos/' + index + '/' + person, {
            token, signal: AbortSignal.any([controller.signal, AbortSignal.timeout(6000)]),
          })));
        const photos = await Promise.all(images.map((blob) => createImageBitmap(blob)));
        const canvas = document.createElement('canvas');
        const width = photos[0].width;
        const height = photos[0].height;
        const { columns, rows } = boothGrid(seats.length);
        canvas.width = width * columns;
        canvas.height = height * rows;
        const ctx = canvas.getContext('2d');
        photos.forEach((photo, position) => {
          ctx.drawImage(photo, position % columns * width, Math.floor(position / columns) * height, width, height);
          photo.close();
        });
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.94));
        if (controller.signal.aborted) return;
        if (!blob) throw new Error();
        previewUrl = URL.createObjectURL(blob);
        setCaptured((items) => [...items, { type: 'photo', url: previewUrl, blob }]);
        retained = true;
      } catch {
        if (!controller.signal.aborted) retry = setTimeout(loadPair, 1500);
      }
    }
    loadPair();
    return () => {
      controller.abort();
      clearTimeout(retry);
      if (previewUrl && !retained) URL.revokeObjectURL(previewUrl);
    };
  }, [completeCount, captured.length, roomId, token, seats.length, state?.revision]);

  const shotUrls = useRef([]);
  shotUrls.current = captured;
  useEffect(() => () => {
    shotUrls.current.forEach(({ url }) => URL.revokeObjectURL(url));
  }, []);

  if (disconnected) return <ChoiceScreen title="This room is no longer connected">
    <div className="duo-choice-actions"><button className="button button-outline" onClick={onLeave}>Back</button></div>
  </ChoiceScreen>;
  if (!template && role === 'host') return <TemplatesPage duo setupError={error} onContinue={saveSetup} onBack={leave} />;
  if (!template) return <ChoiceScreen title="Waiting for your host">
    <p>Your camera will open for setup once your friend picks a style and layout.</p>
    {error && <p role="alert">{error}</p>}
    <button className="button button-outline" onClick={leave}>Back</button>
  </ChoiceScreen>;

  const completed = captured.length === template.count;
  return <div className="app booth-app duo-capture-app">
    <CapturePage
      posePrompts={prompts}
      duo={{
        roomCode: roomId,
        canInvite: role === 'host',
        onBack: leave,
        split: {
          role, remote, seats,
          members: state.members || (state.guestJoined ? defaultSeats : ['host']),
        },
        onContinue: () => onContinue(template.id, captured.map(({ blob, ...shot }) => ({
          ...shot, url: URL.createObjectURL(blob),
        })), prompts),
      }}
      session={{
        template, shots: captured, completed, countdown, video, busy: busy || Boolean(waitingForPhotos),
        status: opening ? 'loading' : camera ? 'ready' : 'idle',
        cameraActive: camera, mirror: true, mode: 'photo', sticker: 'none', stickerReady: canStart && !busy,
        openCamera: enableCamera, stopCamera, takePhoto: start, error,
      }}
    />
  </div>;
}
