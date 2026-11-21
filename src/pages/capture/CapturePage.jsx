import { useEffect, useRef, useState } from 'react';
import CameraTools from '../../components/capture/CameraTools.jsx';
import CameraPreview from '../../components/capture/CameraPreview.jsx';
import CapturedGallery from '../../components/capture/CapturedGallery.jsx';
import PhotoSettings from '../../components/capture/PhotoSettings.jsx';
import CaptureFeedback from '../../components/capture/CaptureFeedback.jsx';
import Icon from '../../components/common/Icon.jsx';
import Brand from '../../components/common/Brand.jsx';
import posthog, { posthogEnabled } from '../../lib/posthog.js';
import { navigate, navigateLink } from '../../lib/navigation.js';
export default function CapturePage({ session, posePrompts = [], duo }) {
  const showTrackingNotice =
    session.sticker !== 'none' && session.cameraActive && !session.stickerReady;
  const [selectedShotIndex, setPreviewIndex] = useState(null);
  const [copyStatus, setCopyStatus] = useState('');
  const inviteMenu = useRef(null);
  const canInvite = duo?.canInvite;
  useEffect(() => {
    if (!canInvite) return;
    const dismiss = (event) => {
      const menu = inviteMenu.current;
      if (menu?.open && !menu.contains(event.target)) menu.open = false;
    };
    document.addEventListener('pointerdown', dismiss, true);
    return () => document.removeEventListener('pointerdown', dismiss, true);
  }, [canInvite]);
  const hasPendingReview = session.reviewShotIndex != null;
  const previewIndex = session.retakeIndex == null
    ? selectedShotIndex ?? session.reviewShotIndex ?? null
    : null;
  const previewShot = session.shots[previewIndex];
  const savePreview = () => {
    setPreviewIndex(null);
    session.setReviewShotIndex?.(null);
  };
  const captured = session.shots.length;
  const total = session.template.count;
  const captureUnit = session.mode === 'live' ? 'clip' : 'photo';
  const prompt = posePrompts[session.retakeIndex ?? session.shots.length];
  async function copyInvite(kind) {
    try {
      const link = new URL('/duo', window.location.origin);
      link.searchParams.set('room', duo.roomCode);
      await navigator.clipboard.writeText(kind === 'link' ? link.href : duo.roomCode);
      setCopyStatus(kind === 'link' ? 'Invite link copied.' : 'Room code copied.');
    } catch {
      setCopyStatus('Clipboard unavailable. You can select the room code in the camera.');
    }
  }
  return (
    <main className="capture-main">
      <header className="intro capture-intro">
        <Brand />
        <h1 className="sr-only focus:[outline:none]" tabIndex={-1}>Take your photos.</h1>
        {canInvite && <details ref={inviteMenu} className="duo-invite" onKeyDown={(event) => {
          if (event.key !== 'Escape' || !event.currentTarget.open) return;
          event.currentTarget.open = false;
          event.currentTarget.querySelector('summary').focus();
        }} onToggle={(event) => {
          if (!event.currentTarget.open) setCopyStatus('');
        }}>
          <summary className="button button-outline"><Icon name="invite" size={16} />Invite a friend</summary>
          <div className="duo-invite-actions">
            <button type="button" className="button button-outline" onClick={() => copyInvite('code')}><Icon name="copy" size={15} />Copy code</button>
            <button type="button" className="button button-dark" onClick={() => copyInvite('link')}><Icon name="link" size={15} />Copy link</button>
            {copyStatus && <p role="status">{copyStatus}</p>}
          </div>
        </details>}
      </header>
      <section className="camera-workspace" aria-label="Camera workspace">
        <div className="capture-camera">
          <CameraPreview
            {...session}
            split={duo?.split}
            roomCode={duo?.roomCode}
            posePrompt={prompt}
            previewShot={previewShot}
            previewNumber={previewIndex + 1}
            onSavePreview={hasPendingReview && previewIndex === session.reviewShotIndex ? savePreview : undefined}
            onRetakePreview={duo ? undefined : () => {
              session.retakePhoto(previewIndex);
              setPreviewIndex(null);
            }}
            hasNotification={Boolean(session.error) || showTrackingNotice}
            tools={duo ? undefined : (shutter) => <CameraTools session={session}>{shutter}</CameraTools>}
            settings={duo ? undefined :
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
          <CapturedGallery {...session} previewIndex={previewIndex} onPreview={setPreviewIndex} />
          <section className="capture-action-bar" aria-label="Photo progress and navigation">
            <div className="capture-continue">
              <div className="capture-next-actions">
                <button
                  className="button button-dark enabled:bg-black! enabled:text-white!"
                  disabled={session.busy || !session.completed || hasPendingReview}
                  onClick={() => {
                    if (posthogEnabled)
                      posthog.capture('customization_started', {
                        media_type: session.mode === 'live' ? 'live_clip' : 'photo',
                        media_count: session.shots.length,
                        template_id: session.template.id,
                      });
                    if (duo) duo.onContinue();
                    else navigate('/edit');
                  }}
                >
                  <span role="status" className="tabular-nums">
                    {session.completed && !hasPendingReview
                      ? 'Continue'
                      : session.retakeIndex != null
                        ? <span className="whitespace-nowrap">Retaking #{session.retakeIndex + 1}</span>
                        : <>
                            <span aria-hidden="true">{captured}/{total} captured</span>
                            <span className="sr-only">{captured} of {total} {captureUnit}s captured</span>
                          </>}
                  </span>
                  {session.completed && !hasPendingReview && <Icon name="arrow" />}
                </button>
              </div>
              {session.retakeIndex != null ? (
                <button type="button" className="button button-outline capture-back" disabled={session.busy} onClick={session.cancelRetake}>
                  Cancel retake
                </button>
              ) : previewShot ? (
                <button type="button" className="button button-outline capture-back" disabled={selectedShotIndex == null} onClick={() => setPreviewIndex(null)}>Back</button>
              ) : duo ? (
                <button type="button" className="button button-outline capture-back" onClick={duo.onBack}>Back</button>
              ) : (
                <a className="button button-outline capture-back" href="/templates" onClick={navigateLink} aria-label="Back to layout">Back</a>
              )}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
