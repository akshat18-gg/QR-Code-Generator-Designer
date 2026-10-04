import { describe, expect, it } from 'vitest';
import { DEFAULT_STYLE } from '../state/editor';
import { contrastRatio, isInverted, luminance, weakestContrast } from './contrast';
import type { Style } from './style';

describe('luminance', () => {
  it('is 0 for black and 1 for white', () => {
    expect(luminance('#000000')).toBe(0);
    expect(luminance('#ffffff')).toBe(1);
  });

  it('weights green most, like the eye', () => {
    expect(luminance('#00ff00')).toBeGreaterThan(luminance('#ff0000'));
    expect(luminance('#ff0000')).toBeGreaterThan(luminance('#0000ff'));
  });
});

describe('contrastRatio', () => {
  it('matches known WCAG values', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 5);
    expect(contrastRatio('#777777', '#ffffff')).toBeCloseTo(4.48, 2);
    expect(contrastRatio('#0000ff', '#ffffff')).toBeCloseTo(8.59, 2);
  });

  it('does not care about order', () => {
    expect(contrastRatio('#123456', '#fedcba')).toBe(contrastRatio('#fedcba', '#123456'));
  });
});

describe('weakestContrast', () => {
  it('uses the dot colour when nothing else is set', () => {
    expect(weakestContrast(DEFAULT_STYLE).part).toBe('dots');
  });

  it('uses the weaker gradient stop', () => {
    const style: Style = {
      ...DEFAULT_STYLE,
      gradient: { kind: 'linear', to: '#bbbbbb', angle: 0 },
    };
    const weakest = weakestContrast(style);
    expect(weakest.part).toBe('gradient end');
    expect(weakest.ratio).toBeCloseTo(contrastRatio('#bbbbbb', '#ffffff'), 5);
  });

  it('includes corner colours', () => {
    const style: Style = { ...DEFAULT_STYLE, cornerDotColor: '#dddddd' };
    expect(weakestContrast(style)).toMatchObject({ part: 'corner centres', colour: '#dddddd' });
  });

  it('ignores the gradient end when the gradient is off', () => {
    const style: Style = { ...DEFAULT_STYLE, gradient: { kind: 'none', to: '#ffffff', angle: 0 } };
    expect(weakestContrast(style).part).toBe('dots');
  });
});

describe('isInverted', () => {
  it('is false for dark on light', () => {
    expect(isInverted(DEFAULT_STYLE)).toBe(false);
  });

  it('is true for light on dark', () => {
    expect(isInverted({ ...DEFAULT_STYLE, fg: '#ffffff', bg: '#1a1916' })).toBe(true);
  });

  it('is true when only a corner is lighter than the background', () => {
    expect(isInverted({ ...DEFAULT_STYLE, bg: '#cccccc', cornerSquareColor: '#ffffff' })).toBe(
      true,
    );
  });
});
