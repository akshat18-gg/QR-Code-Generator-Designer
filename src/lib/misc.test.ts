import { describe, expect, it } from 'vitest';
import { normaliseHex } from './colour';
import { exportFilename } from './filename';
import { checkLogoFile, LOGO_MAX_BYTES } from './image';

describe('exportFilename', () => {
  it('names files by type and local date', () => {
    const date = new Date(2026, 9, 4, 23, 30);
    expect(exportFilename('wifi', 'png', date)).toBe('qr-wifi-2026-10-04.png');
    expect(exportFilename('url', 'svg', new Date(2026, 0, 9))).toBe('qr-url-2026-01-09.svg');
  });
});

describe('checkLogoFile', () => {
  it.each([
    { name: 'logo.png', type: 'image/png' },
    { name: 'logo.jpg', type: 'image/jpeg' },
    { name: 'logo.svg', type: 'image/svg+xml' },
    { name: 'logo.svg', type: '' },
  ])('accepts $name ($type)', ({ name, type }) => {
    expect(checkLogoFile({ name, type, size: 1000 })).toBeNull();
  });

  it.each([
    { name: 'logo.gif', type: 'image/gif' },
    { name: 'logo.webp', type: 'image/webp' },
    { name: 'notes.pdf', type: 'application/pdf' },
    { name: 'logo', type: '' },
  ])('rejects $name', ({ name, type }) => {
    expect(checkLogoFile({ name, type, size: 1000 })).toBe('Use a PNG, JPG or SVG image.');
  });

  it('rejects files over 2 MB', () => {
    expect(checkLogoFile({ name: 'a.png', type: 'image/png', size: LOGO_MAX_BYTES })).toBeNull();
    expect(checkLogoFile({ name: 'a.png', type: 'image/png', size: LOGO_MAX_BYTES + 1 })).toBe(
      'That image is over 2 MB. Try a smaller one.',
    );
  });
});

describe('normaliseHex', () => {
  it.each([
    ['#1A1916', '#1a1916'],
    ['1a1916', '#1a1916'],
    ['#abc', '#aabbcc'],
    [' fff ', '#ffffff'],
  ])('reads %s as %s', (input, expected) => {
    expect(normaliseHex(input)).toBe(expected);
  });

  it.each(['', '#12', '#12345', '#gggggg', 'red', '#1a19160'])('rejects %s', (input) => {
    expect(normaliseHex(input)).toBeNull();
  });
});
