import { useMemo, useRef, type Dispatch } from 'react';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useQrSvg } from '../hooks/useQrSvg';
import { toQrOptions, type QrSource } from '../lib/qrConfig';
import { analyse } from '../lib/qrData';
import { moduleGeometry, type EcLevel, type Style } from '../lib/style';
import { DEFAULT_STYLE, type Action } from '../state/editor';
import { PRESETS, type Preset } from '../state/presets';

interface PresetListProps {
  style: Style;
  source: QrSource | null;
  activeId: string | undefined;
  dispatch: Dispatch<Action>;
}

const THUMB_SIZE = 96;
const SAMPLE = analyse('QRaft', 'M');
const SAMPLE_SOURCE: QrSource | null = SAMPLE.ok ? SAMPLE : null;

export function PresetList({ style, source, activeId, dispatch }: PresetListProps) {
  const { margin, ecLevel } = style;
  // Thumbnails show the user's own content when it fits in a tiny image, and a
  // sample otherwise. They're decorative, so they can lag well behind typing.
  // Everything they draw from is debounced together so it always matches up.
  const thumb = useDebouncedValue(
    useMemo(() => {
      const fits = source && moduleGeometry(THUMB_SIZE, margin, source.moduleCount).modulePx >= 1;
      return { source: fits ? source : SAMPLE_SOURCE, margin, ecLevel };
    }, [source, margin, ecLevel]),
    300,
  );

  return (
    <ul className="preset-list">
      {PRESETS.map((preset) => (
        <li key={preset.id}>
          <button
            type="button"
            className="preset"
            aria-pressed={preset.id === activeId}
            onClick={() => dispatch({ type: 'applyPreset', look: preset.look })}
          >
            <PresetThumb preset={preset} {...thumb} />
            <span>{preset.name}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

interface PresetThumbProps {
  preset: Preset;
  margin: number;
  ecLevel: EcLevel;
  source: QrSource | null;
}

function PresetThumb({ preset, margin, ecLevel, source }: PresetThumbProps) {
  const ref = useRef<HTMLDivElement>(null);
  const options = useMemo(
    () =>
      source
        ? toQrOptions(source, { ...DEFAULT_STYLE, ...preset.look, margin, ecLevel }, THUMB_SIZE)
        : null,
    [source, preset, margin, ecLevel],
  );
  useQrSvg(ref, options);
  return <div className="preset-thumb" ref={ref} aria-hidden="true" />;
}
