import Icon from '../common/Icon.jsx';
import StickerThumbnail from './StickerThumbnail.jsx';
export default function CaptureActions({
  countdown,
  cancelCountdown,
  status,
  stopCamera,
  completed,
  stickerReady,
  takePhoto,
  mode,
  sticker = 'none',
  recordingSeconds = 7,
}) {
  if (countdown !== null)
    return (
      <button className="button button-outline cancel-capture cancel-countdown" onClick={cancelCountdown}>
        Cancel countdown
      </button>
    );
  if (status === 'recording')
    return (
      <button className="button button-outline cancel-capture" onClick={stopCamera}>
        Cancel recording
      </button>
    );
  const label =
    status === 'saving'
      ? 'Saving…'
      : completed
        ? 'All captured'
        : mode === 'live'
          ? `Record ${recordingSeconds} ${recordingSeconds === 1 ? 'second' : 'seconds'}`
          : 'Take photo';
  return (
    <div className="shutter-control">
      <button
        className="shutter-button"
        disabled={completed || status !== 'ready' || !stickerReady}
        onClick={takePhoto}
        aria-label={label}
      >
        <span className="shutter-core">
          {sticker === 'none' ? <Icon name="shutter" size={64} /> : <StickerThumbnail id={sticker} />}
        </span>
      </button>
      <span className="shutter-tooltip" aria-hidden="true">{label}</span>
    </div>
  );
}
