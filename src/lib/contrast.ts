import { cornerDotColour, cornerSquareColour, type Style } from './style';

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

// WCAG 2 relative luminance of a "#rrggbb" colour.
export function luminance(hex: string): number {
  const n = Number.parseInt(hex.slice(1), 16);
  return (
    0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255)
  );
}

export function contrastRatio(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (light + 0.05) / (dark + 0.05);
}

export type InkPart = 'dots' | 'gradient end' | 'corner frames' | 'corner centres';

// Every colour that draws dark modules. With a gradient the dots run between
// the two stops, so the weaker stop is what limits the contrast.
export function inkColours(style: Style): { part: InkPart; colour: string }[] {
  const colours: { part: InkPart; colour: string }[] = [{ part: 'dots', colour: style.fg }];
  if (style.gradient.kind !== 'none') {
    colours.push({ part: 'gradient end', colour: style.gradient.to });
  }
  colours.push({ part: 'corner frames', colour: cornerSquareColour(style) });
  colours.push({ part: 'corner centres', colour: cornerDotColour(style) });
  return colours;
}

export function weakestContrast(style: Style): { part: InkPart; colour: string; ratio: number } {
  return inkColours(style)
    .map((ink) => ({ ...ink, ratio: contrastRatio(ink.colour, style.bg) }))
    .reduce((weakest, ink) => (ink.ratio < weakest.ratio ? ink : weakest));
}

// Scanners look for dark modules on a light background. If any part of the
// code is lighter than the background, it reads as inverted.
export function isInverted(style: Style): boolean {
  const bg = luminance(style.bg);
  return inkColours(style).some(({ colour }) => luminance(colour) > bg);
}
