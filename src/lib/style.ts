export type EcLevel = 'L' | 'M' | 'Q' | 'H';
export type DotStyle = 'square' | 'rounded' | 'dots' | 'classy' | 'extra-rounded';
export type CornerSquareStyle = 'square' | 'extra-rounded' | 'dot';
export type CornerDotStyle = 'square' | 'dot';
export type GradientKind = 'none' | 'linear' | 'radial';

export interface Gradient {
  kind: GradientKind;
  // The gradient starts at the ink colour and ends here.
  to: string;
  angle: number;
}

export interface Logo {
  src: string | null;
  name: string;
  // Share of the error-correction budget the logo may cover (qr-code-styling's imageSize).
  size: number;
  // Padding around the logo, in modules.
  margin: number;
  hideDots: boolean;
}

export interface Style {
  size: number;
  // Quiet zone, in modules.
  margin: number;
  ecLevel: EcLevel;
  fg: string;
  bg: string;
  dotStyle: DotStyle;
  cornerSquareStyle: CornerSquareStyle;
  // null means "follow the ink colour".
  cornerSquareColor: string | null;
  cornerDotStyle: CornerDotStyle;
  cornerDotColor: string | null;
  gradient: Gradient;
  logo: Logo;
}

export const SIZE_MIN = 128;
export const SIZE_MAX = 1024;
export const MARGIN_MAX = 8;

export const EC_LEVELS: readonly EcLevel[] = ['L', 'M', 'Q', 'H'];

// Share of the code each level can lose and still be read.
export const EC_RECOVERY: Record<EcLevel, number> = { L: 0.07, M: 0.15, Q: 0.25, H: 0.3 };

export const DOT_STYLES: readonly DotStyle[] = [
  'square',
  'rounded',
  'dots',
  'classy',
  'extra-rounded',
];
export const CORNER_SQUARE_STYLES: readonly CornerSquareStyle[] = [
  'square',
  'extra-rounded',
  'dot',
];
export const CORNER_DOT_STYLES: readonly CornerDotStyle[] = ['square', 'dot'];

export const NO_LOGO: Logo = { src: null, name: '', size: 0.4, margin: 1, hideDots: true };

export function cornerSquareColour(style: Style): string {
  return style.cornerSquareColor ?? style.fg;
}

export function cornerDotColour(style: Style): string {
  return style.cornerDotColor ?? style.fg;
}

// Pixel size of one module, and the quiet zone qr-code-styling actually draws.
// It floors the module size, so the leftover pixels widen the margin a little.
export function moduleGeometry(size: number, marginModules: number, moduleCount: number) {
  const marginPx = Math.round((marginModules * size) / (moduleCount + 2 * marginModules));
  const modulePx = Math.floor((size - 2 * marginPx) / moduleCount);
  const quietZone = modulePx > 0 ? (size - moduleCount * modulePx) / 2 / modulePx : 0;
  return { marginPx, modulePx, quietZone };
}

export type StylePatch = Partial<Omit<Style, 'gradient' | 'logo'>> & {
  gradient?: Partial<Gradient>;
  logo?: Partial<Logo>;
};

export function patchStyle(style: Style, patch: StylePatch): Style {
  const { gradient, logo, ...rest } = patch;
  return {
    ...style,
    ...rest,
    gradient: { ...style.gradient, ...gradient },
    logo: { ...style.logo, ...logo },
  };
}
