import Icon from '../common/Icon.jsx';

export default function EditorActions({
  live,
  exporting,
  progress,
  abort,
  mp4,
  filename,
  busy,
  error,
  output,
  exportVideo,
  onBack,
  downloadStatus,
  onDownload,
}) {
  return (
    <div className="editor-actions">
      <button
        type="button"
        className="button button-outline editor-back"
        disabled={exporting}
        onClick={onBack}
        aria-label="Back to booth"
      >
        Back
      </button>
      {live &&
        (exporting ? (
          <>
            <progress
              className="media-progress"
              value={progress}
              max="1"
              aria-label="MP4 export progress"
            />
            <button className="button button-outline" onClick={() => abort.current?.abort()}>
              Cancel export
            </button>
          </>
        ) : mp4 ? (
          <a
            className="button button-dark"
            href={mp4.url}
            download={`${filename}.mp4`}
            onClick={() => onDownload('mp4')}
          >
            Download live strip · MP4
            <Icon name="download" size={18} />
          </a>
        ) : (
          <button className="button button-dark" disabled={busy || !!error} onClick={exportVideo}>
            Create live strip · MP4
          </button>
        ))}
      {!live &&
        !exporting &&
        (!busy && !error && output ? (
          <a
            className="button button-dark"
            href={output}
            download={`${filename}.jpg`}
            onClick={() => onDownload('jpg')}
          >
            Download photo strip
            <Icon name="download" size={18} />
          </a>
        ) : (
          <button className="button button-dark" disabled>
            Applying edits…
          </button>
        ))}
      {downloadStatus && (
        <p className="download-status" role="status" aria-live="polite">
          {downloadStatus}
        </p>
      )}
    </div>
  );
}
