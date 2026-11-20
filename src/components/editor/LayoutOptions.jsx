import TemplateCatalog from '../templates/TemplateCatalog.jsx';

export default function LayoutOptions({ available, layoutId, exporting, setLayoutId, diagram }) {
  if (available.length === 0) return null;

  return (
    <div className="layout-picker-options">
      <TemplateCatalog
        layouts={available}
        showFilters={false}
        diagram={diagram}
        template={{ id: layoutId }}
        locked={exporting}
        onSelect={setLayoutId}
      />
    </div>
  );
}
