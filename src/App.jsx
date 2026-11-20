import { useCallback, useEffect, useState } from 'react';
import { templates } from './data/templates.js';
import useBoothSession from './hooks/useBoothSession.js';
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
  const {
    page,
    template,
    shots,
    completed,
    editorSettings,
    setEditorSettings,
    setTemplateId,
    setLayoutChosen,
    posePrompts,
    setPosePrompts,
  } = session;
  const [showHomeIntro, setShowHomeIntro] = useState(() => page === 'home');
  useEffect(() => {
    if (page !== 'home') setShowHomeIntro(false);
  }, [page]);
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
        showIntro={showHomeIntro}
        onCapture={() => {
          if (posthogEnabled) posthog.capture('booth_started');
          logPosthogInfo('booth session started', { entry_point: 'landing_page' });
          navigate('/templates');
        }}
      />
    );
  else if (page === 'templates')
    content = <TemplatesPage onContinue={continueToCapture} onUpload={continueWithUploads} />;
  else if (page === 'editor' && completed)
    content = (
      <EditorPage
        shots={shots}
        posePrompts={posePrompts}
        template={template}
        settings={editorSettings}
        onSettingsChange={updateEditorSettings}
        onBack={() => {
          location.hash = '/booth';
        }}
      />
    );
  else content = <CapturePage session={session} posePrompts={posePrompts} />;
  return (
    <div
      className={`app ${page === 'home' ? 'home-app' : page === 'booth' ? 'booth-app' : page === 'templates' ? 'templates-app' : page === 'editor' ? 'editor-app' : ''}`}
    >
      {content}
      {page === 'home' && <Footer showHomeContent />}
    </div>
  );
}
