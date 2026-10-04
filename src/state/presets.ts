import type { Style } from '../lib/style';

// A preset only sets the look. Size, quiet zone, error correction and the logo
// stay as the user left them, so picking a preset never breaks a working code.
export type PresetLook = Pick<
  Style,
  | 'fg'
  | 'bg'
  | 'dotStyle'
  | 'cornerSquareStyle'
  | 'cornerSquareColor'
  | 'cornerDotStyle'
  | 'cornerDotColor'
  | 'gradient'
>;

export interface Preset {
  id: string;
  name: string;
  look: PresetLook;
}

export const NEWSPRINT: Preset = {
  id: 'newsprint',
  name: 'Newsprint',
  look: {
    fg: '#1a1916',
    bg: '#ffffff',
    dotStyle: 'square',
    cornerSquareStyle: 'square',
    cornerSquareColor: null,
    cornerDotStyle: 'square',
    cornerDotColor: null,
    gradient: { kind: 'none', to: '#1a1916', angle: 0 },
  },
};

export const PRESETS: readonly Preset[] = [
  NEWSPRINT,
  {
    id: 'blueprint',
    name: 'Blueprint',
    look: {
      fg: '#123a6b',
      bg: '#e8eef5',
      dotStyle: 'classy',
      cornerSquareStyle: 'square',
      cornerSquareColor: null,
      cornerDotStyle: 'square',
      cornerDotColor: null,
      gradient: { kind: 'none', to: '#123a6b', angle: 0 },
    },
  },
  {
    id: 'receipt',
    name: 'Receipt',
    look: {
      fg: '#2b2a28',
      bg: '#fdfcf9',
      dotStyle: 'dots',
      cornerSquareStyle: 'extra-rounded',
      cornerSquareColor: null,
      cornerDotStyle: 'dot',
      cornerDotColor: null,
      gradient: { kind: 'none', to: '#2b2a28', angle: 0 },
    },
  },
  {
    // Light-on-dark codes trip up many scanner apps, so "dark" here means deep
    // ink on a dim card rather than an inverted code.
    id: 'night',
    name: 'Night',
    look: {
      fg: '#0b1620',
      bg: '#c4ccd2',
      dotStyle: 'rounded',
      cornerSquareStyle: 'extra-rounded',
      cornerSquareColor: null,
      cornerDotStyle: 'dot',
      cornerDotColor: null,
      gradient: { kind: 'radial', to: '#24404f', angle: 0 },
    },
  },
  {
    id: 'stamp',
    name: 'Stamp',
    look: {
      fg: '#9b2226',
      bg: '#f6efe4',
      dotStyle: 'extra-rounded',
      cornerSquareStyle: 'extra-rounded',
      cornerSquareColor: null,
      cornerDotStyle: 'dot',
      cornerDotColor: null,
      gradient: { kind: 'none', to: '#9b2226', angle: 0 },
    },
  },
  {
    id: 'rust',
    name: 'Rust',
    look: {
      fg: '#7c2d12',
      bg: '#fbf7f0',
      dotStyle: 'rounded',
      cornerSquareStyle: 'square',
      cornerSquareColor: '#b83c0c',
      cornerDotStyle: 'square',
      cornerDotColor: '#1a1916',
      gradient: { kind: 'linear', to: '#1a1916', angle: 45 },
    },
  },
];

function sameLook(style: Style, look: PresetLook): boolean {
  return (
    style.fg === look.fg &&
    style.bg === look.bg &&
    style.dotStyle === look.dotStyle &&
    style.cornerSquareStyle === look.cornerSquareStyle &&
    style.cornerSquareColor === look.cornerSquareColor &&
    style.cornerDotStyle === look.cornerDotStyle &&
    style.cornerDotColor === look.cornerDotColor &&
    style.gradient.kind === look.gradient.kind &&
    (look.gradient.kind === 'none' ||
      (style.gradient.to === look.gradient.to && style.gradient.angle === look.gradient.angle))
  );
}

// Derived rather than stored: a preset is active exactly while the look still
// matches it, so any edit to a preset's colours or pattern shows "Custom".
export function activePreset(style: Style): Preset | undefined {
  return PRESETS.find((preset) => sameLook(style, preset.look));
}
