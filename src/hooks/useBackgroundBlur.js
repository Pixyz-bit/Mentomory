import { useEffect, useRef, useState } from 'react';

export default function useBackgroundBlur(video, enabled, maxWidth = 960) {
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
    let previousMask = -Infinity;
    let previousFrame = -1;
    let pixels;
    const modelInput = document.createElement('canvas');
    const modelContext = modelInput.getContext('2d', { alpha: false });
    const maskCanvas = document.createElement('canvas');
    const exclusion = document.createElement('canvas');
    const background = document.createElement('canvas');
    const cleanPlate = document.createElement('canvas');
    const foreground = document.createElement('canvas');
    const maskContext = maskCanvas.getContext('2d');
    const foregroundContext = foreground.getContext('2d');
    const exclusionContext = exclusion.getContext('2d');
    const backgroundContext = background.getContext('2d');
    const cleanContext = cleanPlate.getContext('2d', { willReadFrequently: true });
    setStatus('loading');

    function updateBackground(width, height) {
      if (background.width !== width || background.height !== height) {
        background.width = cleanPlate.width = width;
        background.height = cleanPlate.height = height;
      }
      backgroundContext.globalCompositeOperation = 'copy';
      backgroundContext.drawImage(modelInput, 0, 0);
      backgroundContext.globalCompositeOperation = 'destination-out';
      backgroundContext.drawImage(exclusion, 0, 0, width, height);
      cleanContext.clearRect(0, 0, width, height);
      cleanContext.filter = 'blur(3px)';
      cleanContext.drawImage(background, 0, 0);
      cleanContext.filter = 'none';
      // Canvas reads back unpremultiplied color. Keep only pixels supported by real background samples.
      const frame = cleanContext.getImageData(0, 0, width, height);
      for (let i = 3; i < frame.data.length; i += 4) {
        frame.data[i] = frame.data[i] >= 8 ? 255 : 0;
      }
      cleanContext.putImageData(frame, 0, 0);
    }

    function render(timestamp) {
      const source = video.current;
      const output = canvas.current;
      if (source?.videoWidth && source.readyState >= 2 && output && source.currentTime !== previousFrame) {
        previousFrame = source.currentTime;
        try {
          // Reuse the latest segmentation between model runs so the subject keeps moving at camera speed.
          if (timestamp - previousMask >= 95) {
            previousMask = timestamp;
            const scale = Math.min(1, 256 / Math.max(source.videoWidth, source.videoHeight));
            const width = Math.max(1, Math.round(source.videoWidth * scale));
            const height = Math.max(1, Math.round(source.videoHeight * scale));
            if (modelInput.width !== width || modelInput.height !== height) {
              modelInput.width = width;
              modelInput.height = height;
            }
            modelContext.drawImage(source, 0, 0, width, height);
            segmenter.segmentForVideo(modelInput, timestamp, ({ confidenceMasks }) => {
              const mask = confidenceMasks.length === 1 ? confidenceMasks[0] : confidenceMasks[1];
              if (!mask) return;
              const firstMask = !pixels;
              if (firstMask || maskCanvas.width !== mask.width || maskCanvas.height !== mask.height) {
                maskCanvas.width = mask.width;
                maskCanvas.height = mask.height;
                exclusion.width = mask.width;
                exclusion.height = mask.height;
                pixels = maskContext.createImageData(mask.width, mask.height);
              }
              const confidence = mask.getAsFloat32Array();
              for (let i = 0; i < confidence.length; i++) {
                const edge = Math.max(0, Math.min(1, (confidence[i] - .25) / .55));
                pixels.data[i * 4 + 3] = Math.round(255 * edge * edge * (3 - 2 * edge));
              }
              maskContext.putImageData(pixels, 0, 0);
              for (let i = 0; i < confidence.length; i++) {
                pixels.data[i * 4 + 3] = Math.round(255 * Math.max(0, Math.min(1, (confidence[i] - .09) / .20)));
              }
              exclusionContext.putImageData(pixels, 0, 0);
              updateBackground(width, height);
              if (firstMask) setStatus('ready');
            });
          }

          if (pixels) {
            const width = Math.min(maxWidth, source.videoWidth);
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
            context.drawImage(cleanPlate, 0, 0, width, height);
            context.drawImage(foreground, 0, 0);
          }
        } catch (error) {
          setStatus('error');
          console.warn('[Background blur] Could not process a frame:', error.message);
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
      } catch (error) {
        if (!disposed) {
          setStatus('error');
          console.warn('[Background blur] Initialization failed:', error.message);
        }
      }
    }

    start();
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      segmenter?.close();
    };
  }, [enabled, maxWidth, video]);

  return { canvas, status };
}
