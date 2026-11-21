import Icon from '../common/Icon.jsx';

const thumbnailMedia = 'absolute inset-0 block h-full w-full min-h-0 rounded-[inherit] object-cover';

export default function CapturedGallery({ mode, motionStyle, shots, template, busy, retakeIndex, previewIndex, onPreview }) {
  const kind = mode === 'live' ? 'clip' : 'photo';
  const slots = Array.from({ length: template.count });
  return (
    <section
      className="capture-review flex min-h-0 flex-col"
      data-mode={mode}
      aria-label={mode === 'live' ? 'Captured clips' : 'Captured photos'}
    >
      <div className="capture-gallery flex w-full flex-wrap content-start items-start justify-center gap-2 min-[900px]:justify-start" role="group" aria-label="Captured media in layout order" style={{ '--visible-slots': Math.min(4, slots.length) }}>
        {slots.map((_, index) => {
          const shot = shots[index];
          return (
            <figure
              key={index}
              className="capture-slot group relative m-0 aspect-[4/3] w-16 min-w-0 shrink-0 rounded-[var(--control-radius)] border-2 border-solid border-[color:var(--ink)] [&[data-empty=true]:not([aria-current])]:border-dashed [&[data-empty=true]:not([aria-current])]:border-neutral-300 data-[selected=true]:ring-2 data-[selected=true]:ring-black data-[selected=true]:ring-offset-2 sm:w-20"
              data-selected={index === previewIndex || index === retakeIndex || undefined}
              data-empty={!shot || undefined}
              aria-current={index === (retakeIndex ?? shots.length) ? 'step' : undefined}
            >
              {shot ? (
                <>
                  <button
                    type="button"
                    className="absolute inset-0 rounded-[inherit] border-0 bg-transparent p-0 disabled:opacity-100!"
                    aria-label={`Preview ${kind} ${index + 1}`}
                    aria-pressed={index === previewIndex}
                    disabled={busy || retakeIndex != null}
                    onClick={() => onPreview(index)}
                  >
                    {shot.type === 'live' && !shot.poster ? (
                      <video className={thumbnailMedia} src={shot.url} preload="metadata" muted playsInline aria-hidden="true" />
                    ) : (
                      <img className={thumbnailMedia} src={shot.type === 'live' ? shot.poster : shot.url} alt="" />
                    )}
                    {!busy && retakeIndex == null && (
                      <span aria-hidden="true" className="absolute right-1 top-1 z-[3] grid size-6 place-items-center rounded-full border border-solid border-black bg-white text-black">
                        <Icon name="eye" size={13} />
                      </span>
                    )}
                  </button>
                  {shot.type === 'live' && motionStyle !== 'boomerang' && (
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
    </section>
  );
}
