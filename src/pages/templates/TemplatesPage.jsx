import { useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import TemplateCatalog from '../../components/templates/TemplateCatalog.jsx';
import Icon from '../../components/common/Icon.jsx';
import Brand from '../../components/common/Brand.jsx';
import Dialog from '../../components/common/Dialog.jsx';
import TemplateMini from '../../components/common/TemplateMini.jsx';
import { pickerLayouts, templates } from '../../data/templates.js';
import { memePoses, poseImage } from '../../data/memePoses.js';
import { frameRects, layoutSize } from '../../lib/collage.js';

gsap.registerPlugin(useGSAP);

const motionOptions = [
  {
    id: 'boomerang',
    title: 'Boomerang',
    description: 'Loop a quick burst.',
  },
  {
    id: 'upload',
    title: 'Upload photos',
    description: 'Use your own photos.',
  },
];

const defaultLayout = pickerLayouts[0];
const pickerTabs = [
  { id: 'style', label: 'Photo style', icon: 'photo' },
  { id: 'layout', label: 'Layout', icon: 'layout' },
];
const initialPrompts = (layout) =>
  Array.from({ length: layout.count }, (_, index) => memePoses[index % memePoses.length]);

export default function TemplatesPage({ template, locked, onContinue, onUpload, onStartOver }) {
  const [preview, setPreview] = useState(
    () =>
      pickerLayouts.find((item) => item.id === template?.id) ??
      (locked ? template : null) ??
      defaultLayout
  );
  const [style, setStyle] = useState('classic');
  const [activeTab, setActiveTab] = useState('style');
  const pickerPanels = useRef(null);
  const uploadInput = useRef(null);
  const [uploadError, setUploadError] = useState('');
  const [uploading, setUploading] = useState(false);
  useGSAP(
    () => {
      if (locked || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      gsap.from('[role="tabpanel"]:not([inert])', {
        opacity: 0,
        x: activeTab === 'layout' ? 24 : -24,
        duration: 0.32,
        ease: 'power2.out',
      });
    },
    { scope: pickerPanels, dependencies: [activeTab, locked], revertOnUpdate: true }
  );
  const [previewExpanded, setPreviewExpanded] = useState(false);
  const layoutTab = useRef(null);
  const choosingStyle = !locked && activeTab === 'style';
  const [prompts, setPrompts] = useState(() => initialPrompts(preview));

  const previewSize = layoutSize(preview);
  const referenceOffset = preview?.slots
    ? previewSize.width - 2 * previewSize.padding + previewSize.gap
    : 0;
  const pairedWidth = 2 * (previewSize.width - previewSize.padding) + previewSize.gap;

  function openPreview(id) {
    const layout =
      pickerLayouts.find((item) => item.id === id) ?? templates.find((item) => item.id === id);
    if (layout.id === preview.id) return;
    setPrompts(initialPrompts(layout));
    setPreview(layout);
  }

  function shufflePrompt(index) {
    const alternatives = memePoses.filter((pose) => pose !== prompts[index]);
    const next = alternatives[Math.floor(Math.random() * alternatives.length)];
    setPrompts((current) => current.map((pose, position) => (position === index ? next : pose)));
  }

  function handleTabKey(event) {
    const { key, currentTarget } = event;
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(key)) return;
    event.preventDefault();
    const next = key === 'Home' || (key !== 'End' && activeTab === 'layout') ? 'style' : 'layout';
    setActiveTab(next);
    currentTarget.querySelector('#picker-tab-' + next)?.focus();
  }

  function advancePicker() {
    if (choosingStyle) {
      setActiveTab('layout');
      layoutTab.current?.focus();
    } else if (locked) {
      onContinue(preview.id);
    } else if (style === 'upload') {
      setUploadError('');
      uploadInput.current?.click();
    } else {
      onContinue(preview.id, style === 'meme' ? prompts : [], style);
    }
  }

  async function importPhotos(event) {
    const input = event.currentTarget;
    const files = Array.from(input.files);
    input.value = '';
    if (!files.length) return;
    if (files.length !== preview.count) {
      setUploadError(`Select exactly ${preview.count} ${preview.count === 1 ? 'photo' : 'photos'} for this layout.`);
      return;
    }

    setUploading(true);
    const urls = [];
    let accepted = false;
    try {
      const shots = await Promise.all(files.map(async (file) => {
        if (!file.type.startsWith('image/')) throw new Error('Expected an image file');
        const url = URL.createObjectURL(file);
        urls.push(url);
        const image = new Image();
        image.src = url;
        await image.decode();
        return { url, width: image.naturalWidth, height: image.naturalHeight };
      }));
      if (input.isConnected) {
        onUpload(preview.id, shots);
        accepted = true;
      }
    } catch {
      if (input.isConnected) setUploadError('One or more photos couldn’t be opened. Try JPEG, PNG, or WebP.');
    } finally {
      if (!accepted) urls.forEach((url) => URL.revokeObjectURL(url));
      if (input.isConnected) setUploading(false);
    }
  }

  const previewAspect = {
    '--layout-aspect': (style === 'meme' ? pairedWidth : previewSize.width) / previewSize.height,
  };
  const print =
    style === 'meme' ? (
      <ol className="layout-pose-sheet" aria-label="Pose references">
        {frameRects(preview).map((frame, index) => {
          const pose = prompts[index];
          const x = referenceOffset ? frame.x : 2 * frame.x - previewSize.padding;
          const gap = referenceOffset ? referenceOffset - frame.width : previewSize.gap;
          const width = 2 * frame.width + gap;
          return (
            <li
              key={index}
              style={{
                left: (100 * x) / pairedWidth + '%',
                top: (100 * frame.y) / previewSize.height + '%',
                width: (100 * width) / pairedWidth + '%',
                columnGap: (100 * gap) / width + '%',
                height: (100 * frame.height) / previewSize.height + '%',
              }}
            >
              <span className="layout-pose-slot" aria-hidden="true" />
              <div className="layout-pose-reference">
                <img src={poseImage(pose)} alt="" />
                <span className="layout-pose-description" aria-live="polite">
                  Shot {index + 1}. {pose.title}. {pose.cue}
                </span>
                <button
                  type="button"
                  aria-label={'Shuffle pose for shot ' + (index + 1)}
                  title="Shuffle pose"
                  onClick={() => shufflePrompt(index)}
                >
                  <Icon name="shuffle" size={30} />
                </button>
              </div>
            </li>
          );
        })}
      </ol>
    ) : (
      <TemplateMini template={preview} />
    );

  return (
    <main className="template-main">
      <header className="intro">
        <Brand />
        <h1 className="sr-only focus:[outline:none]" tabIndex="-1">Pick a style &amp; layout.</h1>
      </header>
      <div className="layout-preview-body">
        <section
          className="layout-preview-stage"
          data-wide={preview.rows === 1 && preview.cols > 1 ? true : undefined}
          aria-label="Layout preview"
        >
          <div className="layout-preview-image" style={previewAspect}>
            <div className="layout-preview-print">
              {style !== 'meme' && preview.cols === 1 && preview.rows >= 3 && (
                <div className="layout-preview-stack" aria-hidden="true">
                  <TemplateMini template={preview} sampleOffset={1} />
                  <TemplateMini template={preview} sampleOffset={2} />
                </div>
              )}
              <button
                type="button"
                className="layout-preview-zoom"
                aria-label={'Enlarge ' + preview.name + ' preview'}
                aria-haspopup="dialog"
                title={style === 'meme' ? undefined : 'Enlarge preview'}
                onClick={() => setPreviewExpanded(true)}
              >
                {style !== 'meme' && (
                  <span className="layout-preview-eye">
                    <Icon name="eye" size={19} />
                  </span>
                )}
              </button>
              {print}
            </div>
          </div>
        </section>
        <aside className="layout-picker-options" aria-label="Layout and photo style">
          {!locked && (
            <div
              className="layout-picker-tabs"
              data-active-tab={activeTab}
              role="tablist"
              aria-label="Photo options"
              onKeyDown={handleTabKey}
            >
              {pickerTabs.map(({ id, label, icon }) => (
                <button
                  type="button"
                  key={id}
                  id={'picker-tab-' + id}
                  ref={id === 'layout' ? layoutTab : null}
                  role="tab"
                  aria-selected={activeTab === id}
                  aria-controls={'picker-panel-' + id}
                  tabIndex={activeTab === id ? 0 : -1}
                  onClick={() => setActiveTab(id)}
                >
                  <Icon name={icon} size={20} />
                  {label}
                </button>
              ))}
            </div>
          )}
          <div className="layout-picker-panels" ref={pickerPanels}>
            {!locked && (
              <section
                id="picker-panel-style"
                role="tabpanel"
                aria-labelledby="picker-tab-style"
                inert={activeTab !== 'style'}
              >
                <div className="layout-style-options">
                  <button
                    type="button"
                    aria-pressed={style === 'classic'}
                    onClick={() => setStyle('classic')}
                  >
                    <img
                      className="layout-style-image"
                      src={`${import.meta.env.BASE_URL}template-wide-original-couple.png`}
                      alt=""
                    />
                    <strong>Classic</strong>
                    <span>Pose however you like.</span>
                  </button>
                  <button
                    type="button"
                    aria-pressed={style === 'meme'}
                    onClick={() => setStyle('meme')}
                  >
                    <div className="layout-style-image layout-style-meme-grid">
                      {memePoses.slice(0, 4).map((pose) => (
                        <img key={pose.image} src={poseImage(pose)} alt="" />
                      ))}
                    </div>
                    <strong>Meme poses</strong>
                    <span>Copy a meme pose.</span>
                  </button>
                  {motionOptions.map((option) => (
                    <button
                      type="button"
                      key={option.id}
                      aria-pressed={style === option.id}
                      onClick={() => setStyle(option.id)}
                    >
                      <picture>
                        {option.id === 'boomerang' && (
                          <source
                            media="(prefers-reduced-motion: reduce)"
                            srcSet={`${import.meta.env.BASE_URL}style-previews/still.webp`}
                          />
                        )}
                        <img
                          className={`layout-style-image${option.id === 'upload' ? ' layout-style-upload-image' : ''}`}
                          src={`${import.meta.env.BASE_URL}style-previews/${option.id === 'upload' ? 'upload.jpg' : 'boomerang.gif'}`}
                          alt=""
                        />
                      </picture>
                      <strong>{option.title}</strong>
                      <span>{option.description}</span>
                    </button>
                  ))}
                </div>
              </section>
            )}
            <div
              id="picker-panel-layout"
              data-cuts={!locked || undefined}
              role={locked ? undefined : 'tabpanel'}
              aria-labelledby={locked ? undefined : 'picker-tab-layout'}
              inert={!locked && activeTab !== 'layout'}
            >
              {locked && <h2>Layout</h2>}
              <TemplateCatalog
                layouts={locked ? templates : pickerLayouts}
                showFilters={locked}
                diagram={locked ? undefined : style === 'meme' ? 'paired' : 'classic'}
                template={preview}
                locked={locked}
                onSelect={openPreview}
              />
            </div>
          </div>
          <div className="selection-actions">
            {!locked && style === 'upload' && (
              <input ref={uploadInput} type="file" accept="image/*" multiple hidden onChange={importPhotos} />
            )}
            {style === 'upload' && !choosingStyle && uploadError && <p role="alert">{uploadError}</p>}
            {locked && (
              <button type="button" className="text-button" onClick={onStartOver}>
                Start over
              </button>
            )}
            <button
              type="button"
              className="button button-dark layout-preview-confirm"
              onClick={advancePicker}
              disabled={uploading}
            >
              {locked ? 'Return to camera' : choosingStyle ? 'Next: Choose a layout' : style === 'upload' ? (uploading ? 'Opening photos…' : 'Upload photos') : 'Continue to camera'}
              {choosingStyle || (!locked && style === 'upload') ? (
                <Icon name="arrow" />
              ) : (
                <Icon name="shutter" size={24} />
              )}
            </button>
          </div>
        </aside>
      </div>
      {previewExpanded && (
        <Dialog
          className="layout-enlarged-dialog"
          title={preview.name}
          onClose={() => setPreviewExpanded(false)}
        >
          <div className="layout-preview-image" style={previewAspect}>
            <div className="layout-preview-print">{print}</div>
          </div>
        </Dialog>
      )}
    </main>
  );
}
