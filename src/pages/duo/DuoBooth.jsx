import { useCallback, useEffect, useRef, useState } from 'react';
import { navigate, navigateLink } from '../../lib/navigation.js';
import Brand from '../../components/common/Brand.jsx';
import Icon from '../../components/common/Icon.jsx';
import CapturePage from '../capture/CapturePage.jsx';
import TemplatesPage from '../templates/TemplatesPage.jsx';
import { pickerLayouts } from '../../data/templates.js';
import { memePoses } from '../../data/memePoses.js';
import { boothGrid, defaultSeats, sharedFilters } from '../../lib/shared-booth.js';
import { createLivePreview } from '../../lib/booth-live-preview.js';
import useBackgroundBlur from '../../hooks/useBackgroundBlur.js';
import { useFaceStickers } from '../../hooks/useFaceStickers.js';
import './DuoBooth.css';

const localRoom = import.meta.env.DEV && !import.meta.env.VITE_PIXBOOTH_API_URL;
const api = (import.meta.env.VITE_PIXBOOTH_API_URL ||
  (localRoom ? '/__duo' : 'https://pixbooth-api.chrbuilds.dev')).replace(/\/$/, '');
const websocket = import.meta.env.VITE_PIXBOOTH_WEBSOCKET_URL || 'wss://realtime.chrbuilds.dev/connection/websocket';

async function request(path, { token, method = 'GET', photo, data, signal } = {}) {
  const response = await fetch(api + '/api/rooms' + path, {
    method, body: data ? JSON.stringify(data) : photo, signal: signal || AbortSignal.timeout(6000),
    headers: {
      ...(token && { Authorization: 'Bearer ' + token }),
      ...(data && { 'Content-Type': 'application/json' }),
    },
  });
  if (!response.ok) throw Object.assign(new Error('Room request failed'), { status: response.status });
  if (response.status === 204) return;
  return response.headers.get('Content-Type')?.startsWith('application/json')
    ? response.json() : response.blob();
}

async function capture(video, width, height, quality, limit, { filter = 'none', background, overlay } = {}) {
  if (!video?.videoWidth || video.readyState < 2) return null;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.filter = filter;
  const ratio = width / height;
  ctx.translate(width, 0);
  ctx.scale(-1, 1);
  function draw(source, w, h) {
    const sourceWidth = Math.min(w, h * ratio);
    const sourceHeight = sourceWidth / ratio;
    ctx.drawImage(source, (w - sourceWidth) / 2, (h - sourceHeight) / 2,
      sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);
  }
  if (background) draw(background, background.width, background.height);
  else draw(video, video.videoWidth, video.videoHeight);
  if (overlay) draw(overlay, overlay.width, overlay.height);
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

function ChoiceScreen({ title, children, modePicker = false }) {
  return (
    <main className={modePicker ? 'duo-page template-main booth-mode-picker' : 'duo-page template-main'}>
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
  return <ChoiceScreen title="Choose how many people are in the booth" modePicker>
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
  const effectTrack = useRef(null);
  const livePreview = useRef(null);
  const overlay = useRef(null);
  const cameraRequest = useRef(0);
  const [camera, setCamera] = useState(false);
  const [opening, setOpening] = useState(false);
  const [remote, setRemote] = useState({});
  const [liveStreams, setLiveStreams] = useState({});
  const [showVideoStats] = useState(() => typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('videoStats') === '1');
  const [videoStats, setVideoStats] = useState({});
  const [state, setState] = useState(null);
  const [disconnected, setDisconnected] = useState(false);
  const revision = useRef(0);
  const [countdown, setCountdown] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [localFilter, setLocalFilter] = useState('none');
  const [blur, setBlur] = useState(false);
  const [faceEffect, setFaceEffect] = useState('none');
  const [effectsBroadcast, setEffectsBroadcast] = useState(true);
  const backgroundBlur = useBackgroundBlur(video, camera && blur, 640);
  const face = useFaceStickers(video, overlay, camera, faceEffect, 640);
  const effects = useRef({});
  effects.current = {
    background: blur && backgroundBlur.status === 'ready' ? backgroundBlur.canvas.current : null,
    overlay: faceEffect !== 'none' ? overlay.current : null,
  };
  const effectsActive = camera && (blur || faceEffect !== 'none');
  const filterRef = useRef('none');
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

  useEffect(() => {
    if (!effectsActive) return;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { alpha: false });
    if (!context || !canvas.captureStream) {
      setEffectsBroadcast(false);
      return;
    }
    setEffectsBroadcast(true);
    let frame;
    let renderedAt = -Infinity;
    let lastVideoTime = -1;
    const useTrack = (track) => {
      effectTrack.current = track;
      livePreview.current?.setVideoTrack(track);
    };
    function draw(now) {
      frame = requestAnimationFrame(draw);
      const source = video.current;
      if (!source?.videoWidth || source.readyState < 2 || source.currentTime === lastVideoTime || now - renderedAt < 30) return;
      renderedAt = now;
      lastVideoTime = source.currentTime;
      const scale = Math.min(1, 640 / source.videoWidth, 360 / source.videoHeight);
      const width = Math.max(1, Math.round(source.videoWidth * scale));
      const height = Math.max(1, Math.round(source.videoHeight * scale));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      const { background, overlay: accessory } = effects.current;
      context.drawImage(background || source, 0, 0, width, height);
      if (accessory) context.drawImage(accessory, 0, 0, width, height);
      if (!effectTrack.current) {
        try {
          const [track] = canvas.captureStream(30).getVideoTracks();
          useTrack(track);
        } catch {
          setEffectsBroadcast(false);
          cancelAnimationFrame(frame);
        }
      }
    }
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      const processed = effectTrack.current;
      useTrack(null);
      processed?.stop();
    };
  }, [effectsActive]);

  async function enableCamera() {
    const attempt = ++cameraRequest.current;
    setOpening(true);
    setError('');
    try {
      const opened = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 },
        },
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
    let previewFrames = {};
    let latestSnapshot;
    let fetchingPreviews = false;
    const connected = new Map();
    let refreshTimer;
    let shotTimer;
    let countdownTimer;
    let scheduled;
    let refreshing = false;
    let refreshRequested = false;
    let centrifuge;
    let live;
    if (typeof RTCPeerConnection !== 'undefined') {
      send('/ice').catch(() => ({})).then(({ iceServers }) => {
        if (signal.aborted) return;
        live = createLivePreview({
          role, stream: camera ? stream.current : null, iceServers,
          send: (data) => send('/signal', { method: 'POST', data }),
          onStream(seat, remoteStream) {
            if (remoteStream) connected.set(seat, remoteStream);
            else connected.delete(seat);
            if (!signal.aborted) setLiveStreams(Object.fromEntries(connected));
          },
        });
        livePreview.current = live;
        live?.setVideoTrack(effectTrack.current);
        if (latestSnapshot) live?.update(latestSnapshot);
      });
    }
    setLiveStreams({});

    function needsPreview(seat) {
      return seat !== role && latestSnapshot?.ready.includes(seat) && !connected.has(seat);
    }

    async function updatePreviews(snapshot) {
      let changed = false;
      for (const seat of Object.keys(previewUrls)) {
        if (needsPreview(seat)) continue;
        URL.revokeObjectURL(previewUrls[seat]);
        delete previewUrls[seat];
        delete previewFrames[seat];
        changed = true;
      }
      if (changed) setRemote({ ...previewUrls });
      if (fetchingPreviews) return;
      const pending = snapshot.ready.filter((seat) => needsPreview(seat) &&
        (!snapshot.previewFrames || (snapshot.previewFrames[seat] != null && previewFrames[seat] !== snapshot.previewFrames[seat])));
      if (!pending.length) return;
      fetchingPreviews = true;
      try {
        const photos = await Promise.all(pending.map(async (seat) => [
          seat, await send(snapshot.seats ? '/preview/' + seat : '/preview').catch(() => null),
        ]));
        if (signal.aborted) return;
        let updated = false;
        for (const [seat, photo] of photos) {
          if (!photo || !needsPreview(seat) ||
              (snapshot.peerIds && snapshot.peerIds[seat] !== latestSnapshot.peerIds?.[seat])) continue;
          if (previewUrls[seat]) URL.revokeObjectURL(previewUrls[seat]);
          previewUrls[seat] = URL.createObjectURL(photo);
          previewFrames[seat] = snapshot.previewFrames?.[seat];
          updated = true;
        }
        if (updated) setRemote({ ...previewUrls });
      } finally {
        fetchingPreviews = false;
      }
    }

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
          const photo = await capture(video.current, 2160 / columns, 1620 / rows, 0.94, 256 * 1024,
            { ...effects.current, filter: sharedFilters[filterRef.current][1] });
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
        latestSnapshot = snapshot;
        live?.update(snapshot);
        updatePreviews(snapshot).catch(() => {});
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
          const hasFallback = latestSnapshot?.ready.some(needsPreview);
          refreshTimer = setTimeout(refresh, refreshRequested ? 0 : hasFallback ? 320 : 850);
          refreshRequested = false;
        }
      }
    }

    let cameraTimer;
    let cameraAnnounced = false;
    const cameraVersion = cameraRequest.current;
    async function announceCamera() {
      try {
        await send('/camera', { method: 'POST', data: { active: camera, version: cameraVersion } });
        cameraAnnounced = true;
      } catch (failure) {
        if (failure.status === 404) return;
      }
      if (camera && !signal.aborted) cameraTimer = setTimeout(announceCamera, 3000);
    }

    let previewTimer;
    async function uploadPreview() {
      const needsSnapshot = (latestSnapshot?.members || seats).some((seat) => seat !== role && !live?.isConnected(seat));
      try {
        if (needsSnapshot || !cameraAnnounced) {
          const { columns, rows } = boothGrid(seats.length);
          const photo = await capture(video.current, 640 / columns, 480 / rows, 0.68, 96 * 1024, effects.current);
          if (photo) await send('/preview', { method: 'PUT', photo });
        }
      } catch {
        // The next frame replaces a missed preview.
      } finally {
        if (!signal.aborted) {
          previewTimer = setTimeout(uploadPreview, needsSnapshot ? (seats.length > 2 ? 500 : 320) : 1800);
        }
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
    if (camera || cameraVersion) announceCamera();
    if (camera) uploadPreview();
    let statsTimer;
    async function refreshVideoStats() {
      if (signal.aborted) return;
      const incoming = await live?.stats();
      if (signal.aborted) return;
      setVideoStats({
        ...incoming,
        [role]: { mode: 'Camera', fps: stream.current?.getVideoTracks()[0]?.getSettings().frameRate },
      });
      statsTimer = setTimeout(refreshVideoStats, 2000);
    }
    if (showVideoStats) refreshVideoStats();
    return () => {
      controller.abort();
      live?.close();
      if (livePreview.current === live) livePreview.current = null;
      centrifuge?.disconnect();
      clearTimeout(refreshTimer);
      clearTimeout(cameraTimer);
      clearTimeout(previewTimer);
      clearTimeout(statsTimer);
      clearTimeout(shotTimer);
      clearInterval(countdownTimer);
      Object.values(previewUrls).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [roomId, token, role, camera, seats.length, showVideoStats]);

  async function start() {
    if (role !== 'host') return;
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

  async function changeFilter(filter) {
    const previous = filterRef.current;
    filterRef.current = filter;
    setLocalFilter(filter);
    try {
      await call('/filter', { method: 'POST', data: { filter } });
    } catch {
      if (filterRef.current !== filter) return;
      filterRef.current = previous;
      setLocalFilter(previous);
      setError('Could not share that filter. Try again.');
    }
  }

  async function saveSetup(layoutId, posePrompts) {
    setError('');
    try {
      const layout = pickerLayouts.find((item) => item.id === layoutId);
      const updated = await call('/setup', {
        method: 'POST',
        data: { layoutId, count: layout.count, prompts: posePrompts.map((pose) => memePoses.indexOf(pose)) },
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
          role, remote, liveStreams, seats, localFilter, changeFilter, filters: state.filters || {},
          blur, setBlur, faceEffect, setFaceEffect, effectsBroadcast,
          videoStats: showVideoStats ? videoStats : null,
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
        backgroundBlur, overlay, face,
        photoEffect: sharedFilters[localFilter][1],
        openCamera: enableCamera, stopCamera, takePhoto: start, error,
      }}
    />
  </div>;
}
