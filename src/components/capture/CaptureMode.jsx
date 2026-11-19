export default function CaptureMode({
  mode,
  templateLocked,
  mp4Supported,
  setMode,
  motionStyle,
  recordingSeconds = 7,
}) {
  return (
    <div className="capture-mode flex shrink-0 overflow-hidden [&>button]:border-0 [&>button]:font-bold" role="group" aria-label="Capture mode">
      <button
        className={mode === 'photo' ? 'active' : ''}
        aria-pressed={mode === 'photo'}
        disabled={templateLocked}
        onClick={() => setMode('photo')}
      >
        Photo
      </button>
      <button
        className={mode === 'live' ? 'active' : ''}
        aria-pressed={mode === 'live'}
        disabled={templateLocked || mp4Supported !== true}
        onClick={() => setMode('live')}
        title={
          mp4Supported === false
            ? 'MP4 encoding is unavailable in this browser. Try current Chrome, Edge or Safari.'
            : undefined
        }
      >
        {motionStyle === 'boomerang' ? 'Boomerang' : 'Live'} · {recordingSeconds} sec
      </button>
    </div>
  );
}
