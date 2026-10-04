import { useEffect, useState } from 'react';
import { ThemeToggle } from './ThemeToggle';

const TAGLINE = 'QR codes that scan.';
const GLYPHS = '#%&*+=/<>?$@0123456789ABCDEFXZ';
const DECODE_MS = 600;

// A QR finder pattern drawn as 7×7 modules: the outer ring and the 3×3 centre.
const MODULES: { x: number; y: number }[] = [];
for (let y = 0; y < 7; y++) {
  for (let x = 0; x < 7; x++) {
    const ring = x === 0 || y === 0 || x === 6 || y === 6;
    const centre = x >= 2 && x <= 4 && y >= 2 && y <= 4;
    if (ring || centre) MODULES.push({ x, y });
  }
}

function LogoMark() {
  return (
    <svg
      className="mark"
      viewBox="-1 -1 9 9"
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
    >
      {MODULES.map(({ x, y }) => (
        <rect
          key={`${x}-${y}`}
          className="mark-module"
          x={x}
          y={y}
          width="1"
          height="1"
          // Modules pop in along the diagonal, top-left first.
          style={{ animationDelay: `${(x + y) * 35}ms` }}
        />
      ))}
      <rect className="mark-scan" x="-1" y="-1" width="9" height="0.6" />
    </svg>
  );
}

function scramble(progress: number): string {
  return [...TAGLINE]
    .map((char, i) => {
      if (char === ' ' || progress >= (i + 1) / TAGLINE.length) return char;
      return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
    })
    .join('');
}

// The tagline flickers through random glyphs and settles left to right, once.
// Mono type keeps every glyph the same width, so nothing around it moves.
function DecodingText() {
  const [still] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [text, setText] = useState(() => (still ? TAGLINE : scramble(0)));

  useEffect(() => {
    if (still) return;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = (now - start) / DECODE_MS;
      setText(progress >= 1 ? TAGLINE : scramble(progress));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [still]);

  return (
    <p className="tagline">
      <span className="visually-hidden">{TAGLINE}</span>
      <span aria-hidden="true">{text}</span>
    </p>
  );
}

export function Masthead() {
  return (
    <header className="masthead">
      <div className="brand">
        <LogoMark />
        <div>
          <h1 className="title">Quiet Zone</h1>
          <DecodingText />
        </div>
      </div>
      <ThemeToggle />
    </header>
  );
}
