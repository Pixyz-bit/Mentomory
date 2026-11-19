import { useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

gsap.registerPlugin(useGSAP);

export default function BrandIntro() {
  const intro = useRef(null);
  const [done, setDone] = useState(false);
  const assets = import.meta.env.BASE_URL;

  useGSAP(() => {
    const motion = gsap.matchMedia();
    motion.add('(prefers-reduced-motion: no-preference)', () => {
      const sequence = gsap.timeline({ onComplete: () => setDone(true) });
      sequence
        .set(intro.current, { autoAlpha: 1 })
        .fromTo('.brand-intro-camera', { xPercent: 102.28, scale: 0.9, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.24, ease: 'power2.out' })
        .to('.brand-intro-button', { yPercent: 3, duration: 0.16, ease: 'power2.inOut' }, 0.48)
        .to('.brand-intro-flash', { opacity: 1, duration: 0.05, ease: 'power2.in' }, 0.59)
        .to('.brand-intro-flash', { opacity: 0, duration: 0.28, ease: 'power2.out' }, 0.64)
        .to('.brand-intro-click-lines', { opacity: 1, duration: 0.17 }, 0.58)
        .to('.brand-intro-camera', { yPercent: 3, scale: 0.98, duration: 0.13, ease: 'power2.out' }, 0.61)
        .addLabel('release', 0.86)
        .to('.brand-intro-button', { yPercent: 0, duration: 0.30, ease: 'power2.out' }, 'release')
        .to('.brand-intro-camera', { yPercent: 0, scale: 1, duration: 0.36, ease: 'back.out(1.5)' }, 'release')
        .to('.brand-intro-stars', {
          keyframes: {
            opacity: [0, 1, 0.45, 1],
            scale: [0.5, 1.12, 0.94, 1],
            easeEach: 'sine.inOut',
          },
          duration: 0.36,
          stagger: 0.13,
        }, 'release+=0.16')
        .to('.brand-intro-camera', { x: 4, duration: 0.17, ease: 'sine.inOut' }, '+=0.24')
        .to('.brand-intro-camera', { x: 0, xPercent: 0, duration: 0.72, ease: 'power3.inOut' })
        .fromTo('.brand-intro-wordmark img', { yPercent: 100 }, { yPercent: 0, duration: 0.68, ease: 'power3.out' }, '<0.34')
        .to(intro.current, { clipPath: 'inset(0 0 100% 0)', duration: 0.56, ease: 'power3.inOut' }, '+=0.48');
    });
    return () => motion.revert();
  }, { scope: intro });

  if (done) return null;

  return (
    <div ref={intro} className="pointer-events-none invisible fixed inset-0 z-20 grid place-items-center bg-[#f5f5f5] [clip-path:inset(0)] [&_img]:block [&_img]:h-auto [&_img]:w-full" aria-hidden="true">
      <div className="brand-intro-flash absolute inset-0 z-[2] bg-white opacity-0" />
      {/* Keep the split between the camera and the wordmark aligned with the 1200px artwork. */}
      <div className="relative grid aspect-[1200/320] w-[min(76vw,480px)] grid-cols-[32.8333%_1fr]">
        <div className="brand-intro-camera relative z-[1] [&_img]:absolute [&_img]:inset-0">
          <div className="overflow-hidden">
            <img className="brand-intro-button" src={`${assets}mentomory-intro-shutter.png`} alt="" />
            <img className="brand-intro-body" src={`${assets}mentomory-intro-camera.png`} alt="" />
            <img className="brand-intro-click-lines opacity-0" src={`${assets}mentomory-intro-click-lines.png`} alt="" />
            <img className="brand-intro-stars opacity-0 origin-[84%_26%] [clip-path:polygon(0_0,100%_0,100%_19%,34.3%_100%,0_100%)]" src={`${assets}mentomory-intro-stars.png`} alt="" />
            <img className="brand-intro-stars opacity-0 origin-[94%_38%] [clip-path:polygon(100%_19%,100%_100%,34.3%_100%)]" src={`${assets}mentomory-intro-stars.png`} alt="" />
          </div>
        </div>
        <div className="brand-intro-wordmark overflow-hidden">
          <img src={`${assets}mentomory-intro-wordmark.png`} alt="" />
        </div>
      </div>
    </div>
  );
}
