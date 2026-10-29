import { useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import FactoryScene from '../FactoryScene';

gsap.registerPlugin(useGSAP);

const MOTION_OK = '(prefers-reduced-motion: no-preference)';
const WIDE = '(min-width: 769px)';
const NO_COVER = { left: 0, top: 0 };

// The factory scene fills the page; the slogan floats over it in a card. In the
// overview the scene keeps the model clear of the card; while a building is focused
// the card hides and the whole scene is used.
function HomePage() {
  const [focusedId, setFocusedId] = useState(null);
  const focused = focusedId !== null;
  const [cover, setCover] = useState(NO_COVER);
  const pageRef = useRef(null);
  const cardRef = useRef(null);
  // Last state the fade bridged from; StrictMode re-runs effects with no change.
  const shownFocused = useRef(focused);

  // Only the card fades; CSS owns its resting shown and hidden states.
  useGSAP(
    () => {
      if (shownFocused.current === focused) return;
      shownFocused.current = focused;
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap.fromTo(
          cardRef.current,
          { autoAlpha: focused ? 1 : 0 },
          { autoAlpha: focused ? 0 : 1, duration: 0.4, ease: 'power2.out', clearProps: 'opacity,visibility' }
        );
      });
      return () => mm.revert();
    },
    { dependencies: [focused] }
  );

  // On wide screens the card covers a left band the model is kept clear of; on
  // narrow ones it simply floats over the scene.
  useLayoutEffect(() => {
    const measure = () => {
      const page = pageRef.current.getBoundingClientRect();
      const card = cardRef.current.getBoundingClientRect();
      const next = window.matchMedia(WIDE).matches
        ? { left: Math.round(card.right - page.left), top: 0 }
        : NO_COVER;
      setCover((prev) => (prev.left === next.left && prev.top === next.top ? prev : next));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  return (
    <div ref={pageRef} className={`HomePage${focused ? ' is-focused' : ''}`}>
      <div className="HomePage-scene">
        <FactoryScene onFocusChange={setFocusedId} coveredArea={focused ? NO_COVER : cover} />
      </div>
      <section ref={cardRef} className="HomePage-card" aria-hidden={focused || undefined}>
        <h1 className="HomePage-slogan">以 AI 驅動虛擬電廠引領臺灣能源轉型</h1>
      </section>
    </div>
  );
}

export default HomePage;
