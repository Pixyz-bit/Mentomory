import Icon from '../common/Icon.jsx';
export default function CaptureFeedback({
  error,
  status,
  openCamera,
  reviewing,
  shots,
  template,
}) {
  return (
    <>
      {error && (
        <div className="error-message my-4 shrink-0 rounded-[var(--control-radius)] border border-solid border-[color:var(--ink)] bg-[var(--paper)] p-4 text-sm leading-[1.6] text-[color:var(--ink)]" role="alert">
          <strong>Let’s get that sorted.</strong>
          <p className="[margin:3px_0_5px]">{error}</p>
          {status === 'idle' && (
            <button className="text-button" onClick={() => openCamera()}>
              Try again <Icon name="arrow" size={16} />
            </button>
          )}
        </div>
      )}
      <p className="absolute size-px overflow-hidden whitespace-nowrap [clip-path:inset(50%)]" role="status" aria-live="polite">
        {reviewing
          ? 'All moments captured. Continue to customize, or redo the full set.'
          : status === 'ready'
            ? `Camera ready. ${shots.length} of ${template.count} photos captured.`
            : ''}
      </p>
    </>
  );
}
