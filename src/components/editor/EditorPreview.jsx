import { useState } from 'react';
import { backgrounds } from '../../data/backgrounds.js';
import { photoFilters } from '../../data/photoFilters.js';
import Dialog from '../common/Dialog.jsx';
import Icon from '../common/Icon.jsx';
import LiveStripPreview from './LiveStripPreview.jsx';
import { getFrame } from '../../data/frames.js';
import { frameRects, layoutSize } from '../../lib/collage.js';
import { framePhotoRect } from '../../lib/frames/frame-art.js';
export default function EditorPreview({
  layout,
  live,
  shots,
  options,
  playing,
  output,
  background,
  filter,
  decoration,
  frame,
  exporting,
  setPlaying,
  progress,
  busy,
  error,
  mp4,
  retry = 0,
}) {
  const [expanded, setExpanded] = useState(false);
  const { width, height } = layoutSize(layout);
  const aspect = width / height;
  const canEnlarge = !busy && (live || output);
  const alt = `${layout.name}${layout.slots?.length > layout.count ? ' with meme pose references,' : ' with'} ${frame === 'none' ? `${backgrounds.find((item) => item.id === background).name} background` : `${getFrame(frame).name} frame`}, ${photoFilters.find((item) => item.id === filter).name} filter and ${decoration} border stickers`;
  const liveProps = { shots, template: layout, options, playing, artworkRetry: retry };

  return (
    <section className="editor-preview" aria-label="Edited photo strip">
      <div className="editor-stage" aria-busy={busy}>
        <div className="editor-print layout-preview-print" style={{ '--strip-aspect': aspect }}>
          {busy && (
            <div className="strip-skeleton" aria-hidden="true">
              {frameRects(layout).map((slot, index) => {
                const rect = framePhotoRect(slot, frame);
                return (
                  <span
                    key={index}
                    style={{
                      left: `${(100 * rect.x) / width}%`,
                      top: `${(100 * rect.y) / height}%`,
                      width: `${(100 * rect.width) / width}%`,
                      height: `${(100 * rect.height) / height}%`,
                    }}
                  />
                );
              })}
            </div>
          )}
          {live ? (
            <LiveStripPreview {...liveProps} playing={playing && !expanded} />
          ) : !busy && output ? (
            <img className="edited-strip" src={output} alt={alt} />
          ) : null}
          {canEnlarge && (
            <button
              type="button"
              className="layout-preview-zoom"
              aria-label={`Enlarge ${layout.name} preview`}
              aria-haspopup="dialog"
              onClick={() => setExpanded(true)}
            >
              <span className="layout-preview-eye">
                <Icon name="eye" size={19} />
              </span>
            </button>
          )}
        </div>
      </div>
      {expanded && (
        <Dialog
          className="layout-enlarged-dialog"
          title={layout.name}
          onClose={() => setExpanded(false)}
        >
          <div className="layout-preview-image" style={{ '--layout-aspect': aspect }}>
            <div className="layout-preview-print" style={{ aspectRatio: aspect }}>
              {live ? (
                <LiveStripPreview {...liveProps} />
              ) : (
                <img className="edited-strip" src={output} alt={alt} />
              )}
            </div>
          </div>
        </Dialog>
      )}
      {live && (
        <button
          className="text-button preview-play"
          disabled={exporting}
          onClick={() => setPlaying(!playing)}
        >
          {playing ? 'Pause preview' : 'Play preview'}
        </button>
      )}
      <p className="sr-only" role="status">
        {busy ? 'Updating preview' : ''}
      </p>
      <p className="editor-render-status" role="status" aria-live="polite">
        {exporting
          ? `Creating MP4 · ${Math.round(progress * 100)}%`
          : error
            ? 'Check the message beside your controls'
            : mp4
              ? `MP4 ready · ${mp4.width} × ${mp4.height} px`
              : ''}
      </p>
    </section>
  );
}
