import { describe, expect, it } from 'vitest';
import { DEFAULT_STYLE } from '../state/editor';
import { PRESETS } from '../state/presets';
import { isInverted, weakestContrast } from './contrast';
import type { DecodeResult } from './scanCheck';
import { CONTRAST_WARN, scanHints, scanStatus, type Hint } from './scanRules';
import { moduleGeometry, patchStyle, type Style } from './style';

const SMALL_CODE = { moduleCount: 25, version: 2 };
const PASS: DecodeResult = { full: 'pass', small: 'pass' };
const LOGO = {
  src: 'data:image/png;base64,AAAA',
  name: 'logo.png',
  size: 0.4,
  margin: 1,
  hideDots: true,
};

function ids(hints: Hint[]) {
  return hints.map((hint) => hint.id);
}

function hint(hints: Hint[], id: Hint['id']) {
  const found = hints.find((h) => h.id === id);
  if (!found) throw new Error(`no ${id} hint in ${ids(hints).join(', ')}`);
  return found;
}

describe('scanHints', () => {
  it('has nothing to say about the default style', () => {
    expect(scanHints(DEFAULT_STYLE, SMALL_CODE, PASS)).toEqual([]);
  });

  it('has nothing to say about any preset', () => {
    for (const preset of PRESETS) {
      expect(scanHints({ ...DEFAULT_STYLE, ...preset.look }, SMALL_CODE, PASS)).toEqual([]);
    }
  });

  it('flags inverted colours and offers a swap that fixes them', () => {
    const style: Style = { ...DEFAULT_STYLE, fg: '#ffffff', bg: '#1a1916' };
    const inverted = hint(scanHints(style, SMALL_CODE, null), 'inverted');
    expect(inverted.fix?.label).toBe('Swap colours');
    expect(isInverted(patchStyle(style, inverted.fix?.patch ?? {}))).toBe(false);
  });

  it('falls back to dark on white when a swap would not fix the colours', () => {
    const style: Style = {
      ...DEFAULT_STYLE,
      fg: '#ffffff',
      bg: '#1a1916',
      gradient: { kind: 'linear', to: '#eeeeee', angle: 0 },
    };
    expect(hint(scanHints(style, SMALL_CODE, null), 'inverted').fix?.label).toBe(
      'Use dark on white',
    );
  });

  it('warns about low contrast with the ratio and the weak part', () => {
    const style: Style = { ...DEFAULT_STYLE, fg: '#888888' };
    const contrast = hint(scanHints(style, SMALL_CODE, null), 'contrast');
    expect(contrast.text).toMatch(/^Low contrast: 3\.5:1 between the dots and the background/);
  });

  it('calls very low contrast out', () => {
    const style: Style = { ...DEFAULT_STYLE, fg: '#bbbbbb' };
    expect(hint(scanHints(style, SMALL_CODE, null), 'contrast').text).toMatch(/^Very low contrast/);
  });

  it('suggests turning off a gradient whose end is too light', () => {
    const style: Style = {
      ...DEFAULT_STYLE,
      gradient: { kind: 'radial', to: '#dddddd', angle: 0 },
    };
    const contrast = hint(scanHints(style, SMALL_CODE, null), 'contrast');
    expect(contrast.fix?.label).toBe('Turn off the gradient');
    expect(weakestContrast(patchStyle(style, contrast.fix?.patch ?? {})).ratio).toBeGreaterThan(
      CONTRAST_WARN,
    );
  });

  it('suggests matching a pale corner back to the dots', () => {
    const style: Style = { ...DEFAULT_STYLE, cornerSquareColor: '#eeeeee' };
    expect(hint(scanHints(style, SMALL_CODE, null), 'contrast').fix).toEqual({
      label: 'Match corners to dots',
      patch: { cornerSquareColor: null },
    });
  });

  it('flags a thin quiet zone and fixes it with a 4-module margin', () => {
    const style: Style = { ...DEFAULT_STYLE, margin: 1 };
    const quiet = hint(scanHints(style, SMALL_CODE, null), 'quiet-zone');
    expect(quiet.fix).toEqual({ label: 'Increase margin to 4', patch: { margin: 4 } });
    expect(ids(scanHints({ ...DEFAULT_STYLE, margin: 2 }, SMALL_CODE, null))).not.toContain(
      'quiet-zone',
    );
  });

  it('flags modules smaller than 3 px and suggests a size that fixes it', () => {
    const dense = { moduleCount: 117, version: 25 };
    const style: Style = { ...DEFAULT_STYLE, size: 256 };
    const small = hint(scanHints(style, dense, null), 'module-size');
    expect(small.fix?.label).toBe('Make it 512 px');
    const fixed = patchStyle(style, small.fix?.patch ?? {});
    expect(
      moduleGeometry(fixed.size, fixed.margin, dense.moduleCount).modulePx,
    ).toBeGreaterThanOrEqual(3);
  });

  it('asks for level H when there is a logo at L or M', () => {
    for (const ecLevel of ['L', 'M'] as const) {
      const style: Style = { ...DEFAULT_STYLE, ecLevel, logo: LOGO };
      expect(hint(scanHints(style, SMALL_CODE, null), 'logo-level').fix).toEqual({
        label: 'Raise error correction to H',
        patch: { ecLevel: 'H' },
      });
    }
    for (const ecLevel of ['Q', 'H'] as const) {
      const style: Style = { ...DEFAULT_STYLE, ecLevel, logo: LOGO };
      expect(ids(scanHints(style, SMALL_CODE, null))).not.toContain('logo-level');
    }
  });

  it('flags a logo that uses more than half the repair budget', () => {
    const style: Style = { ...DEFAULT_STYLE, ecLevel: 'H', logo: { ...LOGO, size: 0.7 } };
    expect(hint(scanHints(style, SMALL_CODE, null), 'logo-size').fix?.label).toBe(
      'Shrink the logo',
    );
  });

  it('only mentions fragile shapes after the decode test struggles', () => {
    const style: Style = {
      ...DEFAULT_STYLE,
      dotStyle: 'dots',
      cornerSquareStyle: 'square',
      cornerDotStyle: 'dot',
    };
    expect(scanHints(style, SMALL_CODE, PASS)).toEqual([]);
    const failed = scanHints(style, SMALL_CODE, { full: 'unreadable', small: 'unreadable' });
    expect(hint(failed, 'dot-shape').fix?.label).toBe('Use rounded dots');
    expect(hint(failed, 'corner-shape').fix?.label).toBe('Use square corner centres');
  });

  it('suggests level H when the decode fails for no clear reason', () => {
    const failed = scanHints(DEFAULT_STYLE, SMALL_CODE, { full: 'unreadable', small: 'skipped' });
    expect(ids(failed)).toEqual(['raise-level']);
  });

  it('explains when only the shrunk copy fails', () => {
    const hints = scanHints(DEFAULT_STYLE, SMALL_CODE, { full: 'pass', small: 'unreadable' });
    expect(ids(hints)).toEqual(['small']);
  });

  it('warns about dense codes above version 10', () => {
    expect(ids(scanHints(DEFAULT_STYLE, { moduleCount: 57, version: 10 }, PASS))).toEqual([]);
    expect(
      hint(scanHints(DEFAULT_STYLE, { moduleCount: 61, version: 11 }, PASS), 'dense').text,
    ).toBe(
      'This is a dense code (61×61 modules). Print it at least 3.5 cm wide, or shorten the content.',
    );
  });
});

describe('scanStatus', () => {
  const warning: Hint[] = [{ id: 'quiet-zone', text: 'x' }];

  it('passes when the decode passes and nothing is flagged', () => {
    expect(scanStatus(PASS, [])).toBe('pass');
    expect(scanStatus({ full: 'pass', small: 'skipped' }, [])).toBe('pass');
  });

  it('warns, never fails, when rules complain but the code reads', () => {
    expect(scanStatus(PASS, warning)).toBe('warn');
  });

  it('warns when only the small copy fails', () => {
    expect(scanStatus({ full: 'pass', small: 'unreadable' }, [])).toBe('warn');
  });

  it('fails when the full-size decode fails or reads the wrong text', () => {
    expect(scanStatus({ full: 'unreadable', small: 'skipped' }, [])).toBe('fail');
    expect(scanStatus({ full: 'mismatch', small: 'pass' }, [])).toBe('fail');
  });
});
