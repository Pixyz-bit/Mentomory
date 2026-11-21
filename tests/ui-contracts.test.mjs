import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const server = await createServer({
  configLoader: 'runner',
  server: { middlewareMode: true },
  appType: 'custom',
});
after(() => server.close());
const { templates } = await server.ssrLoadModule('/src/data/templates.js');
const template = templates.find((item) => item.id === 'strip-four');
const render = (Component, props) => renderToStaticMarkup(React.createElement(Component, props));
test('layout screen shows all cards and confirms the selected preview inline', async () => {
  const { default: Page } = await server.ssrLoadModule('/src/pages/templates/TemplatesPage.jsx');
  const html = render(Page);
  assert.equal((html.match(/class="template-choice(?: |")/g) || []).length, 9);
  assert.match(html, /selection-actions[\s\S]*Next: Choose a layout/);
  assert.match(html, /<strong>Upload photos<\/strong>/);
  assert.doesNotMatch(html, /<dialog/);
  assert.doesNotMatch(html, /Return to camera|capture layout is locked/);
  assert.match(html, /data-filtered="false"/);
  assert.match(html, /aria-pressed="true"/);
  assert.doesNotMatch(html, /aria-label="Photo count"/);
  assert.doesNotMatch(html, /template-categories|Pick for me|template-search|type="search"/);
  assert.doesNotMatch(html, />[1-4] photos?</);
  const { default: Tools } = await server.ssrLoadModule(
    '/src/components/templates/TemplateTools.jsx'
  );
  const filtered = render(Tools, { count: 8, counts: [1, 2, 3, 4, 6, 8, 9] });
  assert.match(filtered, /<option value="8" selected="">8 photos/);
  assert.equal((filtered.match(/selected=""/g) || []).length, 1);
});
test('fresh layout screen previews Classic strip and can continue', async () => {
  const { default: Page } = await server.ssrLoadModule('/src/pages/templates/TemplatesPage.jsx');
  const html = render(Page);
  assert.equal((html.match(/class="template-choice(?: |")/g) || []).length, 9);
  assert.doesNotMatch(html, /<h2>Classic strip<\/h2>/);
  assert.match(html, /class="template-choice selected"[^>]*>[\s\S]*?<strong>4-cut<\/strong>/);
  assert.match(html, /selection-actions[\s\S]*Next: Choose a layout/);
});
test('shutter capture gating and cancellation remain explicit', async () => {
  const { default: Actions } = await server.ssrLoadModule(
    '/src/components/capture/CaptureActions.jsx'
  );
  const props = {
    countdown: null,
    status: 'ready',
    completed: false,
    stickerReady: true,
    mode: 'photo',
  };
  assert.doesNotMatch(render(Actions, props), /disabled/);
  assert.match(render(Actions, { ...props, status: 'idle' }), /disabled/);
  assert.match(render(Actions, { ...props, completed: true }), /disabled/);
  assert.match(render(Actions, { ...props, countdown: 3 }), /Cancel countdown/);
  assert.match(render(Actions, { ...props, status: 'recording' }), /Cancel recording/);
});
test('capture grid preserves slot order and offers a preview for captured slots and preserves clip downloads', async () => {
  const { default: Gallery } = await server.ssrLoadModule(
    '/src/components/capture/CapturedGallery.jsx'
  );
  const html = render(Gallery, {
    mode: 'live',
    shots: [{ url: 'clip.mp4', type: 'live', poster: 'cover.jpg' }],
    template,
    busy: false,
    retakeIndex: null,
  });
  assert.equal((html.match(/class="capture-slot /g) || []).length, 4);
  assert.match(html, /aria-label="Preview clip 1"/);
  assert.match(html, /download="mentomory-live-1.mp4"/);
  const boomerang = render(Gallery, {
    mode: 'live',
    motionStyle: 'boomerang',
    shots: [{ url: 'clip.mp4', type: 'live', poster: 'cover.jpg' }],
    template,
  });
  assert.match(boomerang, /aria-label="Preview clip 1"/);
  assert.doesNotMatch(boomerang, /download=/);
  assert.match(html, /Awaiting clip 4/);
  assert.doesNotMatch(html, /<figcaption/);
  assert.match(html, /role="group" aria-label="Captured media in layout order"/);
  const { default: Page } = await server.ssrLoadModule('/src/pages/capture/CapturePage.jsx');
  const page = render(Page, {
    session: {
      mode: 'photo',
      face: { state: 'idle' },
      devices: [],
      delay: 3,
      mp4Supported: true,
      templateLocked: false,
      template,
      shots: [],
      status: 'ready',
      cameraActive: true,
      setMirror: () => {},
      sticker: 'none',
      stickerReady: true,
      retakeIndex: null,
      countdown: null,
      video: { current: null },
      overlay: { current: null },
    },
  });
  const actions = page.slice(page.indexOf('<section class="capture-action-bar"'));
  assert.doesNotMatch(page, /class="capture-sidebar"/);
  assert.match(page, /<details class="capture-settings" name="booth-camera-panel">/);
  assert.match(page, /Captured photos/);
  assert.match(page, /<section class="camera-workspace" aria-label="Camera workspace"/);
  assert.doesNotMatch(actions, /aria-label="Take photo"|name="capture-tools"/);
  const camera = page.slice(
    page.indexOf('class="capture-camera"'),
    page.indexOf('<section class="capture-action-bar"')
  );
  assert.match(camera, /camera-effect-carousel/);
  assert.match(camera, /aria-label="Previous effects"/);
  assert.match(camera, /aria-label="Next effects"/);
  assert.match(camera, /aria-label="Mirror photo"/);
  assert.doesNotMatch(camera, /camera-tool-settings|camera-toggle-label|booth-bar/);
  assert.doesNotMatch(page, /<aside class="capture-controls"/);
  assert.doesNotMatch(camera, /sticker-search|type="search"/);
  assert.match(camera, /floating-shutter/);
  assert.match(camera, /camera-stage/);
  assert.doesNotMatch(camera, /capture-toolbar/);
  assert.match(camera, /aria-label="Take photo"/);
  assert.doesNotMatch(camera, /shutter-label|shutter-timer/);
  assert.doesNotMatch(page, /tool-drawer|Strike a pose/);
  assert.match(actions, /<button[^>]* disabled=""[^>]*><span role="status"[^>]*><span aria-hidden="true">0\/4 captured<\/span>/);
  assert.match(actions, /0 of 4 photos captured/);
  assert.match(page, /<div class="capture-header-actions"><a[^>]*aria-label="Back to layout">Back<\/a>/);
  assert.doesNotMatch(actions, /Back to layout/);
});
test('camera idle offers activation and connecting state avoids duplicate activation', async () => {
  const { default: Preview } = await server.ssrLoadModule(
    '/src/components/capture/CameraPreview.jsx'
  );
  const props = {
    status: 'idle',
    cameraActive: false,
    completed: false,
    video: { current: null },
    overlay: { current: null },
    shots: [],
    countdown: null,
    template,
    retakeIndex: null,
  };
  assert.match(render(Preview, props), /Enable camera/);
  assert.doesNotMatch(render(Preview, { ...props, status: 'loading' }), /Enable camera/);
  assert.match(render(Preview, { ...props, status: 'loading' }), /Cancel connection/);
  assert.doesNotMatch(render(Preview, props), /camera-toggle-label|booth-bar/);
});
test('editor groups frame and background options under one tab', async () => {
  const { default: Options } = await server.ssrLoadModule(
    '/src/components/editor/EditorOptions.jsx'
  );
  const html = render(Options, {
    frame: 'none',
    exporting: false,
    error: '',
    available: [template],
  });
  assert.equal((html.match(/role="tab"/g) || []).length, 5);
  assert.equal((html.match(/aria-selected="true"/g) || []).length, 1);
  assert.match(html, /role="tabpanel"/);
  assert.match(html, /Frames/);
  assert.match(html, /Background design/);
  assert.doesNotMatch(html, /role="tab"[^>]*>Backgrounds/);
});
test('downloads retain JPG/MP4 format and truthful download-request feedback', async () => {
  const { default: Actions } = await server.ssrLoadModule(
    '/src/components/editor/EditorActions.jsx'
  );
  const props = {
    live: false,
    exporting: false,
    busy: false,
    error: '',
    output: 'strip.jpg',
    filename: 'pixbooth',
    size: { width: 972, height: 2889 },
    downloadStatus: 'Download requested. Check your browser downloads.',
  };
  const html = render(Actions, props);
  assert.match(html, /download="pixbooth.jpg"/);
  assert.doesNotMatch(html, /download-meta|JPG · full quality|972 × 2889/);
  assert.match(html, /Download requested/);
  const liveHtml = render(Actions, {
    ...props,
    live: true,
    mp4: { url: 'strip.mp4', width: 640, height: 1920 },
  });
  assert.match(liveHtml, /download="pixbooth.mp4"/);
  assert.doesNotMatch(liveHtml, /download-meta|Download cover photo|download="[^"]+\.jpg"/);
  const pendingLiveHtml = render(Actions, { ...props, live: true });
  assert.match(pendingLiveHtml, /Create live strip/);
  assert.doesNotMatch(pendingLiveHtml, /download-meta|Download cover photo|1920px/);
});

test('shared header contains reachable steps between logo and Home with guarded future links', async () => {
  const { default: Steps } = await server.ssrLoadModule('/src/components/layout/WorkflowSteps.jsx');
  const active = render(Steps, { page: 'booth', layoutChosen: true, completed: false });
  const row = active.slice(
    active.indexOf('class="workflow-brand-row"'),
    active.lastIndexOf('</div>')
  );
  assert.match(row, /<nav class="workflow-nav"/);
  assert.ok(row.indexOf('brand-logo') < row.indexOf('<nav'));
  assert.ok(row.indexOf('</nav>') < row.indexOf('workflow-home'));
  assert.ok(active.includes('href="/booth" aria-current="step"'));
  assert.ok(!active.includes('href="/edit"'));
  assert.ok(
    render(Steps, { page: 'editor', layoutChosen: true, completed: true }).includes(
      'href="/edit" aria-current="step"'
    )
  );
});

test('collapsible camera settings show countdown without camera selection', async () => {
  const { default: Settings } = await server.ssrLoadModule(
    '/src/components/capture/PhotoSettings.jsx'
  );
  const props = {
    mode: 'photo',
    busy: false,
    completed: false,
    templateLocked: false,
    mp4Supported: false,
    delay: 3,
    mirror: true,
    status: 'ready',
    deviceId: 'first',
    devices: [
      { deviceId: 'first', label: 'Front camera' },
      { deviceId: 'second', label: 'Back camera' },
    ],
  };
  const html = render(Settings, props);
  assert.match(html, /<details class="settings-panel\b/);
  assert.match(html, /<summary class="tools-heading\b[^"]*">Settings/);
  assert.doesNotMatch(html, /<details[^>]* open=/);
  assert.match(html, /aria-label="Camera settings"/);
  assert.doesNotMatch(html, /Capture mode|>Live/);
  assert.match(html, /Countdown/);
  assert.match(html, /aria-label="Mirror photo"/);
  assert.doesNotMatch(html, /Back camera|<select/);
  const { default: Mode } = await server.ssrLoadModule('/src/components/capture/CaptureMode.jsx');
  const locked = render(Mode, { ...props, templateLocked: true, mp4Supported: true });
  assert.equal((locked.match(/disabled=""/g) || []).length, 2);
});

test('floating shutter preserves cancellation and clears completed live playback', async () => {
  const { default: Preview } = await server.ssrLoadModule(
    '/src/components/capture/CameraPreview.jsx'
  );
  const props = {
    status: 'ready',
    cameraActive: true,
    completed: false,
    video: { current: null },
    overlay: { current: null },
    shots: [],
    countdown: null,
    template,
    retakeIndex: null,
    mode: 'live',
    stickerReady: true,
    delay: 3,
  };
  assert.match(render(Preview, props), /floating-shutter/);
  assert.match(render(Preview, { ...props, countdown: 3 }), /Cancel countdown/);
  assert.match(
    render(Preview, { ...props, status: 'recording', recordProgress: 0.5 }),
    /Cancel recording/
  );
  const finished = render(Preview, { ...props, completed: true, shots: [{ url: 'last.mp4' }] });
  assert.match(finished, /controls="" aria-label="Your last live clip"/);
  assert.doesNotMatch(finished, /floating-shutter/);
  assert.doesNotMatch(
    render(Preview, { ...props, status: 'idle', cameraActive: false }),
    /floating-shutter/
  );
});

test('Sticker discovery exposes every sticker without a category dropdown', async () => {
  const { default: Picker } = await server.ssrLoadModule(
    '/src/components/capture/StickerPicker.jsx'
  );
  const html = render(Picker, { selected: 'none', disabled: false });
  assert.doesNotMatch(html, /<select|sticker-category|Category/);
  assert.equal((html.match(/<button[^>]*aria-label="[^"]* face sticker"/g) || []).length, 49);
  assert.match(html, /Ribbon bow face sticker/);
  assert.match(html, /Moon &amp; stars face sticker/);
  assert.match(html, /Dog face sticker/);
  assert.match(html, /Glasses face sticker/);
  assert.match(html, /None face sticker/);
  assert.doesNotMatch(html, /Clear sticker|sticker-selection/);
});

test('gallery uses uniform media cells for mixed output layouts and live downloads', async () => {
  const { default: Gallery } = await server.ssrLoadModule(
    '/src/components/capture/CapturedGallery.jsx'
  );
  for (const template of templates) {
    const html = render(Gallery, {
      mode: 'photo',
      template,
      shots: [],
      retakeIndex: null,
      busy: false,
    });
    assert.equal((html.match(/class="capture-slot /g) || []).length, template.count);
    assert.doesNotMatch(html, /aspect-ratio|gallery-columns/);
  }
  const html = render(Gallery, {
    mode: 'live',
    template,
    shots: [{ type: 'live', url: 'live.mp4' }],
    retakeIndex: null,
    busy: false,
  });
  assert.match(html, /Download clip 1 as MP4/);
  assert.match(html, /aria-label="Preview clip 1"/);
});

test('supplied icons retain decorative semantics and tracking errors expose an available retry', async () => {
  const { default: Icon } = await server.ssrLoadModule('/src/components/common/Icon.jsx');
  for (const [name, file] of [
    ['sticker', 'stickers.png'],
    ['camera', 'camera.png'],
    ['settings', 'settings.png'],
  ]) {
    const html = render(Icon, { name, size: 24 });
    assert.match(html, new RegExp('icons/' + file));
    assert.match(html, /alt="" aria-hidden="true"/);
    assert.match(html, /width="24" height="24"/);
  }
  const { default: Panel } = await server.ssrLoadModule(
    '/src/components/capture/FaceStickerPanel.jsx'
  );
  const html = render(Panel, {
    embedded: true,
    sticker: 'none',
    busy: false,
    completed: false,
    cameraActive: true,
    face: {
      state: 'error',
    },
  });
  assert.match(html, /Retry face tracking/);
  assert.doesNotMatch(html, /Face tracking<|Jeeliz|<select/);
  assert.doesNotMatch(html, /<button[^>]*disabled[^>]*>Retry face tracking/);
});

test('capture review offers Continue and Back and countdown offers three fixed presets', async () => {
  const { default: Page } = await server.ssrLoadModule('/src/pages/capture/CapturePage.jsx');
  const html = render(Page, {
    session: {
      template,
      shots: [{ url: 'photo.jpg' }],
      mode: 'photo',
      status: 'review',
      completed: true,
      busy: false,
      sticker: 'none',
      stickerReady: true,
      countdown: null,
      devices: [],
      face: { state: 'idle' },
      delay: 7,
    },
  });
  assert.match(html, /Continue/);
  assert.match(html, /Back to layout/);
  assert.doesNotMatch(html, /Redo all photos/);
  assert.doesNotMatch(html, /thumbnail-retake|Cancel retake|Start over/);
  const { default: Settings } = await server.ssrLoadModule(
    '/src/components/capture/PhotoSettings.jsx'
  );
  const settings = render(Settings, { embedded: true, delay: 3, busy: false, devices: [] });
  for (const label of ['Off', '3 sec', '5 sec'])
    assert.match(settings, new RegExp('>' + label + '<'));
  assert.doesNotMatch(settings, /Custom|type="number"|countdown-value/);
  assert.doesNotMatch(settings, /Boomerang length/);
  const boomerangSettings = { motionStyle: 'boomerang', embedded: true, delay: 3 };
  const presets = render(Settings, { ...boomerangSettings, recordingSeconds: 1 });
  assert.match(presets, /<option value="1" selected="">1 second<\/option>/);
  assert.match(presets, /<option value="1\.5">1\.5 seconds<\/option>/);
  const custom = render(Settings, { ...boomerangSettings, recordingSeconds: 5 });
  assert.match(custom, /type="range" min="1" max="5" step="0\.25"/);
});

test('camera gradient follows visible notifications rather than hidden announcements', async () => {
  const { default: Page } = await server.ssrLoadModule('/src/pages/capture/CapturePage.jsx');
  const session = {
    template,
    shots: [],
    mode: 'photo',
    status: 'ready',
    cameraActive: true,
    sticker: 'none',
    stickerReady: true,
    face: { state: 'tracking' },
    delay: 3,
    countdown: null,
    devices: [],
  };
  assert.doesNotMatch(render(Page, { session }), /camera-feedback has-notification/);
  assert.match(
    render(Page, {
      session: { ...session, sticker: 'dog', stickerReady: false, face: { state: 'searching' } },
    }),
    /camera-feedback has-notification/
  );
  assert.doesNotMatch(
    render(Page, { session: { ...session, sticker: 'dog', stickerReady: true } }),
    /camera-feedback has-notification/
  );
  assert.doesNotMatch(
    render(Page, {
      session: { ...session, sticker: 'dog', stickerReady: false, cameraActive: false },
    }),
    /camera-feedback has-notification/
  );
  assert.match(
    render(Page, { session: { ...session, error: 'Camera disconnected' } }),
    /camera-feedback has-notification/
  );
});
