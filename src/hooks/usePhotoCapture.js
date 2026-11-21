import { useEffect, useRef } from 'react';
import { encodeCanvas } from '../lib/media/live-media.js';
import { replaceCapturedShot } from '../lib/capture-state.js';
import { drawSticker } from '../lib/stickers/sticker-art.js';
import { isPortraitEffect } from '../lib/face/portrait-effects.js';
import posthog, { posthogEnabled } from '../lib/posthog.js';
import { logPosthogInfo } from '../lib/posthogLogger.js';
export default function usePhotoCapture({
  video,
  stream,
  requestId,
  recording,
  shotUrls,
  timer,
  shots,
  sequence,
  setAutoCapture = () => {},
  autoStart = true,
  template,
  mode,
  motion,
  mirror,
  photoEffect = 'none',
  backgroundBlur,
  delay,
  sticker,
  face,
  retakeIndex,
  setRetakeIndex,
  status,
  countdown,
  completed,
  releaseCamera,
  setError,
  setStatus,
  setRecordProgress,
  setShots,
  onReviewShot,
  setFlash,
  setCountdown,
}) {
  const captureLock = useRef(false);
  const localSequence = useRef(false);
  const activeSequence = sequence ?? localSequence;
  const sequenceShots = useRef(shots);
  function clearCountdown() {
    clearInterval(timer.current);
    timer.current = null;
    setCountdown(null);
  }
  function stopSequence() {
    activeSequence.current = false;
    setAutoCapture(false);
    captureLock.current = false;
    clearCountdown();
  }
  useEffect(() => {
    if (
      !activeSequence.current &&
      countdown === null &&
      !['saving', 'recording', 'loading'].includes(status)
    )
      captureLock.current = false;
  }, [status, countdown]);
  function saveShot(shot) {
    const previous = retakeIndex === null ? null : sequenceShots.current[retakeIndex];
    const next = replaceCapturedShot(sequenceShots.current, shot, retakeIndex);
    const mediaType = shot.type === 'live' ? 'live_clip' : 'photo';
    const captureNumber = retakeIndex === null ? next.length : retakeIndex + 1;
    if (posthogEnabled)
      posthog.capture('media_captured', {
        media_type: mediaType,
        capture_number: captureNumber,
        template_id: template.id,
        is_retake: retakeIndex !== null,
      });
    logPosthogInfo('media capture completed', {
      media_type: mediaType,
      capture_number: captureNumber,
      is_retake: retakeIndex !== null,
    });
    sequenceShots.current = next;
    setShots(next);
    if (!autoStart || delay === 0) onReviewShot?.(captureNumber - 1);
    if (previous) {
      URL.revokeObjectURL(previous.url);
      shotUrls.current = shotUrls.current.filter((url) => url !== previous.url);
      setRetakeIndex(null);
    }
    if (next.length === template.count) {
      stopSequence();
      releaseCamera();
      setStatus('review');
    } else {
      setStatus('ready');
      if (activeSequence.current) scheduleCapture();
      else stopSequence();
    }
  }
  useEffect(
    () => () => {
      activeSequence.current = false;
      requestId.current++;
      recording.current?.abort();
      clearInterval(timer.current);
      if (stream.current) stream.current.getTracks().forEach((track) => track.stop());
      shotUrls.current.forEach((url) => URL.revokeObjectURL(url));
    },
    []
  );
  async function captureLive() {
    clearCountdown();
    const id = requestId.current,
      source = video.current;
    if (!source?.videoWidth || !stream.current?.active) {
      stopSequence();
      setError('The camera isn’t ready. Enable it and try again.');
      return;
    }
    const controller = new AbortController();
    recording.current = controller;
    setStatus('recording');
    setRecordProgress(0);
    const canvas = document.createElement('canvas'),
      scale = Math.min(1, 960 / source.videoWidth, 720 / source.videoHeight);
    canvas.width = Math.floor((source.videoWidth * scale) / 2) * 2;
    canvas.height = Math.floor((source.videoHeight * scale) / 2) * 2;
    const ctx = canvas.getContext('2d');
    let poster;
    try {
      const blob = await encodeCanvas(
        canvas,
        () => {
          if (!stream.current?.active)
            throw new Error('The camera disconnected during recording. Enable it and try again.');
          ctx.save();
          if (mirror) {
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
          }
          ctx.filter = photoEffect === 'background-blur' ? 'none' : photoEffect;
          ctx.drawImage(photoEffect === 'background-blur' ? backgroundBlur.canvas.current : source, 0, 0, canvas.width, canvas.height);
          if (!isPortraitEffect(sticker)) ctx.filter = 'none';
          const result = face.latest.current;
          if (sticker !== 'none' && result && performance.now() - result.timestamp < 600)
            (face.draw || drawSticker)(ctx, result.points, canvas.width, canvas.height, sticker);
          ctx.restore();
          if (!poster) poster = canvas.toDataURL('image/jpeg', 0.9);
        },
        {
          signal: controller.signal,
          realtime: true,
          ...motion,
          onProgress: setRecordProgress,
        }
      );
      if (id !== requestId.current) return;
      const url = URL.createObjectURL(blob);
      shotUrls.current.push(url);
      saveShot({
        url,
        poster,
        blob,
        type: 'live',
        width: canvas.width,
        height: canvas.height,
        fps: motion?.fps,
        seconds: motion?.boomerang ? 2 * motion.seconds - 2 / motion.fps : motion?.seconds,
      });
    } catch (err) {
      if (id === requestId.current) stopSequence();
      if (id === requestId.current && err.name !== 'AbortError') {
        setError(err.message || 'Live recording failed. Try again or switch to Photo.');
        setStatus('ready');
      }
    } finally {
      if (recording.current === controller) recording.current = null;
      setRecordProgress(0);
    }
  }
  async function capture() {
    clearCountdown();
    const id = requestId.current;
    const source = video.current;
    if (!source?.videoWidth || source.readyState < 2 || !stream.current?.active) {
      stopSequence();
      setError('The camera isn’t ready yet. Wait a moment, then take your photo again.');
      return;
    }
    setStatus('saving');
    let stickerPoints = null;
    if (sticker !== 'none') {
      const deadline = performance.now() + 1500;
      const fresh = () =>
        face.latest.current && performance.now() - face.latest.current.timestamp < 600;
      while (!fresh() && performance.now() < deadline && id === requestId.current) {
        await new Promise((resolve) => setTimeout(resolve, 40));
      }
      if (id !== requestId.current) return;
      if (!fresh()) {
        stopSequence();
        setStatus('ready');
        setError(
          'Face tracking lost your face. Face the camera and try again, or select None under Face stickers.'
        );
        return;
      }
      stickerPoints = face.latest.current.points;
    }
    const canvas = document.createElement('canvas');
    canvas.width = source.videoWidth;
    canvas.height = source.videoHeight;
    const ctx = canvas.getContext('2d');
    if (mirror) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.filter = photoEffect === 'background-blur' ? 'none' : photoEffect;
    ctx.drawImage(photoEffect === 'background-blur' ? backgroundBlur.canvas.current : source, 0, 0, canvas.width, canvas.height);
    if (!isPortraitEffect(sticker)) ctx.filter = 'none';
    if (stickerPoints)
      (face.draw || drawSticker)(ctx, stickerPoints, canvas.width, canvas.height, sticker);
    setFlash(true);
    canvas.toBlob(
      (blob) => {
        if (id !== requestId.current) return;
        setFlash(false);
        if (!blob) {
          stopSequence();
          setError('The photo couldn’t be saved. Please try again.');
          setStatus('ready');
          return;
        }
        const url = URL.createObjectURL(blob);
        shotUrls.current.push(url);
        saveShot({ url, width: canvas.width, height: canvas.height });
      },
      'image/jpeg',
      0.95
    );
  }
  function scheduleCapture() {
    const take = async () => {
      const id = requestId.current;
      try {
        await (mode === 'live' ? captureLive() : capture());
      } catch (error) {
        if (id !== requestId.current) return;
        stopSequence();
        setFlash(false);
        setStatus('ready');
        setError(error.message || 'Capture failed. Try the sequence again.');
      }
    };
    if (delay === 0) {
      take();
      return;
    }
    let remaining = delay;
    setCountdown(remaining);
    const id = requestId.current;
    const interval = setInterval(() => {
      if (timer.current !== interval) return;
      if (id !== requestId.current || !captureLock.current) {
        clearCountdown();
        return;
      }
      remaining--;
      if (remaining === 0) take();
      else setCountdown(remaining);
    }, 1000);
    timer.current = interval;
  }
  function takePhoto() {
    if (photoEffect === 'background-blur' && backgroundBlur?.status !== 'ready') return;
    if (captureLock.current || status !== 'ready' || countdown !== null || completed) return;
    captureLock.current = true;
    sequenceShots.current = shots;
    activeSequence.current = autoStart && delay > 0 && retakeIndex === null;
    setAutoCapture(activeSequence.current);
    setError('');
    scheduleCapture();
  }
  return {
    takePhoto,
  };
}
