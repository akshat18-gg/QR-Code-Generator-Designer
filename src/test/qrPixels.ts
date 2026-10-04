import qrcode from 'qrcode-generator';
import { qrMode, toQrData } from '../lib/qrData';
import type { EcLevel } from '../lib/style';

interface PixelOptions {
  ecLevel?: EcLevel;
  scale?: number;
  quiet?: number;
  dark?: number;
  light?: number;
}

// Draws a code's modules into an RGBA buffer, like a canvas would, so jsQR can
// be tested in Node without a browser.
export function qrPixels(text: string, options: PixelOptions = {}) {
  const { ecLevel = 'M', scale = 4, quiet = 4, dark = 0, light = 255 } = options;
  const data = toQrData(text);
  const qr = qrcode(0, ecLevel);
  qr.addData(data, qrMode(data));
  qr.make();

  const count = qr.getModuleCount();
  const side = (count + quiet * 2) * scale;
  const pixels = new Uint8ClampedArray(side * side * 4);
  for (let y = 0; y < side; y++) {
    for (let x = 0; x < side; x++) {
      const row = Math.floor(y / scale) - quiet;
      const col = Math.floor(x / scale) - quiet;
      const isDark = row >= 0 && col >= 0 && row < count && col < count && qr.isDark(row, col);
      const i = (y * side + x) * 4;
      pixels[i] = pixels[i + 1] = pixels[i + 2] = isDark ? dark : light;
      pixels[i + 3] = 255;
    }
  }
  return { pixels, side };
}
