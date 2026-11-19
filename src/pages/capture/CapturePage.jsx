import CameraTools from '../../components/capture/CameraTools.jsx';
import CameraPreview from '../../components/capture/CameraPreview.jsx';
import CapturedGallery from '../../components/capture/CapturedGallery.jsx';
import PhotoSettings from '../../components/capture/PhotoSettings.jsx';
import CaptureFeedback from '../../components/capture/CaptureFeedback.jsx';
import Icon from '../../components/common/Icon.jsx';
import Brand from '../../components/common/Brand.jsx';
import posthog, { posthogEnabled } from '../../lib/posthog.js';
import { navigate, navigateLink } from '../../lib/navigation.js';
import { poseImage } from '../../data/memePoses.js';
export default function CapturePage({ session, posePrompts = [] }) {
  const showTrackingNotice =
    session.sticker !== 'none' && session.cameraActive && !session.stickerReady;
  const captured = session.shots.length;
  const total = session.template.count;
  const captureUnit = session.mode === 'live' ? 'clip' : 'photo';
  const prompt = posePrompts[session.retakeIndex ?? session.shots.length];
  return (
    <main className="capture-main">
      <header className="intro capture-intro">
        <Brand />
        <h1 className="sr-only focus:[outline:none]" tabIndex={-1}>Take your photos.</h1>
      </header>
      <section className="camera-workspace" aria-label="Camera workspace">
        <div className="capture-camera">
          {prompt && (
            <div className="capture-pose-prompt" aria-live="polite">
              <img src={poseImage(prompt)} alt="" width="40" height="40" />
              <span>
                <strong>{prompt.title}</strong>
                <span>{prompt.cue}</span>
              </span>
            </div>
          )}
          <CameraPreview
            {...session}
            hasNotification={Boolean(session.error) || showTrackingNotice}
            tools={(shutter) => <CameraTools session={session}>{shutter}</CameraTools>}
            settings={
              <>
                <details className="capture-settings" name="booth-camera-panel">
                  <summary><Icon name="settings" size={22} /><span>Settings</span></summary>
                  <PhotoSettings {...session} embedded />
                </details>
                <div className="capture-setting-badges" aria-label="Active camera settings">
                  {session.delay > 0 && <span aria-label={`${session.delay} second countdown`}>{session.delay}s</span>}
                  {session.delay > 0 && session.autoStart && <span aria-label="Auto start enabled">Auto</span>}
                </div>
              </>
            }
          >
            <CaptureFeedback {...session} />
            {showTrackingNotice && (
              <p className="tracking-note" role="status" aria-live="polite">
                {session.face.state === 'loading'
                  ? 'Loading your sticker. Keep facing the camera…'
                  : session.face.state === 'error'
                    ? 'Sticker tracking needs attention. Retry in Stickers or select None.'
                    : 'Face the camera to place your sticker before capturing.'}
              </p>
            )}
          </CameraPreview>
        </div>
        <div className="capture-review-column">
          <CapturedGallery {...session} />
          <section className="capture-action-bar" aria-label="Photo progress and navigation">
            <div className="capture-continue">
              <div className="capture-next-actions">
                <button
                  className="button button-dark enabled:bg-black! enabled:text-white!"
                  disabled={!session.completed || session.busy}
                  onClick={() => {
                    if (posthogEnabled)
                      posthog.capture('customization_started', {
                        media_type: session.mode === 'live' ? 'live_clip' : 'photo',
                        media_count: session.shots.length,
                        template_id: session.template.id,
                      });
                    navigate('/edit');
                  }}
                >
                  <span role="status" className="tabular-nums">
                    {session.completed
                      ? 'Continue'
                      : session.retakeIndex != null
                        ? `Retake ${captureUnit} ${session.retakeIndex + 1}`
                        : <>
                            <span aria-hidden="true">{captured}/{total} captured</span>
                            <span className="sr-only">{captured} of {total} {captureUnit}s captured</span>
                          </>}
                  </span>
                  {session.completed && <Icon name="arrow" />}
                </button>
              </div>
              {session.retakeIndex != null && (
                <button type="button" className="text-button" disabled={session.busy} onClick={session.cancelRetake}>
                  Cancel retake
                </button>
              )}
              <a className="button button-outline capture-back" href="/templates" onClick={navigateLink} aria-label="Back to layout">Back</a>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
