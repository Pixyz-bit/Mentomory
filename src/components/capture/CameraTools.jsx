import { useRef } from 'react';
import Icon from '../common/Icon.jsx';
import StickerThumbnail from './StickerThumbnail.jsx';
import { stickers } from '../../lib/stickers/sticker-art.js';
import { portraitLooks, isPortraitEffect } from '../../lib/face/portrait-effects.js';

const cameraEffects = [
  stickers[0],
  { id: 'dog', name: 'Puppy Lens' },
  ...portraitLooks.map(([id, name]) => ({ id, name })),
  ...stickers.slice(1).filter((item) => item.id !== 'dog'),
];

export default function CameraTools({ session, children }) {
  const { sticker, setSticker, busy, face } = session;
  const touchStart = useRef(null);
  const selected = Math.max(0, cameraEffects.findIndex((item) => item.id === sticker));
  const effectAt = (offset) => cameraEffects[(selected + offset + cameraEffects.length) % cameraEffects.length];

  function finishSwipe(event) {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start || busy) return;
    const { clientX, clientY } = event.changedTouches[0];
    const dx = clientX - start.clientX;
    if (Math.abs(dx) > 30 && Math.abs(dx) > Math.abs(clientY - start.clientY)) {
      setSticker(effectAt(dx < 0 ? 1 : -1).id);
    }
  }

  function renderEffect(offset) {
    const item = effectAt(offset);
    const label = item.id === 'none' ? 'No effect' : isPortraitEffect(item.id) ? item.name : `${item.name} face sticker`;
    return (
      <div key={offset} className="camera-effect-item">
        <button
          type="button"
          className="camera-effect-option"
          aria-label={label}
          disabled={busy}
          onClick={() => setSticker(item.id)}
        >
          {item.id === 'none' ? <Icon name="shutter" size={24} /> : <StickerThumbnail id={item.id} />}
        </button>
        <span className="shutter-tooltip" aria-hidden="true">{item.id === 'none' ? label : item.name}</span>
      </div>
    );
  }

  return (
    <section className="camera-effect-carousel" aria-label="Camera effects">
      <div
        className="camera-effect-track"
        onTouchStart={(event) => { touchStart.current = event.touches[0]; }}
        onTouchEnd={finishSwipe}
        onTouchCancel={() => { touchStart.current = null; }}
      >
        <button type="button" className="camera-effect-arrow" aria-label="Previous effects" disabled={busy} onClick={() => setSticker(effectAt(-1).id)}>
          <Icon name="arrow" size={16} />
        </button>
        <div className="camera-effect-neighbors camera-effects-before">{[-3, -2, -1].map(renderEffect)}</div>
        {children}
        <div className="camera-effect-neighbors camera-effects-after">{[1, 2, 3].map(renderEffect)}</div>
        <button type="button" className="camera-effect-arrow" aria-label="Next effects" disabled={busy} onClick={() => setSticker(effectAt(1).id)}>
          <Icon name="arrow" size={16} />
        </button>
      </div>
      {face.state === 'error' && (
        <button type="button" className="button button-outline" disabled={busy} onClick={face.retry}>
          Retry face tracking
        </button>
      )}
    </section>
  );
}
