import qrcode from 'qrcode-generator';
import type { EcLevel } from './style';

export type QrMode = 'Numeric' | 'Alphanumeric' | 'Byte';

// qr-code-styling bundles its own qrcode-generator, whose default stringToBytes
// keeps only the low byte of each UTF-16 unit, so Tamil, Hindi or emoji come out
// as garbage. We can't swap that function from outside the bundle, so we hand it
// a "binary string" instead: one char per UTF-8 byte. The low-byte step then
// writes exactly the UTF-8 bytes, and scanners decode them back as UTF-8.
export function toQrData(text: string): string {
  let out = '';
  for (const byte of new TextEncoder().encode(text)) out += String.fromCharCode(byte);
  return out;
}

// Same rules qr-code-styling uses when no mode is given. We pick the mode
// ourselves and pass it to both the analysis and the renderer so they agree.
export function qrMode(data: string): QrMode {
  if (/^[0-9]*$/.test(data)) return 'Numeric';
  if (/^[0-9A-Z $%*+\-./:]*$/.test(data)) return 'Alphanumeric';
  return 'Byte';
}

export type Analysis =
  { ok: true; data: string; mode: QrMode; version: number; moduleCount: number } | { ok: false };

export function analyse(payload: string, ecLevel: EcLevel): Analysis {
  const data = toQrData(payload);
  const mode = qrMode(data);
  try {
    const qr = qrcode(0, ecLevel);
    qr.addData(data, mode);
    qr.make();
    const moduleCount = qr.getModuleCount();
    return { ok: true, data, mode, version: (moduleCount - 17) / 4, moduleCount };
  } catch {
    // qrcode-generator throws a plain string ("code length overflow ...") when
    // the data doesn't fit even in version 40.
    return { ok: false };
  }
}

export function overflowMessage(ecLevel: EcLevel): string {
  return ecLevel === 'L'
    ? 'Too much text for one QR code, even at level L. Shorten it.'
    : `Too much text for one QR code at level ${ecLevel}. Shorten it or lower the error correction.`;
}

export const DENSE_VERSION = 10;
