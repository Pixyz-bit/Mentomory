import { useEffect, useRef } from 'react';
import CaptureActions from './CaptureActions.jsx';
import Icon from '../common/Icon.jsx';
import { LIVE_SECONDS } from '../../lib/media/live-media.js';

const photoEffects = [
  ['Original', 'none'],
  ['Dark', 'brightness(0.72) contrast(1.12)'],
  ['Black and white', 'grayscale(1)'],
  ['Vintage', 'sepia(0.75) contrast(0.92)'],
  ['Vivid', 'saturate(1.5) contrast(1.08)'],
  ['Soft', 'contrast(0.85) brightness(1.1)'],
];

export default function CameraPreview({
  status,
  cameraActive,
  completed,
  stopCamera,
  openCamera,
  video,
  overlay,
  mirror,
  photoEffect,
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
}) {
  const frame = useRef(null);
  useEffect(() => {
    function dismissOutside(event) {
      const openPanel = frame.current?.querySelector('details[name="booth-camera-panel"][open]');
      if (openPanel && !openPanel.contains(event.target)) openPanel.open = false;
    }
    document.addEventListener('click', dismissOutside, true);
    return () => document.removeEventListener('click', dismissOutside, true);
  }, []);

  const shutter = (
    <CaptureActions
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
            <video
              ref={video}
              autoPlay
              muted
              playsInline
              className={`absolute inset-0 ${mirror ? '[transform:scaleX(-1)]' : ''} ${cameraActive ? '' : 'invisible'}`}
              style={{ filter: photoEffect }}
              aria-label="Live webcam preview"
            />
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
              <div className="camera-placeholder absolute inset-0 flex flex-col items-center justify-center text-center">
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
          {cameraActive && !completed && settings}
          <div className={'camera-feedback' + (hasNotification ? ' has-notification' : '')}>
            {children}
          </div>
          {!completed &&
            (cameraActive ||
              status === 'recording' ||
              status === 'saving' ||
              countdown !== null) && (
              <div className="floating-shutter">
                {status === 'ready' && countdown === null && setPhotoEffect && (
                  <details className="camera-photo-effects" name="booth-camera-panel">
                    <summary aria-label="Photo effects">
                      <Icon name="effects" size={22} />
                      <span aria-hidden="true">Effects</span>
                    </summary>
                    <div className="camera-photo-effect-options" role="group" aria-label="Photo looks">
                      {photoEffects.map(([label, value]) => (
                        <button
                          key={value}
                          type="button"
                          aria-pressed={photoEffect === value}
                          disabled={busy}
                          onClick={() => setPhotoEffect(value)}
                        >
                          <span className="camera-effect-swatch" style={{ filter: value }} aria-hidden="true" />
                          {label}
                        </button>
                      ))}
                    </div>
                  </details>
                )}
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
