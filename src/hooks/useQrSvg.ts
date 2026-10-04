import QRCodeStyling, { type Options } from 'qr-code-styling';
import { useEffect, type RefObject } from 'react';

// Draws a fresh code into the container whenever the options change. A new
// instance each time, because update() deep-merges options and so can't turn a
// gradient or logo back off.
export function useQrSvg(container: RefObject<HTMLDivElement | null>, options: Options | null) {
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    element.replaceChildren();
    if (!options) return;
    try {
      new QRCodeStyling(options).append(element);
    } catch {
      // The status checks should stop this ever happening, but a library throw
      // must leave an empty box rather than take the whole page down.
      element.replaceChildren();
    }
  }, [container, options]);
}
