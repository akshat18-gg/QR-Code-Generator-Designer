import { describe, expect, it } from 'vitest';
import { DEFAULT_STYLE } from '../state/editor';
import { cornerDotColour, cornerSquareColour, moduleGeometry } from './style';

describe('moduleGeometry', () => {
  it('gives at least the requested quiet zone', () => {
    for (const margin of [0, 1, 2, 4, 8]) {
      for (const count of [21, 25, 57, 177]) {
        const { quietZone, modulePx } = moduleGeometry(1024, margin, count);
        expect(modulePx).toBeGreaterThan(0);
        expect(quietZone).toBeGreaterThanOrEqual(margin - 0.5);
      }
    }
  });

  it('floors the module size like qr-code-styling does', () => {
    // 512 px, 25 modules, 4-module margin: (512 - 2 * 62) / 25 = 15.5 -> 15 px modules,
    // and the spare 13 px go to the quiet zone.
    const { marginPx, modulePx, quietZone } = moduleGeometry(512, 4, 25);
    expect([marginPx, modulePx]).toEqual([62, 15]);
    expect(quietZone).toBeCloseTo(4.57, 2);
  });

  it('reports zero-pixel modules when the code cannot fit', () => {
    expect(moduleGeometry(128, 4, 177).modulePx).toBe(0);
  });
});

describe('corner colours', () => {
  it('follow the ink colour until set', () => {
    const style = { ...DEFAULT_STYLE, fg: '#123456' };
    expect(cornerSquareColour(style)).toBe('#123456');
    expect(cornerDotColour(style)).toBe('#123456');
  });

  it('use their own colour once set', () => {
    const style = { ...DEFAULT_STYLE, cornerSquareColor: '#ff0000', cornerDotColor: '#00ff00' };
    expect(cornerSquareColour(style)).toBe('#ff0000');
    expect(cornerDotColour(style)).toBe('#00ff00');
  });
});
