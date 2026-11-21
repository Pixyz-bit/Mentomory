import Chevron from '../common/Chevron.jsx';
import { frames } from '../../data/frames.js';
import BackgroundOptions from './BackgroundOptions.jsx';
import FrameThumbnail from './FrameThumbnail.jsx';

export default function FrameOptions(props) {
  const { frame, setFrame, exporting } = props;
  return (
    <>
      <details className="editor-section frame-section" open>
        <summary>
          <span>Original frames · {frames.length - 1}</span>
          <Chevron />
        </summary>
        <div className="frame-options" role="group" aria-label="Choose a decorative photo frame">
          {frames.map((item) => (
            <button
              key={item.id}
              className={`frame-option ${frame === item.id ? 'selected' : ''}`}
              disabled={exporting}
              aria-pressed={frame === item.id}
              onClick={() => setFrame(item.id)}
            >
              <FrameThumbnail frame={item} />
              <span>{item.name}</span>
              {frame === item.id && (
                <svg
                  className="frame-check"
                  width="16"
                  height="16"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="m4 10 4 4 8-8" />
                </svg>
              )}
            </button>
          ))}
        </div>
      </details>
      <BackgroundOptions {...props} />
    </>
  );
}
