import { layoutSize, pairLayout } from '../../lib/collage.js';
import TemplateMini from '../common/TemplateMini.jsx';
export default function TemplateChoice({ item, selected, locked, onSelect, diagram }) {
  const { width, height } = layoutSize(diagram === 'paired' ? pairLayout(item) : item);
  return (
    <button
      className={'template-choice ' + (selected ? 'selected' : '')}
      aria-pressed={selected}
      disabled={locked}
      onClick={() => onSelect(item.id)}
    >
      <span className="choice-preview" style={{ '--layout-aspect': width / height }}>
        <TemplateMini template={item} diagram={diagram} />
      </span>
      <span className="choice-copy">
        <strong>{item.name}</strong>
      </span>
    </button>
  );
}
