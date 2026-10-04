import jsQR from 'jsqr';
import { describe, expect, it } from 'vitest';
import { qrPixels } from '../test/qrPixels';
import { analyse, overflowMessage, qrMode, toQrData } from './qrData';
import type { EcLevel } from './style';

function encodeAndDecode(text: string, ecLevel: EcLevel = 'M'): string | undefined {
  const { pixels, side } = qrPixels(text, { ecLevel });
  return jsQR(pixels, side, side)?.data;
}

describe('toQrData', () => {
  it('leaves ASCII unchanged', () => {
    expect(toQrData('https://example.com')).toBe('https://example.com');
  });

  it('turns each UTF-8 byte into one char', () => {
    expect(toQrData('é')).toBe('Ã©');
    expect(toQrData('😀')).toBe('ð\u009f\u0098\u0080');
  });
});

describe('UTF-8 round trip', () => {
  it.each([
    ['Tamil', 'வணக்கம், உலகம்'],
    ['Hindi', 'नमस्ते दुनिया'],
    ['emoji', 'Hello 😀👍🏽'],
    ['mixed', 'GDG SRM · வணக்கம் · नमस्ते · 😀\nline two'],
  ])('decodes %s back exactly', (_label, text) => {
    expect(encodeAndDecode(text)).toBe(text);
  });

  it('decodes a mailto with a Hindi subject', () => {
    const text = `mailto:a@b.co?subject=${encodeURIComponent('नमस्ते')}`;
    expect(encodeAndDecode(text, 'H')).toBe(text);
  });
});

describe('qrMode', () => {
  it('picks the most compact mode', () => {
    expect(qrMode('0123456789')).toBe('Numeric');
    expect(qrMode('HELLO WORLD')).toBe('Alphanumeric');
    expect(qrMode('https://example.com')).toBe('Byte');
    expect(qrMode(toQrData('வணக்கம்'))).toBe('Byte');
  });
});

describe('analyse', () => {
  it('reports version and module count', () => {
    const result = analyse('https://example.com', 'M');
    expect(result).toMatchObject({ ok: true, version: 2, moduleCount: 25, mode: 'Byte' });
  });

  it('grows the version with error correction', () => {
    const low = analyse('a'.repeat(200), 'L');
    const high = analyse('a'.repeat(200), 'H');
    expect(low.ok && high.ok && high.version > low.version).toBe(true);
  });

  it('counts UTF-8 bytes, not characters', () => {
    const ascii = analyse('a'.repeat(100), 'M');
    const tamil = analyse('வ'.repeat(100), 'M');
    expect(ascii.ok && tamil.ok && tamil.version > ascii.version).toBe(true);
  });

  it('fits the version 40 limit and overflows one byte past it', () => {
    // Byte-mode capacity of version 40: L 2953, H 1273.
    expect(analyse('a'.repeat(2953), 'L')).toMatchObject({ ok: true, version: 40 });
    expect(analyse('a'.repeat(2954), 'L')).toEqual({ ok: false });
    expect(analyse('a'.repeat(1273), 'H')).toMatchObject({ ok: true, version: 40 });
    expect(analyse('a'.repeat(1274), 'H')).toEqual({ ok: false });
  });

  it('overflows sooner with multi-byte text', () => {
    // Each Tamil letter is 3 bytes in UTF-8.
    expect(analyse('வ'.repeat(424), 'H').ok).toBe(true);
    expect(analyse('வ'.repeat(425), 'H').ok).toBe(false);
  });
});

describe('overflowMessage', () => {
  it('names the level and suggests lowering it', () => {
    expect(overflowMessage('H')).toBe(
      'Too much text for one QR code at level H. Shorten it or lower the error correction.',
    );
  });

  it('only suggests shortening at level L', () => {
    expect(overflowMessage('L')).toBe(
      'Too much text for one QR code, even at level L. Shorten it.',
    );
  });
});
