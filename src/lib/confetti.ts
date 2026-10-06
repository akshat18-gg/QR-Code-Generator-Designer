// A small burst of coloured squares from a button, after a download or copy
// works. One overlay per burst, removed when it ends; only transform and
// opacity animate, and the overlay never takes clicks or focus.

const COLOUR_VARS = ['--g-blue', '--g-red', '--g-yellow', '--g-green'];
const PIECES = 24;
const DURATION = 700;
const FRAMES = 10;
const GRAVITY = 0.0016; // px per ms²
// Clicking again while bursts are still running adds at most one more.
const MAX_BURSTS = 2;

let running = 0;

export function burst(from: Element): void {
  if (running >= MAX_BURSTS) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const box = from.getBoundingClientRect();
  const css = getComputedStyle(document.documentElement);
  const colours = COLOUR_VARS.map((name) => css.getPropertyValue(name).trim());
  const alpha = Number.parseFloat(css.getPropertyValue('--confetti')) || 1;

  const layer = document.createElement('div');
  layer.className = 'confetti';
  layer.setAttribute('aria-hidden', 'true');
  const pieces = Array.from({ length: PIECES }, (_, i) => {
    const piece = document.createElement('span');
    const size = 5 + Math.random() * 4;
    piece.style.left = `${box.left + box.width * (0.15 + Math.random() * 0.7)}px`;
    piece.style.top = `${box.top + box.height * 0.4}px`;
    piece.style.width = `${size}px`;
    piece.style.height = `${size}px`;
    piece.style.background = colours[i % colours.length] ?? 'currentColor';
    return piece;
  });
  layer.append(...pieces);
  document.body.append(layer);
  running++;

  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    layer.remove();
    running--;
  };

  const animations = pieces.map((piece) => {
    const vx = (Math.random() - 0.5) * 0.5; // px per ms
    const vy = -(0.3 + Math.random() * 0.3);
    const spin = (Math.random() - 0.5) * 540; // degrees over the whole burst
    const frames: Keyframe[] = Array.from({ length: FRAMES + 1 }, (_, f) => {
      const p = f / FRAMES;
      const t = p * DURATION;
      const x = vx * t;
      const y = vy * t + 0.5 * GRAVITY * t * t;
      const scale = Math.min(1, 0.4 + p * 4);
      return {
        transform: `translate(${x}px, ${y}px) rotate(${spin * p}deg) scale(${scale})`,
        opacity: p < 0.55 ? alpha : alpha * (1 - (p - 0.55) / 0.45),
      };
    });
    return piece.animate(frames, { duration: DURATION, easing: 'linear' });
  });
  Promise.all(animations.map((animation) => animation.finished)).then(finish, finish);
  // In a background tab animations can stall, so don't rely on them to clean up.
  window.setTimeout(finish, DURATION + 500);
}
