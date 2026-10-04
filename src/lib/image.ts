export const LOGO_MAX_BYTES = 2 * 1024 * 1024;

const LOGO_TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/svg+xml': 'svg',
};

// Some systems report an empty MIME type for SVG files, so fall back to the extension.
export function checkLogoFile(file: Pick<File, 'name' | 'size' | 'type'>): string | null {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  const typeOk =
    file.type in LOGO_TYPES ||
    (file.type === '' && ['png', 'jpg', 'jpeg', 'svg'].includes(extension));
  if (!typeOk) return 'Use a PNG, JPG or SVG image.';
  if (file.size > LOGO_MAX_BYTES) return 'That image is over 2 MB. Try a smaller one.';
  return null;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Image failed to load'));
    image.src = src;
  });
}

// Draws the image onto a canvas no bigger than maxSide and returns a PNG data URL.
// Rasterising SVG logos here means the canvas export, the SVG export and the
// stored copy all embed the same pixels, and nothing depends on the original file.
export async function rasterise(src: string, maxSide: number): Promise<string> {
  const image = await loadImage(src);
  // SVGs without width/height attributes report 0 in some browsers.
  const width = image.naturalWidth || maxSide;
  const height = image.naturalHeight || maxSide;
  const scale = Math.min(1, maxSide / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is not available');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png');
}

export async function rasteriseBlob(blob: Blob, maxSide: number): Promise<string> {
  const url = URL.createObjectURL(blob);
  try {
    return await rasterise(url, maxSide);
  } finally {
    URL.revokeObjectURL(url);
  }
}
