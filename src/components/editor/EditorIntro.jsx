import Brand from '../common/Brand.jsx';

export default function EditorIntro({ heading }) {
  return (
    <header className="editor-brand-header">
      <Brand />
      <h1 ref={heading} tabIndex="-1" className="sr-only focus:[outline:none]">
        Customize your photos
      </h1>
    </header>
  );
}
