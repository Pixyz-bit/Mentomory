import './LandingClosing.css';

const printColumns = [
  [2, 3, 6, 4, 1],
  [4, 1, 6, 2, 3],
  [6, 5, 4, 1, 2],
  [1, 4, 2, 6, 5],
  [5, 6, 3, 1, 4],
  [3, 2, 5, 4, 6],
  [6, 4, 1, 3, 2],
  [2, 5, 6, 3, 4],
];

export default function LandingClosing({ onCapture }) {
  return (
    <section className="landing-closing" aria-labelledby="landing-closing-title">
      <div className="landing-closing-panel">
        <div className="landing-closing-collage" aria-hidden="true">
          {printColumns.map((column, index) => (
            <div className="landing-closing-print-column" key={index}>
              {column.map((print) => (
                <img
                  key={print}
                  src={`${import.meta.env.BASE_URL}closing-prints/print-${print}.webp`}
                  alt=""
                  loading="lazy"
                  decoding="async"
                />
              ))}
            </div>
          ))}
        </div>
        <div className="landing-closing-copy">
          <h2 id="landing-closing-title">Ready to make a memory?</h2>
          <p>Turn a little moment into a photo strip you can keep and share.</p>
          <button
            className="button button-dark landing-capture landing-closing-action"
            type="button"
            onClick={() => onCapture('strip-four')}
          >
            <span>Capture the moment</span>
            <svg
              className="size-[22px] shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M4 12h16m-6-6 6 6-6 6" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}
