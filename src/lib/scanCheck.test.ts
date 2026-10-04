import { describe, expect, it } from 'vitest';
import { qrPixels } from '../test/qrPixels';
import { decodePixels } from './scanCheck';

describe('decodePixels', () => {
  it('passes when the code reads back as the expected text', () => {
    const { pixels, side } = qrPixels('https://example.com');
    expect(decodePixels(pixels, side, side, 'https://example.com')).toBe('pass');
  });

  it('reports a mismatch when it reads different text', () => {
    const { pixels, side } = qrPixels('https://example.com');
    expect(decodePixels(pixels, side, side, 'https://example.org')).toBe('mismatch');
  });

  it('does not read inverted codes, like many phone scanners', () => {
    const { pixels, side } = qrPixels('https://example.com', { dark: 255, light: 0 });
    expect(decodePixels(pixels, side, side, 'https://example.com')).toBe('unreadable');
  });

  it('still reads a perfect code with no quiet zone, which is why margin is a separate rule', () => {
    const { pixels, side } = qrPixels('https://example.com', { quiet: 0 });
    expect(decodePixels(pixels, side, side, 'https://example.com')).toBe('pass');
  });

  it('cannot read a code with very low contrast', () => {
    const { pixels, side } = qrPixels('https://example.com', { dark: 200, light: 215 });
    expect(decodePixels(pixels, side, side, 'https://example.com')).toBe('unreadable');
  });
});
