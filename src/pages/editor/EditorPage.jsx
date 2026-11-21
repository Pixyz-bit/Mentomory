import useStripEditor from '../../hooks/useStripEditor.js';
import EditorIntro from '../../components/editor/EditorIntro.jsx';
import EditorPreview from '../../components/editor/EditorPreview.jsx';
import EditorControls from '../../components/editor/EditorControls.jsx';
export default function EditorPage({
  shots,
  posePrompts,
  template,
  settings,
  onSettingsChange,
  onBack,
}) {
  const editor = useStripEditor({
    shots,
    posePrompts,
    template,
    settings,
    onSettingsChange,
  });
  return (
    <main className="editor-main">
      <EditorIntro heading={editor.heading} />
      <div className="editor-layout">
        <div className="editor-artifact">
          <EditorPreview {...editor} shots={shots} />
        </div>
        <EditorControls {...editor} onBack={onBack} />
      </div>
    </main>
  );
}
