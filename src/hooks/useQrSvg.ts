import QRCodeStyling, { type Options } from 'qr-code-styling';
import { useEffect, type RefObject } from 'react';

const FADE_MS = 150;

// Draws a fresh code into the container whenever the options change. A new
// instance each time, because update() deep-merges options and so can't turn a
// gradient or logo back off. With fade on, the new drawing fades in over the
// old one, which is removed once it's covered.
export function useQrSvg(
  container: RefObject<HTMLDivElement | null>,
  options: Options | null,
  fade = false,
) {
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const previous = [...element.children];
    if (!options) {
      element.replaceChildren();
      return;
    }
    try {
      new QRCodeStyling(options).append(element);
    } catch {
      // The status checks should stop this ever happening, but a library throw
      // must leave an empty box rather than take the whole page down.
      element.replaceChildren();
      return;
    }
    const added = element.lastElementChild;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!fade || still || previous.length === 0 || !added) {
      previous.forEach((node) => node.remove());
      return;
    }
    const removeOld = () => previous.forEach((node) => node.remove());
    added
      .animate([{ opacity: 0 }, { opacity: 1 }], { duration: FADE_MS, easing: 'ease-out' })
      .finished.then(removeOld, removeOld);
  }, [container, options, fade]);
}
