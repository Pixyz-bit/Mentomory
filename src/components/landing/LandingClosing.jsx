import SamplePhoto from './SamplePhoto.jsx';
import './LandingClosing.css';

export default function LandingClosing({ onCapture }) {
  return (
    <section
      className="landing-closing bg-transparent text-[var(--ink)] py-[clamp(24px,3vw,40px)] pl-[max(var(--safe-left,32px),calc((100%-1200px)/2))] pr-[max(var(--safe-right,32px),calc((100%-1200px)/2))]"
      aria-labelledby="landing-closing-title"
    >
      <div className="landing-closing-inner mx-auto grid w-[min(1000px,100%)] grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] items-center gap-[clamp(32px,6vw,80px)] [@media(max-width:700px)]:max-w-[440px] [@media(max-width:700px)]:grid-cols-1 [@media(max-width:700px)]:gap-[24px]">
        <figure
          className="landing-closing-keepsakes m-0 min-w-0"
          aria-label="Sample photo strip and print"
        >
          <div
            className="landing-closing-prints grid min-h-[252px] grid-cols-[minmax(0,86px)_minmax(0,144px)] items-center justify-center gap-[20px] [@media(max-width:700px)]:min-h-[212px] [@media(max-width:700px)]:grid-cols-[minmax(0,76px)_minmax(0,116px)]"
            aria-hidden="true"
          >
            <div className="landing-closing-strip grid min-w-0 gap-[5px] [transform:rotate(-7deg)] [border:2px_solid_var(--ink)] bg-[var(--paper)] p-[6px] text-[var(--ink)] [@media(max-width:700px)]:p-[4px] [&_.sample-photo]:aspect-[1.2]">
              {[1, 2, 3].map((pose) => (
                <SamplePhoto key={pose} pose={pose} />
              ))}
              <span className="pt-[6px] pb-[3px] text-center text-[11px] leading-[1.5] [font-weight:700]">
                mentomory
              </span>
            </div>
            <div className="landing-closing-print mt-[16px] grid min-w-0 gap-[12px] [transform:rotate(8deg)] [border:2px_solid_var(--ink)] bg-[var(--paper)] [padding:8px_8px_16px] text-[var(--ink)] [&_.sample-photo]:aspect-square">
              <SamplePhoto pose={0} />
              <span className="text-center text-[12px] leading-[1.5] [font-weight:700]">
                Your keepsake
              </span>
            </div>
          </div>
          <figcaption className="mt-[8px] text-center text-[11px] leading-[1.5] text-[var(--muted)]">
            Illustrative sample captures
          </figcaption>
        </figure>
        <div className="landing-closing-copy min-w-0 [container-type:inline-size] [@media(max-width:700px)]:text-center">
          <h2
            className="m-[0_0_12px] max-w-none whitespace-nowrap text-[clamp(20px,8cqi,44px)] leading-[1.15] tracking-[-0.035em] [font-weight:800]"
            id="landing-closing-title"
          >
            Ready to make a memory?
          </h2>
          <p className="m-[0_0_20px] max-w-[30ch] text-[16px] leading-[1.6] text-[var(--muted)] [@media(max-width:700px)]:mx-auto [@media(max-width:700px)]:max-w-[28ch]">
            Turn a little moment into something to keep.
          </p>
          <button
            className="button button-dark landing-capture landing-closing-action"
            type="button"
            onClick={() => onCapture('strip-four')}
          >
            <span>Capture the moment</span>
            <svg
              className="h-[22px] w-[22px] [flex:0_0_22px] [stroke:currentColor] [stroke-width:1.75] [stroke-linecap:round] [stroke-linejoin:round]"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M4 12h16m-6-6 6 6-6 6" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}
