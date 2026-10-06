// The header's pixel grid: square cells like QR modules, each with one of the
// four colours and a brightness that fades back to rest. This file is the
// model; PixelGrid draws it on a canvas.

// Same pitch as the page's dot grid, with each cell centred on a dot.
export const PITCH = 16;
export const CELL = 12;
export const FADE_MS = 600;

const INSET = (PITCH - CELL) / 2;
const BRUSH = 30;
const RIPPLE_SPEED = 0.45; // px per ms
const RIPPLE_RING = 22;
// Behind the title and tagline lit cells keep only this much of their
// brightness, ramping back to full over FEATHER px.
export const SOFT = 0.12;
const FEATHER = 32;

export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

interface Ripple {
  x: number;
  y: number;
  start: number;
  reach: number;
}

function hash(x: number, y: number): number {
  let h = Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}

// Colour index 0–3 for the cell at page column i, row j. Cells share a colour
// in ragged patches: blocks of 3 columns by 2 rows, with every row and column
// nudged by up to a cell so the block edges don't line up.
export function colourAt(i: number, j: number): number {
  const bx = Math.floor((i + (hash(j, 7) % 2)) / 3);
  const by = Math.floor((j + (hash(i, 11) % 2)) / 2);
  return hash(bx, by) % 4;
}

// About one cell in twelve gets a fixed touch of colour in the static grid
// shown with reduced motion.
export function sprinkled(i: number, j: number): boolean {
  return hash(i, j + 101) % 12 === 0;
}

export class PixelField {
  readonly cols: number;
  readonly rows: number;
  // Canvas position of the first cell's top-left corner.
  readonly x0: number;
  readonly y0: number;
  // Page column and row of the first cell, so colours stay put on resize.
  readonly i0: number;
  readonly j0: number;
  readonly colour: Uint8Array;
  readonly level: Float32Array;
  // How bright each cell may get: a little per-cell texture, times the
  // softening behind the text.
  readonly weight: Float32Array;
  private ripples: Ripple[] = [];
  private lit = 0;

  // width and height are the canvas size; pageX and pageY are where its
  // top-left corner sits on the page; text is the area to keep readable.
  constructor(width: number, height: number, pageX: number, pageY: number, text: Box | null) {
    this.i0 = Math.floor(pageX / PITCH);
    this.j0 = Math.floor(pageY / PITCH);
    this.x0 = this.i0 * PITCH + INSET - pageX;
    this.y0 = this.j0 * PITCH + INSET - pageY;
    this.cols = Math.max(0, Math.ceil((width - this.x0) / PITCH));
    this.rows = Math.max(0, Math.ceil((height - this.y0) / PITCH));
    const count = this.cols * this.rows;
    this.colour = new Uint8Array(count);
    this.level = new Float32Array(count);
    this.weight = new Float32Array(count);
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const k = r * this.cols + c;
        this.colour[k] = colourAt(this.i0 + c, this.j0 + r);
        const texture = 0.65 + (hash(this.i0 + c, this.j0 + r + 53) % 36) / 100;
        this.weight[k] =
          texture * softening(this.cellX(c) + CELL / 2, this.cellY(r) + CELL / 2, text);
      }
    }
  }

  cellX(c: number): number {
    return this.x0 + c * PITCH;
  }

  cellY(r: number): number {
    return this.y0 + r * PITCH;
  }

  get active(): boolean {
    return this.lit > 0 || this.ripples.length > 0;
  }

  // Lights the cells around a point, brightest in the middle.
  brush(x: number, y: number): void {
    this.forCellsNear(x, y, BRUSH, (k, d) => {
      this.raise(k, 1 - (d / BRUSH) ** 2);
    });
  }

  // Brushes along a line, so a fast pointer leaves an unbroken trail.
  stroke(from: { x: number; y: number }, to: { x: number; y: number }): void {
    const steps = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / (PITCH / 2)));
    for (let s = 1; s <= steps; s++) {
      this.brush(from.x + ((to.x - from.x) * s) / steps, from.y + ((to.y - from.y) * s) / steps);
    }
  }

  ripple(x: number, y: number, now: number, reach: number): void {
    this.ripples.push({ x, y, start: now, reach });
  }

  // Ripples survive a resize; lit cells don't need to.
  takeRipples(from: PixelField): void {
    this.ripples = from.ripples;
  }

  // Fades every cell by dt, then lets running ripples light their ring.
  // Returns whether anything is still moving.
  step(now: number, dt: number): boolean {
    const fade = dt / FADE_MS;
    let lit = 0;
    for (let k = 0; k < this.level.length; k++) {
      const value = this.level[k] ?? 0;
      if (value <= 0) continue;
      const next = Math.max(0, value - fade);
      this.level[k] = next;
      if (next > 0) lit++;
    }
    this.lit = lit;
    this.ripples = this.ripples.filter((ripple) => {
      const radius = (now - ripple.start) * RIPPLE_SPEED;
      if (radius < 0) return true;
      if (radius - RIPPLE_RING > ripple.reach) return false;
      const strength = Math.max(0, 1 - radius / ripple.reach);
      this.forCellsNear(ripple.x, ripple.y, radius, (k, d) => {
        const inRing = radius - d;
        if (inRing >= 0 && inRing <= RIPPLE_RING)
          this.raise(k, strength * (1 - inRing / RIPPLE_RING));
      });
      return true;
    });
    return this.active;
  }

  private raise(k: number, value: number): void {
    if (value <= (this.level[k] ?? 0)) return;
    if ((this.level[k] ?? 0) <= 0) this.lit++;
    this.level[k] = value;
  }

  private forCellsNear(
    x: number,
    y: number,
    radius: number,
    visit: (k: number, d: number) => void,
  ) {
    const half = CELL / 2;
    const c0 = Math.max(0, Math.floor((x - radius - this.x0 - half) / PITCH));
    const c1 = Math.min(this.cols - 1, Math.ceil((x + radius - this.x0 - half) / PITCH));
    const r0 = Math.max(0, Math.floor((y - radius - this.y0 - half) / PITCH));
    const r1 = Math.min(this.rows - 1, Math.ceil((y + radius - this.y0 - half) / PITCH));
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const d = Math.hypot(this.cellX(c) + half - x, this.cellY(r) + half - y);
        if (d <= radius) visit(r * this.cols + c, d);
      }
    }
  }
}

function softening(x: number, y: number, text: Box | null): number {
  if (!text) return 1;
  const dx = Math.max(text.left - x, 0, x - text.right);
  const dy = Math.max(text.top - y, 0, y - text.bottom);
  return SOFT + (1 - SOFT) * Math.min(1, Math.hypot(dx, dy) / FEATHER);
}
