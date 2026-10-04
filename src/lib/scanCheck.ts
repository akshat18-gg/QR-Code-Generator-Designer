import jsQR from 'jsqr';
import type { Options } from 'qr-code-styling';
import { renderBlob } from './exportQr';
import { SMALL_SIZE } from './scanRules';

export type DecodeOutcome = 'pass' | 'unreadable' | 'mismatch';

export interface DecodeResult {
  full: DecodeOutcome;
  small: DecodeOutcome | 'skipped';
}

export function decodePixels(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  expected: string,
): DecodeOutcome {
  // Many phone scanners never try the inverted image, so neither do we.
  const result = jsQR(data, width, height, { inversionAttempts: 'dontInvert' });
  if (!result) return 'unreadable';
  return result.data === expected ? 'pass' : 'mismatch';
}

function decodeAt(image: ImageBitmap, size: number, expected: string): DecodeOutcome {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return 'unreadable';
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, 0, 0, size, size);
  return decodePixels(context.getImageData(0, 0, size, size).data, size, size, expected);
}

// Renders the exact PNG the download button would produce and reads it back,
// once at full size and once shrunk, so the result is about the real file.
export async function runDecodeTest(options: Options, expected: string): Promise<DecodeResult> {
  const image = await createImageBitmap(await renderBlob(options, 'png'));
  try {
    const full = decodeAt(image, image.width, expected);
    const small = image.width > SMALL_SIZE ? decodeAt(image, SMALL_SIZE, expected) : 'skipped';
    return { full, small };
  } finally {
    image.close();
  }
}
