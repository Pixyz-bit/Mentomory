import { useEffect, useRef, useState } from 'react';

export default function useBackgroundBlur(video, enabled) {
  const canvas = useRef(null);
  const [status, setStatus] = useState('idle');

  useEffect(() => {
    if (!enabled) {
      setStatus('idle');
      return;
    }

    let disposed = false;
    let segmenter;
    let frame;
    let previousTime = -Infinity;
    let pixels;
    const maskCanvas = document.createElement('canvas');
    const foreground = document.createElement('canvas');
    const maskContext = maskCanvas.getContext('2d');
    const foregroundContext = foreground.getContext('2d');
    setStatus('loading');

    function render(timestamp) {
      const source = video.current;
      const output = canvas.current;
      if (source?.readyState >= 2 && output && timestamp - previousTime >= 66) {
        previousTime = timestamp;
        try {
          segmenter.segmentForVideo(source, timestamp, ({ confidenceMasks }) => {
            const mask = confidenceMasks[1];
            if (!mask) return;
            if (!pixels || maskCanvas.width !== mask.width || maskCanvas.height !== mask.height) {
              maskCanvas.width = mask.width;
              maskCanvas.height = mask.height;
              pixels = maskContext.createImageData(mask.width, mask.height);
            }
            const confidence = mask.getAsFloat32Array();
            for (let i = 0; i < confidence.length; i++) {
              pixels.data[i * 4 + 3] = Math.round(255 * confidence[i]);
            }
            maskContext.putImageData(pixels, 0, 0);

            const width = Math.min(960, source.videoWidth);
            const height = Math.round(width * source.videoHeight / source.videoWidth);
            if (output.width !== width || output.height !== height) {
              output.width = foreground.width = width;
              output.height = foreground.height = height;
            }
            foregroundContext.globalCompositeOperation = 'copy';
            foregroundContext.drawImage(maskCanvas, 0, 0, width, height);
            foregroundContext.globalCompositeOperation = 'source-in';
            foregroundContext.drawImage(source, 0, 0, width, height);

            const context = output.getContext('2d');
            context.drawImage(source, 0, 0, width, height);
            context.filter = 'blur(12px)';
            context.drawImage(source, 0, 0, width, height);
            context.filter = 'none';
            context.drawImage(foreground, 0, 0);
            setStatus('ready');
          });
        } catch {
          setStatus('error');
          return;
        }
      }
      frame = requestAnimationFrame(render);
    }

    async function start() {
      try {
        const { FilesetResolver, ImageSegmenter } = await import('@mediapipe/tasks-vision');
        const assets = import.meta.env.BASE_URL + 'mediapipe';
        const vision = await FilesetResolver.forVisionTasks(assets + '/wasm');
        const detector = await ImageSegmenter.createFromOptions(vision, {
          baseOptions: { modelAssetPath: assets + '/selfie_segmenter.tflite' },
          runningMode: 'VIDEO',
          outputConfidenceMasks: true,
        });
        if (disposed) detector.close();
        else {
          segmenter = detector;
          frame = requestAnimationFrame(render);
        }
      } catch {
        if (!disposed) setStatus('error');
      }
    }

    start();
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      segmenter?.close();
    };
  }, [enabled, video]);

  return { canvas, status };
}
