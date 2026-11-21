import { useEffect, useRef, useState } from 'react';
import { createStickerRenderer } from '../lib/stickers/sticker-renderer.js';
import { startMediaPipeTracking } from '../lib/face/mediapipe-tracker.js';
import { isPortraitEffect, paintPortrait } from '../lib/face/portrait-effects.js';

export function useFaceStickers(video, overlay, enabled, sticker, maxWidth = Infinity) {
  const latest = useRef(null);
  const selected = useRef(sticker);
  const renderer = useRef(null);
  const portraitBuffer = useRef(null);
  function draw(ctx, points, width, height, id) {
    if (isPortraitEffect(id)) {
      portraitBuffer.current ??= document.createElement('canvas');
      paintPortrait(ctx, portraitBuffer.current, video.current, points, width, height, id);
    } else {
      renderer.current?.drawTo(ctx, points, width, height, id);
    }
  }
  selected.current = sticker;
  const active = enabled && sticker !== 'none';
  const [trackingState, setState] = useState('off');
  const [rendererMode, setRendererMode] = useState('off');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    latest.current = null;
    const canvas = overlay.current;
    const clear = () => {
      if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    };
    clear();
    if (!active) {
      setState('off');
      setRendererMode('off');
      return;
    }
    let stopped = false,
      raf,
      stopProvider;
    let previousFrame = -Infinity;
    let paintedFrame;
    let paintedSticker;
    let paintedRenderer;
    let paintedMediaTime;
    setState('loading');
    setRendererMode('loading');
    const callbacks = {
      onReady() {
        if (!stopped) setState('searching');
      },
      onResult(points) {
        if (stopped) return;
        latest.current = points ? { points, timestamp: performance.now() } : null;
        setState(points ? 'tracking' : 'searching');
      },
      onError(error) {
        if (stopped) return;
        latest.current = null;
        clear();
        setState('error');
        console.warn('[Face tracking] MediaPipe failed:', error?.message || error);
      },
    };
    try {
      stopProvider = startMediaPipeTracking(video.current, callbacks);
    } catch (error) {
      callbacks.onError(error);
    }
    createStickerRenderer({
      onFallback(error) {
        if (stopped) return;
        setRendererMode('canvas2d');
        console.warn('[Sticker renderer] Using Canvas2D:', error?.message || error);
      },
    }).then((created) => {
      if (stopped) {
        created.destroy();
        return;
      }
      renderer.current = created;
      setRendererMode(created.mode);
    });
    function paint(now) {
      if (stopped) return;
      const source = video.current;
      if (source?.readyState >= 2 && canvas && (maxWidth === Infinity || now - previousFrame >= 30)) {
        previousFrame = now;
        const width = Math.min(isPortraitEffect(selected.current) ? 640 : Infinity, maxWidth, source.videoWidth);
        const height = Math.round(width * source.videoHeight / source.videoWidth);
        const resized = canvas.width !== width || canvas.height !== height;
        if (resized) {
          canvas.width = width;
          canvas.height = height;
        }
        if (latest.current && now - latest.current.timestamp >= 600) {
          latest.current = null;
          setState('searching');
        }
        const livePortrait = isPortraitEffect(selected.current) && source.currentTime !== paintedMediaTime;
        if (resized || paintedFrame !== latest.current || paintedSticker !== selected.current || livePortrait ||
          paintedRenderer !== renderer.current) {
          paintedFrame = latest.current;
          paintedSticker = selected.current;
          paintedRenderer = renderer.current;
          paintedMediaTime = source.currentTime;
          const ctx = canvas.getContext('2d');
          ctx.clearRect(0, 0, width, height);
          if (paintedFrame) draw(ctx, paintedFrame.points, width, height, paintedSticker);
        }
      }
      raf = requestAnimationFrame(paint);
    }
    raf = requestAnimationFrame(paint);
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stopProvider?.();
      latest.current = null;
      renderer.current?.destroy();
      renderer.current = null;
      portraitBuffer.current = null;
      clear();
    };
  }, [active, attempt, video, overlay, maxWidth]);
  return {
    state:
      active && rendererMode === 'loading' && trackingState !== 'error' ? 'loading' : trackingState,
    latest,
    rendererMode,
    draw,
    retry: () => setAttempt((value) => value + 1),
  };
}
