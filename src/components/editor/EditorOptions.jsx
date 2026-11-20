import { useId, useState } from 'react';
import Icon from '../common/Icon.jsx';
import LayoutOptions from './LayoutOptions.jsx';
import FilterOptions from './FilterOptions.jsx';
import DecorationOptions from './DecorationOptions.jsx';
import CaptionControl from './CaptionControl.jsx';
import EditorError from './EditorError.jsx';
import FrameOptions from './FrameOptions.jsx';
const tools = [
  { id: 'frames', label: 'Frames', icon: 'photo', Component: FrameOptions },
  { id: 'filters', label: 'Filters', icon: 'effects', Component: FilterOptions },
  { id: 'text', label: 'Text', icon: 'text', Component: CaptionControl },
  { id: 'stickers', label: 'Stickers', icon: 'sticker', Component: DecorationOptions },
  { id: 'layout', label: 'Layout', icon: 'layout', Component: LayoutOptions },
];
export default function EditorOptions(props) {
  const [{ index: activeIndex, direction }, setTab] = useState({ index: 0, direction: 0 });
  const active = tools[activeIndex].id;
  const id = useId();

  function selectTab(index) {
    setTab((previous) =>
      index === previous.index ? previous : { index, direction: Math.sign(index - previous.index) }
    );
  }
  function navigate(event, index) {
    let target;
    if (event.key === 'ArrowRight') target = (index + 1) % tools.length;
    else if (event.key === 'ArrowLeft') target = (index + tools.length - 1) % tools.length;
    else if (event.key === 'Home') target = 0;
    else if (event.key === 'End') target = tools.length - 1;
    else return;
    event.preventDefault();
    selectTab(target);
    event.currentTarget.parentElement.children[target].focus();
  }
  return (
    <div
      className="editor-options"
      style={{ '--tab-index': activeIndex, '--tab-direction': direction }}
    >
      <div className="editor-tabs" role="tablist" aria-label="Customization tools">
        {tools.map((tool, index) => (
          <button
            key={tool.id}
            id={id + '-tab-' + tool.id}
            role="tab"
            aria-selected={active === tool.id}
            aria-controls={id + '-panel-' + tool.id}
            tabIndex={active === tool.id ? 0 : -1}
            onClick={() => selectTab(index)}
            onKeyDown={(event) => navigate(event, index)}
          >
            <Icon name={tool.icon} size={16} />
            {tool.label}
          </button>
        ))}
      </div>
      {tools.map(({ id: toolId, label, Component }) => (
        <section
          className="editor-tool-panel"
          key={toolId}
          id={id + '-panel-' + toolId}
          role="tabpanel"
          tabIndex={0}
          aria-labelledby={id + '-tab-' + toolId}
          hidden={active !== toolId}
          data-entering={(active === toolId && direction !== 0) || undefined}
        >
          <h2 className="sr-only">{label}</h2>
          {active === toolId && <Component {...props} />}{' '}
          {active === toolId && toolId === 'layout' && props.available.length === 0 && (
            <p>No current layouts are available for this photo count.</p>
          )}
        </section>
      ))}
      <EditorError {...props} />
    </div>
  );
}
