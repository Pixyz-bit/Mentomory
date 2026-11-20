import { useEffect, useMemo, useRef, useState, useReducer } from 'react';
import { makeEditHistory, editHistoryReducer } from '../lib/edit-history.js';
import { pickerLayouts } from '../data/templates.js';
import { composePhotos, layoutSize, pairLayout } from '../lib/collage.js';
import { composeLive } from '../lib/media/live-media.js';
import { poseImage } from '../data/memePoses.js';
import posthog, { posthogEnabled } from '../lib/posthog.js';
export default function useStripEditor({
  shots,
  posePrompts,
  template,
  settings,
  onSettingsChange,
}) {
  const live = shots[0]?.type === 'live';
  const compatible = pickerLayouts.filter((item) => item.count === shots.length);
  const initialLayout = compatible.some((item) => item.id === settings?.layoutId)
    ? settings.layoutId
    : template.id;
  const [editHistory, dispatch] = useReducer(editHistoryReducer, null, () =>
    makeEditHistory(
      {
        background: settings?.background ?? 'black',
        layoutId: initialLayout,
        filter: settings?.filter ?? 'normal',
        decoration: settings?.decoration ?? 'none',
        caption: settings?.caption ?? 'mentomory',
        frame: settings?.frame ?? 'none',
      },
      settings?.history
    )
  );
  const { background, filter, decoration, caption, frame } = editHistory.present;
  const selectedLayout =
    compatible.find((item) => item.id === editHistory.present.layoutId) ?? template;
  const layoutId = selectedLayout.id;
  const meme = !live && posePrompts?.length === shots.length;
  const layout = useMemo(
    () => (meme ? pairLayout(selectedLayout) : selectedLayout),
    [meme, selectedLayout]
  );
  const patch = (values) => dispatch({ type: 'patch', values });
  const setBackground = (value) => patch({ background: value }),
    setLayoutId = (value) => {
      if (compatible.some((item) => item.id === value)) patch({ layoutId: value });
    },
    setFilter = (value) => patch({ filter: value }),
    setDecoration = (value) => patch({ decoration: value }),
    setCaption = (value) => patch({ caption: value }),
    setFrame = (value) => patch({ frame: value });
  const chooseBackground = (value) => patch({ frame: 'none', background: value });
  const [playing, setPlaying] = useState(true);
  const [downloadStatus, setDownloadStatus] = useState('');
  const downloadTimer = useRef(null);
  const [output, setOutput] = useState(null),
    [busy, setBusy] = useState(true),
    [error, setError] = useState(''),
    [retry, setRetry] = useState(0);
  const [exporting, setExporting] = useState(false),
    [progress, setProgress] = useState(0),
    [mp4, setMp4] = useState(null);
  const currentUrl = useRef(null),
    mp4Url = useRef(null),
    abort = useRef(null),
    heading = useRef(null);
  const size = layoutSize(layout);
  const options = {
    frame,
    background,
    filter,
    decoration,
    caption,
  };
  useEffect(() => {
    heading.current?.focus();
  }, []);
  useEffect(() => {
    onSettingsChange({
      frame,
      background,
      layoutId,
      filter,
      decoration,
      caption,
      history: { past: editHistory.past, future: editHistory.future },
    });
  }, [editHistory, onSettingsChange]);
  useEffect(() => {
    let cancelled = false;
    let revealTimeout;
    const revealAt = performance.now() + 1000;
    setBusy(true);
    setError('');
    clearTimeout(downloadTimer.current);
    setDownloadStatus('');
    setMp4(null);
    if (mp4Url.current) {
      URL.revokeObjectURL(mp4Url.current);
      mp4Url.current = null;
    }
    const timeout = setTimeout(async () => {
      try {
        const images = live
          ? shots.map((shot) => ({
              url: shot.poster,
            }))
          : meme
            ? shots.flatMap((shot, index) => [shot, { url: poseImage(posePrompts[index]) }])
            : shots;
        const result = await composePhotos(images, layout, {
          frame,
          background,
          filter,
          decoration,
          caption,
        });
        if (cancelled) return;
        revealTimeout = setTimeout(
          () => {
            const url = URL.createObjectURL(result.blob);
            if (currentUrl.current) URL.revokeObjectURL(currentUrl.current);
            currentUrl.current = url;
            setOutput(url);
            setBusy(false);
          },
          Math.max(0, Math.ceil(revealAt - performance.now()))
        );
      } catch {
        if (!cancelled) {
          setBusy(false);
          setError('The strip couldn’t be rendered. Try again to keep your edits.');
        }
      }
    }, 120);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
      clearTimeout(revealTimeout);
    };
  }, [
    shots,
    live,
    meme,
    posePrompts,
    layout,
    frame,
    background,
    filter,
    decoration,
    caption,
    retry,
  ]);
  useEffect(
    () => () => {
      abort.current?.abort();
      clearTimeout(downloadTimer.current);
      if (currentUrl.current) URL.revokeObjectURL(currentUrl.current);
      if (mp4Url.current) URL.revokeObjectURL(mp4Url.current);
    },
    []
  );
  async function exportVideo() {
    const controller = new AbortController();
    abort.current = controller;
    setExporting(true);
    setProgress(0);
    setError('');
    setPlaying(false);
    try {
      const result = await composeLive(shots, layout, options, {
        signal: controller.signal,
        onProgress: setProgress,
      });
      if (controller.signal.aborted) return;
      const url = URL.createObjectURL(result.blob);
      if (mp4Url.current) URL.revokeObjectURL(mp4Url.current);
      mp4Url.current = url;
      setMp4({
        url,
        width: result.width,
        height: result.height,
      });
      if (posthogEnabled)
        posthog.capture('live_strip_created', {
          template_id: layout.id,
          media_count: shots.length,
        });
    } catch (err) {
      if (err.name !== 'AbortError')
        setError(err.message || 'The MP4 couldn’t be created. Try again.');
    } finally {
      if (abort.current === controller) {
        abort.current = null;
        setExporting(false);
        setPlaying(true);
      }
    }
  }
  const filename = `mentomory-${layout.id}-${frame === 'none' ? background : frame}-${filter}`;
  const previewImage = shots[0].poster || shots[0].url;
  return {
    live,
    chooseBackground,
    undo: () => dispatch({ type: 'undo' }),
    redo: () => dispatch({ type: 'redo' }),
    canUndo: editHistory.past.length > 0,
    canRedo: editHistory.future.length > 0,
    downloadStatus,
    onDownload: (downloadFormat) => {
      if (posthogEnabled)
        posthog.capture('strip_downloaded', {
          download_format: downloadFormat,
          template_id: layout.id,
          media_count: shots.length,
        });
      clearTimeout(downloadTimer.current);
      setDownloadStatus('Download requested. Check your browser downloads.');
      downloadTimer.current = setTimeout(() => setDownloadStatus(''), 4500);
    },
    frame,
    setFrame,
    background,
    setBackground,
    layoutId,
    setLayoutId,
    filter,
    setFilter,
    decoration,
    setDecoration,
    caption,
    setCaption,
    playing,
    setPlaying,
    output,
    busy,
    error,
    setRetry,
    retry,
    exporting,
    progress,
    mp4,
    abort,
    heading,
    layout,
    available: compatible,
    diagram: meme ? 'paired' : 'classic',
    size,
    options,
    filename,
    previewImage,
    exportVideo,
  };
}
