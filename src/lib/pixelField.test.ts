import { describe, expect, it } from 'vitest';
import { CELL, colourAt, FADE_MS, PITCH, PixelField, SOFT, sprinkled } from './pixelField';

function brightest(field: PixelField): number {
  return Math.max(...field.level);
}

describe('colourAt', () => {
  it('uses all four colours about equally', () => {
    const counts = [0, 0, 0, 0];
    for (let j = 0; j < 60; j++) {
      for (let i = 0; i < 200; i++) {
        const colour = colourAt(i, j);
        counts[colour] = (counts[colour] ?? 0) + 1;
      }
    }
    for (const count of counts) expect(count / 12000).toBeGreaterThan(0.2);
  });

  it('groups colours into patches instead of noise', () => {
    let same = 0;
    let pairs = 0;
    for (let j = 0; j < 40; j++) {
      for (let i = 0; i < 100; i++) {
        pairs += 2;
        if (colourAt(i, j) === colourAt(i + 1, j)) same++;
        if (colourAt(i, j) === colourAt(i, j + 1)) same++;
      }
    }
    // Random colours would match a neighbour a quarter of the time.
    expect(same / pairs).toBeGreaterThan(0.5);
  });

  it('is the same every time, including at negative positions', () => {
    expect(colourAt(-3, 7)).toBe(colourAt(-3, 7));
    expect(colourAt(-3, 7)).toBeGreaterThanOrEqual(0);
  });

  it('sprinkles a small share of cells', () => {
    let count = 0;
    for (let j = 0; j < 50; j++) for (let i = 0; i < 100; i++) if (sprinkled(i, j)) count++;
    expect(count / 5000).toBeGreaterThan(0.05);
    expect(count / 5000).toBeLessThan(0.12);
  });
});

describe('PixelField', () => {
  it('centres every cell on a dot of the page grid', () => {
    const field = new PixelField(300, 100, 37, 4, null);
    for (const c of [0, 1, 5]) expect((37 + field.cellX(c) + CELL / 2) % PITCH).toBe(PITCH / 2);
    for (const r of [0, 1, 3]) expect((4 + field.cellY(r) + CELL / 2) % PITCH).toBe(PITCH / 2);
    expect(field.cellX(field.cols - 1)).toBeLessThan(300);
    expect(field.cellX(field.cols - 1) + PITCH).toBeGreaterThanOrEqual(300 - CELL);
  });

  it('keeps colours in place when the canvas moves on the page', () => {
    const a = new PixelField(400, 96, 0, 0, null);
    const b = new PixelField(400, 96, 32, 16, null);
    expect(b.colour[0]).toBe(a.colour[1 * a.cols + 2]);
  });

  it('lights cells under the brush and fades them out over FADE_MS', () => {
    const field = new PixelField(400, 96, 0, 0, null);
    expect(field.active).toBe(false);
    field.brush(100, 40);
    expect(brightest(field)).toBeGreaterThan(0.8);
    expect(field.active).toBe(true);

    expect(field.step(0, FADE_MS / 2)).toBe(true);
    expect(brightest(field)).toBeLessThan(0.6);
    expect(field.step(0, FADE_MS / 2)).toBe(false);
    expect(brightest(field)).toBe(0);
  });

  it('leaves no gaps along a fast stroke', () => {
    const field = new PixelField(800, 96, 0, 0, null);
    field.stroke({ x: 20, y: 40 }, { x: 700, y: 40 });
    const row = Math.floor((40 - field.y0) / PITCH);
    for (let c = 2; c < 42; c++) expect(field.level[row * field.cols + c]).toBeGreaterThan(0);
  });

  it('sends a ripple outwards and stops once it passes its reach', () => {
    const field = new PixelField(800, 96, 0, 0, null);
    field.ripple(400, 48, 0, 200);
    expect(field.step(200, 16)).toBe(true);
    // At 200 ms the ring is 90 px out: lit there, dark in the middle.
    const row = Math.floor((48 - field.y0) / PITCH);
    const at = (x: number) =>
      field.level[row * field.cols + Math.floor((x - field.x0) / PITCH)] ?? 0;
    expect(at(400 + 80)).toBeGreaterThan(0);
    expect(at(400)).toBe(0);

    let time = 200;
    while (field.step(time, 16) && time < 5000) time += 16;
    expect(time).toBeLessThan(200 / 0.45 + FADE_MS + 200);
    expect(brightest(field)).toBe(0);
  });

  it('keeps ripples running across a resize', () => {
    const before = new PixelField(400, 96, 0, 0, null);
    before.ripple(10, 10, 0, 300);
    const after = new PixelField(600, 96, 0, 0, null);
    after.takeRipples(before);
    expect(after.active).toBe(true);
  });

  it('keeps cells behind the text soft', () => {
    const text = { left: 100, top: 20, right: 260, bottom: 70 };
    const field = new PixelField(800, 96, 0, 0, text);
    const weightAt = (x: number, y: number) =>
      field.weight[
        Math.floor((y - field.y0) / PITCH) * field.cols + Math.floor((x - field.x0) / PITCH)
      ] ?? 0;
    expect(weightAt(180, 45)).toBeLessThanOrEqual(SOFT);
    expect(weightAt(600, 45)).toBeGreaterThanOrEqual(0.65);
  });
});
