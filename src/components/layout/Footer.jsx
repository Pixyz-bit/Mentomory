import Brand from '../common/Brand.jsx';
import SocialLinks from './SocialLinks.jsx';

export default function Footer({ showHomeContent = false }) {
  return (
    <footer className="landing-footer block w-full max-w-none shrink-0 m-0 p-0 border-0 text-xs leading-[1.6] [--footer-gutter:16px] [@media(min-width:601px)]:[--footer-gutter:32px] [--footer-left:max(var(--footer-gutter),env(safe-area-inset-left,0px))] [--footer-right:max(var(--footer-gutter),env(safe-area-inset-right,0px))] [.templates-app_&]:mt-8 [.editor-app_&]:mt-8 [.booth-app_&]:mt-3">
      {showHomeContent && (
        <div className="border-t border-solid border-[#e5e5e5] bg-white text-black [&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-offset-4 [&_a:focus-visible]:outline-black">
          <div className="mx-auto grid min-h-[88px] w-[min(1200px,calc(100%_-_var(--footer-left)_-_var(--footer-right)))] box-border grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-6 py-4 [&_.wordmark]:w-fit! [&_.wordmark]:max-w-full [&_.brand-logo]:block [&_.brand-logo]:h-auto! [&_.brand-logo]:w-40! [&_.brand-logo]:max-w-full [@media(max-width:1000px)]:grid-cols-[1fr_auto] [@media(max-width:1000px)]:gap-y-2 [@media(max-width:600px)]:grid-cols-1 [@media(max-width:600px)]:justify-items-center [@media(max-width:600px)]:gap-1.5 [@media(max-width:600px)]:[&_.brand-logo]:w-36!">
            <Brand />
            <nav className="flex min-w-0 flex-wrap justify-center gap-x-6 [&>span]:inline-flex [&>span]:min-h-11 [&>span]:items-center [&>span]:text-sm [@media(max-width:1000px)]:col-span-full [@media(max-width:1000px)]:row-start-2 [@media(max-width:600px)]:col-auto [@media(max-width:600px)]:row-auto [@media(max-width:600px)]:gap-x-4 [@media(max-width:600px)]:[&>span]:text-[13px]" aria-label="Policies">
              <span aria-disabled="true" title="Link coming soon">
                Terms of use
              </span>
              <span aria-disabled="true" title="Link coming soon">
                Privacy policy
              </span>
              <span aria-disabled="true" title="Link coming soon">
                Cookies
              </span>
            </nav>
            <SocialLinks />
          </div>
        </div>
      )}
      <div className="w-full bg-black text-white">
        <div className="mx-auto flex min-h-[43.2px] w-[min(1216px,calc(100%_-_var(--footer-left)_-_var(--footer-right)))] flex-wrap items-center justify-between gap-x-4 gap-y-1 pb-[env(safe-area-inset-bottom,0px)] [@media(max-width:600px)]:justify-center [@media(max-width:600px)]:gap-x-5 [@media(max-width:600px)]:pt-2 [@media(max-width:600px)]:pb-[max(8px,env(safe-area-inset-bottom,0px))] [@media(max-width:600px)]:text-center">
          <span>© {new Date().getFullYear()} Mentomory</span>
          <span>
            Made by <strong>.dcd</strong>
          </span>
        </div>
      </div>
    </footer>
  );
}
