import { describe, expect, it } from 'vitest';
import { DEFAULT_STYLE } from '../state/editor';
import { toQrOptions, type QrSource } from './qrConfig';
import type { Style } from './style';

const source: QrSource = { data: 'https://example.com', mode: 'Byte', moduleCount: 25 };

describe('toQrOptions', () => {
  it('maps size, margin, level and colours', () => {
    const options = toQrOptions(source, DEFAULT_STYLE);
    expect(options).toMatchObject({
      width: 512,
      height: 512,
      margin: 62,
      data: 'https://example.com',
      qrOptions: { typeNumber: 0, mode: 'Byte', errorCorrectionLevel: 'M' },
      dotsOptions: { type: 'square', color: '#1a1916', gradient: undefined },
      cornersSquareOptions: { type: 'square', color: '#1a1916' },
      cornersDotOptions: { type: 'square', color: '#1a1916' },
      backgroundOptions: { color: '#ffffff' },
      image: undefined,
    });
  });

  it('builds a linear gradient from the ink colour, with the angle in radians', () => {
    const style: Style = {
      ...DEFAULT_STYLE,
      gradient: { kind: 'linear', to: '#ff0000', angle: 90 },
    };
    expect(toQrOptions(source, style).dotsOptions?.gradient).toEqual({
      type: 'linear',
      rotation: Math.PI / 2,
      colorStops: [
        { offset: 0, color: '#1a1916' },
        { offset: 1, color: '#ff0000' },
      ],
    });
  });

  it('keeps corners solid when the dots use a gradient', () => {
    const style: Style = {
      ...DEFAULT_STYLE,
      gradient: { kind: 'radial', to: '#ff0000', angle: 0 },
    };
    const options = toQrOptions(source, style);
    expect(options.cornersSquareOptions).toEqual({ type: 'square', color: '#1a1916' });
    expect(options.cornersSquareOptions?.gradient).toBeUndefined();
  });

  it('passes the logo with padding in pixels', () => {
    const style: Style = {
      ...DEFAULT_STYLE,
      logo: {
        src: 'data:image/png;base64,AAAA',
        name: 'x.png',
        size: 0.3,
        margin: 2,
        hideDots: false,
      },
    };
    expect(toQrOptions(source, style)).toMatchObject({
      image: 'data:image/png;base64,AAAA',
      imageOptions: { imageSize: 0.3, margin: 30, hideBackgroundDots: false, saveAsBlob: true },
    });
  });

  it('can render at a different size for thumbnails', () => {
    expect(toQrOptions(source, DEFAULT_STYLE, 64).width).toBe(64);
  });
});
