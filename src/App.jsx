import { useState, useCallback } from 'react';
import Dialog from './components/common/Dialog.jsx';
import { templates } from './data/templates.js';
import useBoothSession from './hooks/useBoothSession.js';
import WorkflowSteps from './components/layout/WorkflowSteps.jsx';
import Footer from './components/layout/Footer.jsx';
import LandingPage from './pages/landing/LandingPage.jsx';
import TemplatesPage from './pages/templates/TemplatesPage.jsx';
import CapturePage from './pages/capture/CapturePage.jsx';
import EditorPage from './pages/editor/EditorPage.jsx';
import posthog, { posthogEnabled } from './lib/posthog.js';
import { logPosthogInfo } from './lib/posthogLogger.js';
import { navigate } from './lib/navigation.js';
import usePageSeo from './hooks/usePageSeo.js';
export default function App() {
  const session = useBoothSession();
  const [resetPending, setResetPending] = useState(false);
  const [posePrompts, setPosePrompts] = useState([]);
  function requestReset() {
    if (session.shots.length || session.editorSettings) setResetPending(true);
    else session.retake();
  }
  const {
    page,
    template,
    shots,
    completed,
    layoutChosen,
    editorSettings,
    setEditorSettings,
    setTemplateId,
    setLayoutChosen,
    retake,
  } = session;
  usePageSeo(page);
  const updateEditorSettings = useCallback(
    (values) => {
      setEditorSettings(values);
      const layout = templates.find((item) => item.id === values.layoutId);
      if (layout?.count === shots.length) setTemplateId(layout.id);
    },
    [setEditorSettings, setTemplateId, shots.length]
  );
  function selectTemplate(id) {
    const selectedTemplate = templates.find((item) => item.id === id);
    if (posthogEnabled && selectedTemplate)
      posthog.capture('template_selected', {
        template_id: selectedTemplate.id,
        photo_count: selectedTemplate.count,
      });
    setTemplateId(id);
    setEditorSettings(null);
  }
  function continueToCapture(id, prompts, style) {
    if (id !== template?.id) selectTemplate(id);
    if (prompts) setPosePrompts(prompts);
    if (style) {
      session.setMotionStyle(style === 'live' || style === 'boomerang' ? style : 'standard');
      session.setMode(style === 'live' || style === 'boomerang' ? 'live' : 'photo');
    }
    setLayoutChosen(true);
    navigate('/booth');
  }
  function continueWithUploads(id, uploadedShots) {
    selectTemplate(id);
    setPosePrompts([]);
    session.setMode('photo');
    session.setMotionStyle('standard');
    session.acceptUploadedShots(uploadedShots);
    setLayoutChosen(true);
    navigate('/edit');
  }
  let content;
  if (page === 'home')
    content = (
      <LandingPage
        onCapture={() => {
          if (posthogEnabled) posthog.capture('booth_started');
          logPosthogInfo('booth session started', { entry_point: 'landing_page' });
          navigate('/templates');
        }}
      />
    );
  else if (page === 'templates')
    content = (
      <TemplatesPage
        template={template}
        locked={shots.length > 0}
        captured={shots.length}
        onContinue={continueToCapture}
        onUpload={continueWithUploads}
        onStartOver={requestReset}
      />
    );
  else if (page === 'editor' && completed)
    content = (
      <EditorPage
        shots={shots}
        template={template}
        settings={editorSettings}
        onSettingsChange={updateEditorSettings}
        onBack={() => {
          location.hash = '/booth';
        }}
        onStartOver={requestReset}
      />
    );
  else content = <CapturePage session={{ ...session, retake: requestReset }} posePrompts={posePrompts} />;
  return (
    <div
      className={`app ${page === 'home' ? 'home-app' : page === 'booth' ? 'booth-app' : page === 'templates' ? 'templates-app' : page === 'editor' ? 'editor-app' : ''}`}
    >
      {page === 'editor' && (
        <WorkflowSteps page={page} layoutChosen={layoutChosen} completed={completed} />
      )}
      {content}
      {(page === 'home' || page === 'editor') && <Footer showHomeContent={page === 'home'} />}
      {resetPending && (
        <Dialog
          title="Start a new session?"
          onClose={() => setResetPending(false)}
          initialFocus=".keep-session"
        >
          <p>Your photos and edits will be cleared. Download anything you want to keep first.</p>
          <div className={
            'dialog-actions [&>.button]:min-h-[50px]! [&>.button]:rounded-[10px]! ' +
            '[&>.button]:[border:2px_solid_#000]! [&>.button]:[background:#fff]! ' +
            '[&>.button]:text-black! [&>.button]:px-5! [&>.button]:py-3! ' +
            '[&>.button]:font-extrabold! [&>.button]:shadow-none! ' +
            '[&>.button]:transition-[background-color,color]! [&>.button]:duration-[180ms]! ' +
            '[&>.button]:ease-[var(--ease)]! motion-reduce:[&>.button]:transition-none! ' +
            '[&>.button:is(:hover,:active):enabled]:[background:#000]! ' +
            '[&>.button:is(:hover,:active):enabled]:text-white! ' +
            '[&>.button:is(:hover,:active):enabled]:[transform:none]!'
          }>
            <button
              className="button button-outline keep-session"
              onClick={() => setResetPending(false)}
            >
              Keep my photos
            </button>
            <button
              className="button button-dark"
              onClick={() => {
                if (posthogEnabled)
                  posthog.capture('booth_session_restarted', {
                    captured_media_count: shots.length,
                    had_customizations: Boolean(editorSettings),
                  });
                setResetPending(false);
                retake();
              }}
            >
              Start over
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
