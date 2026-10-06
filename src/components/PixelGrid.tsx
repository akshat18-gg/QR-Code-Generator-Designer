import { useEffect, useRef, useState, type RefObject } from 'react';
import { CELL, PixelField, sprinkled, type Box } from '../lib/pixelField';

interface PixelGridProps {
  // The element the grid covers and listens to.
  area: RefObject<HTMLElement | null>;
  // Text to keep readable: lit cells behind it stay soft.
  text: RefObject<HTMLElement | null>;
  // Where the load ripple starts.
  origin: RefObject<Element | null>;
}

const COLOUR_VARS = ['--g-blue', '--g-red', '--g-yellow', '--g-green'];
const LOAD_REACH = 420;
const TAP_REACH = 260;
const STILL_ALPHA = 0.45;

interface Palette {
  rest: string;
  lit: number;
  colours: string[];
}

function readPalette(element: Element): Palette {
  const css = getComputedStyle(element);
  return {
    rest: css.getPropertyValue('--pixel-rest').trim(),
    lit: Number.parseFloat(css.getPropertyValue('--pixel-lit')) || 0.6,
    colours: COLOUR_VARS.map((name) => css.getPropertyValue(name).trim()),
  };
}

function useReducedMotion(): boolean {
  const [still, setStill] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setStill(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);
  return still;
}

// The resting grid never changes between frames, so it's drawn once into its
// own canvas and copied in. With reduced motion it also carries the sprinkle.
function renderRest(
  target: HTMLCanvasElement,
  field: PixelField,
  palette: Palette,
  dpr: number,
  still: boolean,
) {
  const layer = document.createElement('canvas');
  layer.width = target.width;
  layer.height = target.height;
  const ctx = layer.getContext('2d');
  if (!ctx) return layer;
  ctx.scale(dpr, dpr);
  ctx.fillStyle = palette.rest;
  ctx.beginPath();
  for (let r = 0; r < field.rows; r++) {
    for (let c = 0; c < field.cols; c++) ctx.rect(field.cellX(c), field.cellY(r), CELL, CELL);
  }
  ctx.fill();
  if (still) {
    for (let r = 0; r < field.rows; r++) {
      for (let c = 0; c < field.cols; c++) {
        if (!sprinkled(field.i0 + c, field.j0 + r)) continue;
        const k = r * field.cols + c;
        ctx.globalAlpha = palette.lit * STILL_ALPHA * (field.weight[k] ?? 0);
        ctx.fillStyle = palette.colours[field.colour[k] ?? 0] ?? palette.rest;
        ctx.fillRect(field.cellX(c), field.cellY(r), CELL, CELL);
      }
    }
  }
  return layer;
}

// A grid of faint squares behind the header. Squares near the pointer light up
// in the four colours and fade back; a tap on a touch screen sends out a
// ripple, and one ripple runs from the logo on load. It's all one canvas, and
// the animation loop only runs while something is lit.
export function PixelGrid({ area, text, origin }: PixelGridProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const still = useReducedMotion();

  useEffect(() => {
    const canvas = ref.current;
    const header = area.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !header || !ctx) return;

    let palette = readPalette(canvas);
    let field: PixelField | null = null;
    let rest: HTMLCanvasElement | null = null;
    let dpr = 1;
    let frame = 0;
    let last = 0;
    let onScreen = true;
    let pointer: { x: number; y: number } | null = null;
    canvas.dataset.mode = still ? 'static' : 'interactive';
    canvas.dataset.animating = 'false';

    function draw() {
      if (!canvas || !ctx || !field) return;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (rest) ctx.drawImage(rest, 0, 0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const { level, weight, colour, cols } = field;
      for (let k = 0; k < level.length; k++) {
        const value = level[k] ?? 0;
        if (value <= 0) continue;
        ctx.globalAlpha = value * (weight[k] ?? 0) * palette.lit;
        ctx.fillStyle = palette.colours[colour[k] ?? 0] ?? palette.rest;
        ctx.fillRect(field.cellX(k % cols), field.cellY(Math.floor(k / cols)), CELL, CELL);
      }
      ctx.globalAlpha = 1;
    }

    function layout(): PixelField | null {
      if (!canvas || !header) return null;
      const box = header.getBoundingClientRect();
      const words = text.current?.getBoundingClientRect();
      const textBox: Box | null = words
        ? {
            left: words.left - box.left,
            top: words.top - box.top,
            right: words.right - box.left,
            bottom: words.bottom - box.top,
          }
        : null;
      dpr = Math.min(window.devicePixelRatio || 1, 3);
      canvas.width = Math.round(box.width * dpr);
      canvas.height = Math.round(box.height * dpr);
      const next = new PixelField(
        box.width,
        box.height,
        box.left + window.scrollX,
        box.top + window.scrollY,
        textBox,
      );
      if (field) next.takeRipples(field);
      field = next;
      rest = renderRest(canvas, field, palette, dpr, still);
      draw();
      return field;
    }

    function tick(now: number) {
      if (!field) return;
      const dt = Math.min(now - last, 50);
      last = now;
      const active = field.step(now, dt);
      draw();
      if (active) {
        frame = requestAnimationFrame(tick);
      } else {
        frame = 0;
        if (canvas) canvas.dataset.animating = 'false';
      }
    }

    function start() {
      if (frame || !onScreen || document.hidden || !canvas) return;
      canvas.dataset.animating = 'true';
      last = performance.now();
      frame = requestAnimationFrame(tick);
    }

    function stop() {
      cancelAnimationFrame(frame);
      frame = 0;
      if (canvas) canvas.dataset.animating = 'false';
    }

    function local(event: PointerEvent) {
      const box = canvas?.getBoundingClientRect();
      return { x: event.clientX - (box?.left ?? 0), y: event.clientY - (box?.top ?? 0) };
    }

    function onMove(event: PointerEvent) {
      if (event.pointerType === 'touch' || !field) return;
      const point = local(event);
      field.stroke(pointer ?? point, point);
      pointer = point;
      start();
    }

    function onLeave() {
      pointer = null;
    }

    function onDown(event: PointerEvent) {
      if (event.pointerType !== 'touch' || !field) return;
      const point = local(event);
      field.ripple(point.x, point.y, performance.now(), TAP_REACH);
      start();
    }

    function onVisibility() {
      if (document.hidden) stop();
      else if (field?.active) start();
    }

    const first = layout();

    const resize = new ResizeObserver(layout);
    resize.observe(header);
    if (text.current) resize.observe(text.current);

    const theme = new MutationObserver(() => {
      palette = readPalette(canvas);
      if (field) rest = renderRest(canvas, field, palette, dpr, still);
      draw();
    });
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    if (still) {
      return () => {
        resize.disconnect();
        theme.disconnect();
      };
    }

    const seen = new IntersectionObserver(([entry]) => {
      onScreen = entry?.isIntersecting ?? true;
      if (!onScreen) stop();
      else if (field?.active) start();
    });
    seen.observe(header);

    header.addEventListener('pointermove', onMove, { passive: true });
    header.addEventListener('pointerleave', onLeave, { passive: true });
    header.addEventListener('pointerdown', onDown, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);

    const mark = origin.current?.getBoundingClientRect();
    const box = header.getBoundingClientRect();
    if (mark && first) {
      first.ripple(
        mark.left + mark.width / 2 - box.left,
        mark.top + mark.height / 2 - box.top,
        performance.now(),
        LOAD_REACH,
      );
      start();
    }

    return () => {
      stop();
      resize.disconnect();
      theme.disconnect();
      seen.disconnect();
      header.removeEventListener('pointermove', onMove);
      header.removeEventListener('pointerleave', onLeave);
      header.removeEventListener('pointerdown', onDown);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [still, area, text, origin]);

  return <canvas ref={ref} className="pixel-grid" aria-hidden="true" />;
}
