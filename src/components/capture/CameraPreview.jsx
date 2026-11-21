import { useEffect, useRef } from 'react';
import CaptureActions from './CaptureActions.jsx';
import Icon from '../common/Icon.jsx';
import { poseImage } from '../../data/memePoses.js';
import { LIVE_SECONDS } from '../../lib/media/live-media.js';
import { boothGrid, sharedFilters } from '../../lib/shared-booth.js';

const photoEffects = [
  ['Original', 'none'],
  ['Dark', 'brightness(0.72) contrast(1.12)'],
  ['Black and white', 'grayscale(1)'],
  ['Vintage', 'sepia(0.75) contrast(0.92)'],
  ['Vivid', 'saturate(1.5) contrast(1.08)'],
  ['Background blur', 'background-blur'],
  ['Soft', 'contrast(0.85) brightness(1.1)'],
];

function PeerVideo({ stream, label, filter }) {
  const video = useRef(null);
  useEffect(() => {
    const element = video.current;
    element.srcObject = stream;
    return () => { element.srcObject = null; };
  }, [stream]);
  return <video className="duo-live-video" ref={video} autoPlay muted playsInline aria-label={label} style={{ filter }} />;
}

function previewStatus(split, seat) {
  if (!split.videoStats) return '';
  if (seat !== split.role && !split.liveStreams[seat]) {
    return split.remote[seat] ? 'JPEG snapshots' : '';
  }
  const stats = split.videoStats[seat];
  if (!stats) return '';
  return [stats.mode, stats.fps ? Math.round(stats.fps) + ' fps' : '', stats.rtt != null ? stats.rtt + ' ms RTT' : '']
    .filter(Boolean).join(' · ');
}

export default function CameraPreview({
  status,
  cameraActive,
  retakeIndex,
  previewShot,
  posePrompt,
  previewNumber,
  onRetakePreview,
  onSavePreview,
  completed,
  stopCamera,
  openCamera,
  video,
  overlay,
  mirror,
  photoEffect,
  backgroundBlur,
  setPhotoEffect,
  busy,
  flash,
  mode,
  sticker,
  shots,
  countdown,
  recordProgress,
  recordingSeconds = LIVE_SECONDS,
  stickerReady,
  takePhoto,
  cancelCountdown,
  children,
  tools,
  settings,
  face,
  hasNotification = false,
  split,
  roomCode,
}) {
  const frame = useRef(null);
  const grid = split && boothGrid(split.seats.length);
  const paneStyle = (index) => ({
    '--pane-x': (index % grid.columns) * 100 / grid.columns + '%',
    '--pane-y': Math.floor(index / grid.columns) * 100 / grid.rows + '%',
    '--pane-width': 100 / grid.columns + '%',
    '--pane-height': 100 / grid.rows + '%',
  });
  const localPane = split ? paneStyle(split.seats.indexOf(split.role)) : undefined;
  useEffect(() => {
    function dismissOutside(event) {
      const openPanel = frame.current?.querySelector('details[name="booth-camera-panel"][open]');
      if (openPanel && !openPanel.contains(event.target)) openPanel.open = false;
    }
    document.addEventListener('click', dismissOutside, true);
    return () => document.removeEventListener('click', dismissOutside, true);
  }, []);

  const shutter = (!split || split.role === 'host') && (
    <CaptureActions
      shared={Boolean(split)}
      {...{ countdown, cancelCountdown, status, stopCamera, completed, stickerReady, takePhoto, mode, sticker, recordingSeconds }}
    />
  );
  return (
    <section className="booth flex min-h-0 flex-col" aria-label="Photo booth">
      <div className="camera-stage">
        <div className="camera-frame-area" ref={frame} onKeyDown={(event) => {
          if (event.key !== 'Escape') return;
          const openPanel = event.currentTarget.querySelector('details[name="booth-camera-panel"][open]');
          if (!openPanel) return;
          event.stopPropagation();
          openPanel.open = false;
          openPanel.querySelector('summary').focus();
        }}>
          <div className={`viewfinder relative ${flash ? 'after:pointer-events-none after:absolute after:inset-0 after:bg-white after:content-[""]' : ''}`}>
            {split?.seats.map((seat, index) => {
              if (seat === split.role) return null;
              const filter = sharedFilters[split.filters?.[seat]]?.[1];
              return (
              <div className="duo-peer" data-room-pane={seat} key={seat} style={paneStyle(index)}>
                {split.liveStreams[seat] ? <PeerVideo stream={split.liveStreams[seat]} label={`Person ${index + 1} live camera`} filter={filter} /> :
                  split.members.includes(seat) && split.remote[seat] ? <img src={split.remote[seat]} alt={`Person ${index + 1} camera preview`} style={{ filter }} /> :
                  <span>{split.members.includes(seat) ? 'Camera off' : 'Open seat'}</span>}
              </div>
              );
            })}
            <video
              ref={video}
              autoPlay
              muted
              playsInline
              className={`absolute inset-0 ${mirror ? '[transform:scaleX(-1)]' : ''} ${cameraActive ? '' : 'invisible'}`}
              style={{ ...localPane, filter: photoEffect === 'background-blur' ? 'none' : photoEffect }}
              aria-label="Live webcam preview"
              data-room-pane={split?.role}
            />
            {split?.seats.map((seat, index) => (
              <span className="duo-pane-label" data-room-pane={seat} key={seat} style={paneStyle(index)}
                data-column-divider={index % grid.columns !== 0 || undefined}
                data-row-divider={index >= grid.columns || undefined}
                data-top-right={index === grid.columns - 1 || undefined}>
                Person {index + 1}{split.role === seat ? ' · You' : ''}
                {split.videoStats && <small className="duo-video-stats">{previewStatus(split, seat)}</small>}
              </span>
            ))}
            {roomCode && <span className="duo-room-code">Room <strong>{roomCode}</strong></span>}
            {photoEffect === 'background-blur' && (
              <canvas
                ref={backgroundBlur?.canvas}
                className={`absolute inset-0 size-full ${mirror ? '[transform:scaleX(-1)]' : ''} ${backgroundBlur?.status === 'ready' && cameraActive ? '' : 'invisible'}`}
                aria-hidden="true"
              />
            )}
            <canvas
              ref={overlay}
              data-sticker-renderer={face?.rendererMode || 'off'}
              className={`face-overlay pointer-events-none absolute inset-0 ${mirror ? '[transform:scaleX(-1)]' : ''} ${cameraActive ? '' : 'invisible'}`}
              aria-hidden="true"
            />
            {completed &&
              (mode === 'live' ? (
                <video
                  className="captured-photo absolute inset-0"
                  src={shots.at(-1).url}
                  autoPlay
                  loop
                  muted
                  playsInline
                  controls
                  aria-label="Your last live clip"
                />
              ) : (
                <img
                  className="captured-photo absolute inset-0"
                  src={shots.at(-1).url}
                  alt="Your last captured photo"
                />
              ))}
            {!completed && (status === 'idle' || status === 'loading') && (
              <div className="camera-placeholder absolute inset-0 flex flex-col items-center justify-center text-center"
                data-room-pane={split?.role} style={localPane}>
                {status === 'loading' && <h2>Waiting for camera access…</h2>}
                <button
                  className="button button-dark enable-camera"
                  onClick={() => (status === 'loading' ? stopCamera() : openCamera())}
                >
                  <Icon name="camera" size={20} />
                  {status === 'loading' ? 'Cancel connection' : 'Enable camera'}
                </button>
              </div>
            )}
            {countdown !== null && (
              <div
                className="absolute inset-0 grid animate-count-in place-items-center bg-transparent text-[clamp(64px,12vw,120px)] font-bold text-[color:var(--paper)] tabular-nums [text-shadow:0_2px_6px_#111111b3]"
                role="status"
                aria-live="assertive"
                aria-atomic="true"
                key={countdown}
              >
                {countdown}
              </div>
            )}
          </div>
          {posePrompt && (
            <details className="capture-pose-prompt" hidden={!cameraActive || Boolean(previewShot) || countdown !== null} open>
              <summary>Pose guide</summary>
              <img
                src={poseImage(posePrompt)}
                alt={posePrompt.title}
                width="104"
                height="78"
              />
            </details>
          )}
          {previewShot && (
            <div className="absolute inset-0 z-20 overflow-hidden rounded-[var(--radius)] bg-black" aria-label={`Preview ${mode === 'live' ? 'clip' : 'photo'} ${previewNumber}`}>
              {previewShot.type === 'live' ? (
                <video src={previewShot.url} poster={previewShot.poster} controls playsInline className="block size-full object-cover object-center" />
              ) : (
                <img src={previewShot.url} alt={`Captured photo ${previewNumber}`} className="block size-full object-cover object-center" />
              )}
              <div className="pointer-events-none absolute inset-x-0 bottom-3 flex flex-wrap items-center justify-center gap-2 px-3">
                {onRetakePreview && <button type="button" className="button button-outline pointer-events-auto" disabled={busy} onClick={onRetakePreview}>
                  <Icon name="retake" size={16} />
                  Retake
                </button>}
                {onSavePreview && (
                  <button type="button" className="button button-dark pointer-events-auto enabled:bg-black! enabled:text-white!" disabled={busy} onClick={onSavePreview}>
                    <Icon name="check" size={16} />
                    Save
                  </button>
                )}
              </div>
            </div>
          )}
          {!previewShot && retakeIndex != null && (
            <p role="status" className="absolute left-1/2 top-3 z-[14] m-0 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/70 px-3 py-1 text-sm font-bold text-white">
              Retaking {mode === 'live' ? 'clip' : 'photo'} {retakeIndex + 1}
            </p>
          )}
          {cameraActive && photoEffect === 'background-blur' && backgroundBlur?.status !== 'ready' && (
            <p role="status" className="pointer-events-none absolute left-1/2 top-3 z-[14] m-0 -translate-x-1/2 rounded-lg bg-black/70 px-3 py-1 text-center text-sm text-white">
              {backgroundBlur?.status === 'error' ? 'Background blur unavailable. Choose another effect.' : 'Preparing background blur...'}
            </p>
          )}
          {!previewShot && cameraActive && !completed && countdown === null && settings}
          {!previewShot && !completed && status === 'ready' && countdown === null && (split || setPhotoEffect) && (
            <details className={split ? 'camera-photo-effects duo-camera-filters' : 'camera-photo-effects'}
              name="booth-camera-panel" style={localPane}>
              <summary aria-label={split ? 'Filters' : 'Photo effects'}>
                <Icon name="effects" size={22} />
                <span aria-hidden="true">{split ? 'Filters' : 'Effects'}</span>
              </summary>
              <div className="camera-photo-effect-options" role="group" aria-label="Photo looks">
                {(split ? Object.entries(sharedFilters).map(([id, [label, filter]]) => [label, id, filter]) : photoEffects)
                  .map(([label, value, filter = value]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={(split ? split.localFilter : photoEffect) === value}
                    disabled={busy}
                    onClick={() => (split ? split.changeFilter(value) : setPhotoEffect(value))}
                  >
                    <span className="camera-effect-swatch" style={{ filter: value === 'background-blur' ? 'blur(2px)' : filter }} aria-hidden="true" />
                    {label}
                  </button>
                ))}
              </div>
            </details>
          )}
          <div className={'camera-feedback' + (hasNotification ? ' has-notification' : '')}>
            {children}
          </div>
          {!previewShot && !completed &&
            (cameraActive ||
              status === 'recording' ||
              status === 'saving' ||
              countdown !== null) && (
              <div className="floating-shutter">
                {status === 'recording' && (
                  <div className="recording-status absolute bottom-[18px] left-1/2 min-w-[200px] rounded-[var(--control-radius)] border border-solid border-[color:var(--line)] bg-[var(--paper)] px-3 py-[9px] text-center text-sm text-[color:var(--ink)] [transform:translateX(-50%)]" role="status">
                    <span className="mr-1.5 inline-block size-[7px] rounded-full bg-[var(--ink)]" />
                    Recording ·{' '}
                    {Math.min(
                      recordingSeconds,
                      Math.ceil(recordProgress * recordingSeconds)
                    )} / {recordingSeconds} sec
                    <progress className="media-progress" value={recordProgress} max="1" aria-label="Live recording progress" />
                  </div>
                )}
                {status === 'ready' && countdown === null && tools ? tools(shutter) : shutter}
              </div>
            )}
        </div>
      </div>
    </section>
  );
}
