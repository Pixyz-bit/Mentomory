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
  ['Background blur', 'background-blur'],
  ['Soft', 'contrast(0.85) brightness(1.1)'],
];

export default function CameraPreview({
  status,
  cameraActive,
  retakeIndex,
  previewShot,
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
              style={{ filter: photoEffect === 'background-blur' ? 'none' : photoEffect }}
              aria-label="Live webcam preview"
            />
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
          {previewShot && (
            <div className="absolute inset-0 z-20 overflow-hidden rounded-[var(--radius)] bg-black" aria-label={`Preview ${mode === 'live' ? 'clip' : 'photo'} ${previewNumber}`}>
              {previewShot.type === 'live' ? (
                <video src={previewShot.url} poster={previewShot.poster} controls playsInline className="block size-full object-cover object-center" />
              ) : (
                <img src={previewShot.url} alt={`Captured photo ${previewNumber}`} className="block size-full object-cover object-center" />
              )}
              <div className="pointer-events-none absolute inset-x-0 bottom-3 flex flex-wrap items-center justify-center gap-2 px-3">
                <button type="button" className="button button-outline pointer-events-auto" disabled={busy} onClick={onRetakePreview}>
                  <Icon name="retake" size={16} />
                  Retake
                </button>
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
          {!previewShot && cameraActive && !completed && settings}
          <div className={'camera-feedback' + (hasNotification ? ' has-notification' : '')}>
            {children}
          </div>
          {!previewShot && !completed &&
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
                          <span className="camera-effect-swatch" style={{ filter: value === 'background-blur' ? 'blur(2px)' : value }} aria-hidden="true" />
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
