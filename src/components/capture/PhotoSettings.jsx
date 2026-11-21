import { useState } from 'react';
import Chevron from '../common/Chevron.jsx';
import Icon from '../common/Icon.jsx';
export default function PhotoSettings({
  busy,
  completed,
  mirror,
  setMirror,
  autoStart,
  setAutoStart,
  delay,
  setDelay,
  mode,
  mp4Supported,
  motionStyle,
  recordingSeconds,
  setRecordingSeconds,
  templateLocked,
  embedded = false,
}) {
  const Container = embedded ? 'section' : 'details';
  const [customLength, setCustomLength] = useState(() => ![1, 1.5].includes(recordingSeconds));
  return (
    <Container className="settings-panel shrink-0 overflow-visible" aria-label="Camera settings">
      {embedded ? (
        <h2 className="tools-heading">Settings</h2>
      ) : (
        <summary className="tools-heading text-[13px]">
          Settings
          <Chevron />
        </summary>
      )}
      <div className="session-settings grid min-w-0" aria-label="Photo controls">
        {setAutoStart && (
          <div className="mirror-row flex items-center justify-between gap-3">
            <span className="setting-label mb-[3px] flex items-center gap-[7px] font-bold">
              <Icon name="burst" />
              Auto start
            </span>
            <button
              type="button"
              className={`switch shrink-0 ${autoStart ? 'on' : ''}`}
              role="switch"
              aria-label="Auto start"
              aria-checked={autoStart}
              disabled={busy || completed || delay === 0}
              onClick={() => setAutoStart(!autoStart)}
            >
              <span className="block transition-transform duration-200 ease-[ease]" />
            </button>
          </div>
        )}
        {mode === 'live' && mp4Supported === false && (
          <p className="mb-2 mt-0 text-sm text-[color:var(--muted)]">
            Video recording is unavailable in this browser.
          </p>
        )}
        <fieldset className="m-0 min-w-0 border-0 p-0" disabled={busy}>
          <legend className="mb-[9px] flex items-center gap-[7px] p-0 font-bold">
            <Icon name="timer" />
            Countdown
          </legend>
          <div className="segmented flex w-full overflow-hidden">
            {[0, 3, 5].map((seconds) => (
              <button
                key={seconds}
                className="min-w-0 flex-1 whitespace-nowrap border-0 border-r border-solid px-1 py-[7px] font-bold last:border-r-0 enabled:hover:aria-[pressed=false]:bg-[#f4f4f5]!"
                aria-pressed={delay === seconds}
                onClick={() => setDelay(seconds)}
              >
                {seconds ? `${seconds} sec` : 'Off'}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="mirror-row flex items-center justify-between gap-3">
          <span className="setting-label mb-[3px] flex items-center gap-[7px] font-bold">
            <Icon name="mirror" />
            Mirror photo
          </span>
          <button
            type="button"
            className={`switch shrink-0 ${mirror ? 'on' : ''}`}
            role="switch"
            aria-label="Mirror photo"
            aria-checked={Boolean(mirror)}
            disabled={busy || completed}
            onClick={() => setMirror(!mirror)}
          >
            <span className="block transition-transform duration-200 ease-[ease]" />
          </button>
        </div>
        {motionStyle === 'boomerang' && (
          <fieldset
            className="boomerang-length m-0 grid min-w-0 gap-2 border-0 p-0"
            disabled={busy || templateLocked}
          >
            <label className="font-bold">
              Boomerang length
              <select
                className="mt-1 block min-h-10 w-full rounded-md border border-solid border-black bg-white px-2"
                value={customLength ? 'custom' : recordingSeconds}
                onChange={(event) => {
                  const custom = event.target.value === 'custom';
                  setCustomLength(custom);
                  setRecordingSeconds(custom ? 2 : Number(event.target.value));
                }}
              >
                <option value="1">1 second</option>
                <option value="1.5">1.5 seconds</option>
                <option value="custom">Custom</option>
              </select>
            </label>
            {customLength && (
              <label className="block">
                Custom length · {recordingSeconds} sec
                <input
                  className="block min-h-8 w-full accent-black"
                  type="range"
                  min="1"
                  max="5"
                  step="0.25"
                  value={recordingSeconds}
                  onChange={(event) => setRecordingSeconds(event.target.valueAsNumber)}
                />
              </label>
            )}
          </fieldset>
        )}
      </div>
    </Container>
  );
}
