import { isInverted, weakestContrast } from './contrast';
import { DENSE_VERSION } from './qrData';
import type { DecodeResult } from './scanCheck';
import {
  EC_RECOVERY,
  moduleGeometry,
  patchStyle,
  SIZE_MAX,
  type Style,
  type StylePatch,
} from './style';

// Roughly a code printed a few centimetres wide, or seen from across a room.
export const SMALL_SIZE = 200;
export const CONTRAST_WARN = 4;
const CONTRAST_LOW = 2.5;
const QUIET_ZONE_MIN = 2;
const MODULE_PX_MIN = 3;
// Share of the error-correction budget a logo may use before it gets risky.
const LOGO_SHARE_MAX = 0.5;

type HintId =
  | 'inverted'
  | 'contrast'
  | 'quiet-zone'
  | 'module-size'
  | 'logo-level'
  | 'logo-size'
  | 'dot-shape'
  | 'corner-shape'
  | 'raise-level'
  | 'small'
  | 'dense';

interface Fix {
  label: string;
  patch: StylePatch;
}

export interface Hint {
  id: HintId;
  text: string;
  fix?: Fix;
}

export type ScanStatus = 'pass' | 'warn' | 'fail';

interface SourceInfo {
  moduleCount: number;
  version: number;
}

const DARK_ON_WHITE: StylePatch = {
  fg: '#1a1916',
  bg: '#ffffff',
  gradient: { kind: 'none' },
  cornerSquareColor: null,
  cornerDotColor: null,
};

// Offers the first fix that, applied to the current style, actually clears the
// problem. A button that doesn't fix anything is worse than no button.
function firstWorking(
  style: Style,
  candidates: Fix[],
  solved: (next: Style) => boolean,
): Fix | undefined {
  return candidates.find((fix) => solved(patchStyle(style, fix.patch)));
}

function colourOk(style: Style): boolean {
  return !isInverted(style) && weakestContrast(style).ratio >= CONTRAST_WARN;
}

function round(value: number): string {
  return value.toFixed(1).replace(/\.0$/, '');
}

export function scanHints(style: Style, source: SourceInfo, decode: DecodeResult | null): Hint[] {
  const hints: Hint[] = [];
  const swap: Fix = { label: 'Swap colours', patch: { fg: style.bg, bg: style.fg } };
  const darkOnWhite: Fix = { label: 'Use dark on white', patch: DARK_ON_WHITE };

  if (isInverted(style)) {
    hints.push({
      id: 'inverted',
      text: 'The code is lighter than its background. Many scanner apps only read dark codes on a light background.',
      fix: firstWorking(style, [swap, darkOnWhite], colourOk),
    });
  }

  const weakest = weakestContrast(style);
  if (weakest.ratio < CONTRAST_WARN) {
    const candidates: Fix[] = [];
    if (weakest.part === 'gradient end') {
      candidates.push({ label: 'Turn off the gradient', patch: { gradient: { kind: 'none' } } });
    }
    if (weakest.part === 'corner frames') {
      candidates.push({ label: 'Match corners to dots', patch: { cornerSquareColor: null } });
    }
    if (weakest.part === 'corner centres') {
      candidates.push({ label: 'Match corners to dots', patch: { cornerDotColor: null } });
    }
    candidates.push(swap, darkOnWhite);
    hints.push({
      id: 'contrast',
      text: `${weakest.ratio < CONTRAST_LOW ? 'Very low' : 'Low'} contrast: ${round(weakest.ratio)}:1 between the ${weakest.part} and the background. Aim for 4:1 or more.`,
      fix: firstWorking(style, candidates, colourOk),
    });
  }

  const { quietZone, modulePx } = moduleGeometry(style.size, style.margin, source.moduleCount);
  if (quietZone < QUIET_ZONE_MIN) {
    hints.push({
      id: 'quiet-zone',
      text: `The margin is only ${round(quietZone)} ${quietZone === 1 ? 'module' : 'modules'} wide. Scanners need a blank border to find the code, ideally 4 modules.`,
      fix: firstWorking(
        style,
        [{ label: 'Increase margin to 4', patch: { margin: 4 } }],
        (next) => moduleGeometry(next.size, next.margin, source.moduleCount).modulePx >= 1,
      ),
    });
  }

  if (modulePx < MODULE_PX_MIN) {
    const needed = Math.ceil(((source.moduleCount + 2 * style.margin) * 4) / 16) * 16;
    hints.push({
      id: 'module-size',
      text: `Each square of the code is only ${modulePx} px across, too small for this much content.`,
      fix:
        needed <= SIZE_MAX ? { label: `Make it ${needed} px`, patch: { size: needed } } : undefined,
    });
  }

  if (style.logo.src) {
    if (style.ecLevel === 'L' || style.ecLevel === 'M') {
      hints.push({
        id: 'logo-level',
        text: `A logo covers part of the code, and level ${style.ecLevel} can only repair about ${EC_RECOVERY[style.ecLevel] * 100}%. Use level H with a logo.`,
        fix: { label: 'Raise error correction to H', patch: { ecLevel: 'H' } },
      });
    }
    if (style.logo.size > LOGO_SHARE_MAX) {
      hints.push({
        id: 'logo-size',
        text: `The logo uses ${Math.round(style.logo.size * 100)}% of what error correction can repair. Keep it under half.`,
        fix: { label: 'Shrink the logo', patch: { logo: { size: 0.4 } } },
      });
    }
  }

  const fullFailed = decode !== null && decode.full !== 'pass';
  const smallFailed = decode !== null && decode.small !== 'pass' && decode.small !== 'skipped';

  // Shape hints only appear once the decode test has actually struggled: these
  // styles scan fine most of the time, so warning on them up front would nag.
  if (fullFailed || smallFailed) {
    if (style.dotStyle === 'dots') {
      hints.push({
        id: 'dot-shape',
        text: 'Separate round dots are harder for some scanners to read.',
        fix: { label: 'Use rounded dots', patch: { dotStyle: 'rounded' } },
      });
    }
    if (style.cornerSquareStyle === 'square' && style.cornerDotStyle === 'dot') {
      hints.push({
        id: 'corner-shape',
        text: 'Round centres inside square corner frames can confuse scanners.',
        fix: { label: 'Use square corner centres', patch: { cornerDotStyle: 'square' } },
      });
    }
    if (style.cornerSquareStyle === 'dot' && style.cornerDotStyle === 'square') {
      hints.push({
        id: 'corner-shape',
        text: 'Square centres inside round corner frames can confuse scanners.',
        fix: { label: 'Use round corner centres', patch: { cornerDotStyle: 'dot' } },
      });
    }
  }

  if (smallFailed && !fullFailed) {
    hints.push({
      id: 'small',
      text: `It scans at full size but not when shrunk to ${SMALL_SIZE} px, so it may fail if printed small.`,
    });
  }

  if (fullFailed && style.ecLevel !== 'H' && !hints.some((hint) => hint.fix)) {
    hints.push({
      id: 'raise-level',
      text: 'More error correction gives scanners more to work with.',
      fix: { label: 'Raise error correction to H', patch: { ecLevel: 'H' } },
    });
  }

  if (source.version > DENSE_VERSION) {
    const widthCm = ((source.moduleCount + 8) * 0.05).toFixed(1);
    hints.push({
      id: 'dense',
      text: `This is a dense code (${source.moduleCount}×${source.moduleCount} modules). Print it at least ${widthCm} cm wide, or shorten the content.`,
    });
  }

  return hints;
}

// The decode test has the final say. Rules only explain; they never fail a code
// that actually scans.
export function scanStatus(decode: DecodeResult, hints: Hint[]): ScanStatus {
  if (decode.full !== 'pass') return 'fail';
  if (decode.small !== 'pass' && decode.small !== 'skipped') return 'warn';
  return hints.length > 0 ? 'warn' : 'pass';
}
