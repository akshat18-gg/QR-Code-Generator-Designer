import QRCodeStyling, { type Options } from 'qr-code-styling';

export async function renderBlob(options: Options, extension: 'png' | 'svg'): Promise<Blob> {
  const qr = new QRCodeStyling({ ...options, type: extension === 'svg' ? 'svg' : 'canvas' });
  const raw = await qr.getRawData(extension);
  if (!(raw instanceof Blob)) throw new Error(`Could not render ${extension}`);
  return raw;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  // Give the browser a moment to start the download before freeing the blob.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function canCopyImage(): boolean {
  return typeof ClipboardItem !== 'undefined' && typeof navigator.clipboard?.write === 'function';
}

// Safari only allows clipboard writes that start synchronously inside the click,
// so the ClipboardItem gets a promise of the blob rather than the blob itself.
export function copyPng(options: Options): Promise<void> {
  const item = new ClipboardItem({ 'image/png': renderBlob(options, 'png') });
  return navigator.clipboard.write([item]);
}
