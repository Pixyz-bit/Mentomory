import { useEffect, useRef, useState } from 'react';
import { templates } from '../data/templates.js';
import { LIVE_SECONDS, motionStyles, supportsMp4 } from '../lib/media/live-media.js';
import { useFaceStickers } from './useFaceStickers.js';
import useBackgroundBlur from './useBackgroundBlur.js';
import useCamera from './useCamera.js';
import usePhotoCapture from './usePhotoCapture.js';
import useWorkflow from './useWorkflow.js';
// The session survives navigation between capture and the editor.
export default function useBoothSession() {
  const video = useRef(null);
  const overlay = useRef(null);
  const stream = useRef(null);
  const requestId = useRef(0);
  const timer = useRef(null);
  const sequence = useRef(false);
  const [autoCapture, setAutoCapture] = useState(false);
  const [autoStart, setAutoStart] = useState(true);
  const shotUrls = useRef([]);
  const recording = useRef(null);
  const [shots, setShots] = useState([]);
  const [posePrompts, setPosePrompts] = useState([]);
  const [reviewShotIndex, setReviewShotIndex] = useState(null);
  const [retakeIndex, setRetakeIndex] = useState(null);
  const [templateId, setTemplateId] = useState(null);
  const [layoutChosen, setLayoutChosen] = useState(false);
  const [editorSettings, setEditorSettings] = useState(null);
  const template = templates.find((item) => item.id === templateId);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [mirror, setMirror] = useState(true);
  const [selectedDelay, setSelectedDelay] = useState(3);
  const delay = [0, 3, 5].includes(selectedDelay) ? selectedDelay : 3;
  const setDelay = (value) => setSelectedDelay([0, 3, 5].includes(value) ? value : 3);
  const [countdown, setCountdown] = useState(null);
  const [flash, setFlash] = useState(false);
  const [sticker, setSticker] = useState('none');
  const [photoEffect, setPhotoEffect] = useState('none');
  const [mode, setMode] = useState('photo');
  const [motionStyle, setMotionStyle] = useState('standard');
  const motion = motionStyles[motionStyle];
  const recordingSeconds = motion?.seconds ?? LIVE_SECONDS;
  const [mp4Supported, setMp4Supported] = useState(null);
  const [recordProgress, setRecordProgress] = useState(0);
  const completed = Boolean(template && shots.length === template.count && retakeIndex === null);
  const cameraActive =
    ['ready', 'recording'].includes(status) || (status === 'saving' && !completed);
  const { releaseCamera, openCamera, stopCamera } = useCamera({
    video,
    stream,
    requestId,
    recording,
    cancelCountdown,
    setError,
    setStatus,
    setRecordProgress,
  });
  const page = useWorkflow({
    completed,
    layoutChosen,
    onLeaveCapture(next) {
      setReviewShotIndex(null);
      requestId.current++;
      recording.current?.abort();
      cancelCountdown();
      releaseCamera();
      setFlash(false);
      setRecordProgress(0);
      setStatus(next !== 'templates' && completed ? 'review' : 'idle');
      if (next === 'templates') {
        shotUrls.current.forEach((url) => URL.revokeObjectURL(url));
        shotUrls.current = [];
        setShots((current) => (current.length ? [] : current));
        setPosePrompts((current) => (current.length ? [] : current));
        setLayoutChosen(false);
        setTemplateId(null);
        setRetakeIndex(null);
        setEditorSettings(null);
        setMode('photo');
        setMotionStyle('standard');
        setError('');
        setMirror(true);
        setSelectedDelay(3);
        setAutoStart(true);
        setSticker('none');
        setPhotoEffect('none');
      }
    },
  });
  const backgroundBlur = useBackgroundBlur(
    video,
    photoEffect === 'background-blur' && cameraActive && page === 'booth'
  );
  const face = useFaceStickers(video, overlay, cameraActive && page === 'booth', sticker);
  const stickerReady = sticker === 'none' || face.state === 'tracking';
  useEffect(() => {
    if (page !== 'booth') return;
    let cancelled = false;
    supportsMp4().then((value) => {
      if (!cancelled) setMp4Supported(value);
    });
    return () => {
      cancelled = true;
    };
  }, [page]);
  function cancelCountdown() {
    sequence.current = false;
    setAutoCapture(false);
    clearInterval(timer.current);
    timer.current = null;
    setCountdown(null);
  }
  const { takePhoto } = usePhotoCapture({
    video,
    stream,
    requestId,
    recording,
    shotUrls,
    timer,
    shots,
    sequence,
    setAutoCapture,
    autoStart,
    template,
    mode,
    motion,
    mirror,
    photoEffect,
    backgroundBlur,
    delay,
    sticker,
    face,
    retakeIndex,
    setRetakeIndex,
    status,
    countdown,
    completed,
    cancelCountdown,
    releaseCamera,
    setError,
    setStatus,
    setRecordProgress,
    setShots,
    onReviewShot: setReviewShotIndex,
    setFlash,
    setCountdown,
  });
  function redoAll() {
    if (busy) return;
    requestId.current++;
    recording.current?.abort();
    cancelCountdown();
    releaseCamera();
    shotUrls.current.forEach((url) => URL.revokeObjectURL(url));
    shotUrls.current = [];
    setShots([]);
    setRetakeIndex(null);
    setEditorSettings(null);
    setFlash(false);
    setError('');
    setRecordProgress(0);
    openCamera();
  }
  function retakePhoto(index) {
    if (busy || !shots[index]) return;
    cancelCountdown();
    setRetakeIndex(index);
    setError('');
    if (stream.current?.active) setStatus('ready');
    else openCamera();
  }
  function cancelRetake() {
    if (busy) return;
    releaseCamera();
    setRetakeIndex(null);
    setError('');
    setStatus(shots.length === template.count ? 'review' : 'idle');
  }
  function acceptUploadedShots(uploadedShots) {
    shotUrls.current.push(...uploadedShots.map(({ url }) => url));
    setShots(uploadedShots);
    setStatus('review');
  }
  const busy =
    autoCapture || countdown !== null || ['loading', 'saving', 'recording'].includes(status);
  const reviewing = status === 'review';
  const templateLocked = busy || shots.length > 0;
  return {
    shots,
    posePrompts,
    setPosePrompts,
    reviewShotIndex,
    setReviewShotIndex,
    acceptUploadedShots,
    autoCapture,
    autoStart,
    setAutoStart,
    redoAll,
    retakeIndex,
    retakePhoto,
    cancelRetake,
    template,
    templateId,
    setTemplateId,
    layoutChosen,
    setLayoutChosen,
    editorSettings,
    setEditorSettings,
    status,
    error,
    mirror,
    setMirror,
    delay,
    setDelay,
    countdown,
    flash,
    sticker,
    setSticker,
    photoEffect,
    backgroundBlur,
    setPhotoEffect,
    page,
    mode,
    setMode,
    motionStyle,
    setMotionStyle,
    recordingSeconds,
    mp4Supported,
    recordProgress,
    completed,
    cameraActive,
    face,
    stickerReady,
    video,
    overlay,
    busy,
    reviewing,
    templateLocked,
    openCamera,
    stopCamera,
    cancelCountdown,
    takePhoto,
  };
}
