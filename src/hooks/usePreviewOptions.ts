import type { Options } from 'qr-code-styling';
import { useMemo } from 'react';
import { toQrOptions, type QrSource } from '../lib/qrConfig';
import type { QrStatus } from '../lib/status';
import { moduleGeometry, type Style } from '../lib/style';
import { useDebouncedValue } from './useDebouncedValue';

// Content changes redraw straight away; style changes (slider drags, colour
// pickers) are debounced. Keying on the primitive parts keeps the source stable
// while only the style moves.
export function usePreviewOptions(status: QrStatus, style: Style) {
  const ready = status.kind === 'ready' ? status.source : null;
  const data = ready?.data;
  const mode = ready?.mode;
  const moduleCount = ready?.moduleCount;
  const source = useMemo<QrSource | null>(
    () => (data && mode && moduleCount ? { data, mode, moduleCount } : null),
    [data, mode, moduleCount],
  );

  const debouncedStyle = useDebouncedValue(style, 80);
  // Error correction is never debounced: the source was measured at the current
  // level, and drawing it at a stale one can overflow.
  const ecLevel = style.ecLevel;
  const options = useMemo<Options | null>(() => {
    if (!source) return null;
    const previewStyle = { ...debouncedStyle, ecLevel };
    const { modulePx } = moduleGeometry(previewStyle.size, previewStyle.margin, source.moduleCount);
    return modulePx >= 1 ? toQrOptions(source, previewStyle) : null;
  }, [source, debouncedStyle, ecLevel]);

  return { source, options };
}
