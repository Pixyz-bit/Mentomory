import { useState } from 'react';
import Dialog from '../common/Dialog.jsx';
import Icon from '../common/Icon.jsx';

const thumbnailMedia = 'absolute inset-0 block h-full w-full min-h-0 rounded-[inherit] object-cover';

export default function CapturedGallery({ mode, shots, template, busy, retakeIndex, retakePhoto }) {
  const [previewIndex, setPreviewIndex] = useState(null);
  const preview = shots[previewIndex];
  const closePreview = () => setPreviewIndex(null);
  const kind = mode === 'live' ? 'clip' : 'photo';
  const slots = Array.from({ length: template.count });
  return (
    <section
      className="capture-review flex min-h-0 flex-col"
      data-mode={mode}
      aria-label={mode === 'live' ? 'Captured clips' : 'Captured photos'}
    >
      <div className="capture-gallery flex w-full flex-wrap content-start items-start justify-center gap-2 min-[900px]:justify-start" role="group" aria-label="Captured media in layout order">
        {slots.map((_, index) => {
          const shot = shots[index];
          return (
            <figure
              key={index}
              className="capture-slot group relative m-0 aspect-[4/3] w-16 min-w-0 shrink-0 rounded-[var(--control-radius)] border-2 border-solid border-[color:var(--ink)] [&[data-empty=true]:not([aria-current])]:border-dashed [&[data-empty=true]:not([aria-current])]:border-neutral-300 sm:w-20"
              data-empty={!shot || undefined}
              aria-current={index === (retakeIndex ?? shots.length) ? 'step' : undefined}
            >
              {shot ? (
                <>
                  <button
                    type="button"
                    className="absolute -right-1.5 -top-1.5 z-[3] grid size-8 cursor-pointer place-items-center rounded-full border border-solid border-black bg-white text-black hover:bg-neutral-200 focus-visible:outline-2 focus-visible:-outline-offset-2"
                    aria-label={`Preview ${kind} ${index + 1}`}
                    onClick={() => setPreviewIndex(index)}
                  >
                    <Icon name="eye" size={16} />
                  </button>
                  {shot.type === 'live' ? (
                    <video
                      className={thumbnailMedia}
                      src={shot.url}
                      poster={shot.poster}
                      controls
                      loop
                      muted
                      playsInline
                      aria-label={'Clip ' + (index + 1)}
                    />
                  ) : (
                    <img className={thumbnailMedia} src={shot.url} alt={'Photo ' + (index + 1)} />
                  )}
                  {shot.type === 'live' && (
                    <a
                      className="clip-download pointer-events-none absolute left-2 top-2 z-[2] grid size-11 place-items-center rounded-[var(--control-radius)] border border-solid border-[color:var(--line)] bg-[var(--paper)] text-[color:var(--ink)] opacity-0 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 [@media(hover:none)]:pointer-events-auto [@media(hover:none)]:opacity-100"
                      aria-label={'Download clip ' + (index + 1) + ' as MP4'}
                      title={'Download clip ' + (index + 1)}
                      href={shot.url}
                      download={'mentomory-live-' + (index + 1) + '.mp4'}
                    >
                      <Icon name="download" size={18} />
                    </a>
                  )}
                </>
              ) : (
                <div className="empty-slot absolute inset-0 grid place-items-center rounded-[inherit] bg-[var(--surface)] text-base font-extrabold text-[color:var(--muted)] tabular-nums" aria-label={'Awaiting ' + kind + ' ' + (index + 1)}>
                  <span>{index + 1}</span>
                </div>
              )}
            </figure>
          );
        })}
      </div>
      {preview && (
        <Dialog className="w-[min(720px,calc(100%_-_32px))]! backdrop:bg-black/40!" title={`${preview.type === 'live' ? 'Clip' : 'Photo'} ${previewIndex + 1}`} onClose={closePreview}>
          {preview.type === 'live' ? (
            <video src={preview.url} poster={preview.poster} controls playsInline className="block max-h-[60dvh] w-full object-contain" />
          ) : (
            <img src={preview.url} alt={`Captured photo ${previewIndex + 1}`} className="block max-h-[60dvh] w-full object-contain" />
          )}
          <div className="mt-5 flex justify-end gap-3">
            <button type="button" className="button button-outline" onClick={closePreview}>Back</button>
            <button type="button" className="button button-dark enabled:bg-black! enabled:text-white!" disabled={busy} onClick={() => {
              retakePhoto(previewIndex);
              closePreview();
            }}>Retake</button>
          </div>
        </Dialog>
      )}
    </section>
  );
}
