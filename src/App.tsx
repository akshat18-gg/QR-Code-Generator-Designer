import { useMemo } from 'react';
import { ColourPanel } from './components/ColourPanel';
import { ContentForm } from './components/ContentForm';
import { ExportBar } from './components/ExportBar';
import { Group } from './components/Group';
import { LogoPanel } from './components/LogoPanel';
import { PatternPanel } from './components/PatternPanel';
import { PresetList } from './components/PresetList';
import { Preview } from './components/Preview';
import { SizePanel } from './components/SizePanel';
import { TypeTabs } from './components/TypeTabs';
import { useDebouncedValue } from './hooks/useDebouncedValue';
import { toQrOptions, type QrSource } from './lib/qrConfig';
import { moduleGeometry } from './lib/style';
import { useEditor } from './state/useEditor';

export default function App() {
  const { state, dispatch, errors, status, qrOptions, preset } = useEditor();
  const { style } = state;

  // Content changes redraw straight away; style changes (slider drags, colour
  // pickers) are debounced. Keying on the primitive parts keeps the source
  // stable while only the style moves.
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
  const previewOptions = useMemo(() => {
    if (!source) return null;
    const previewStyle = { ...debouncedStyle, ecLevel };
    const { modulePx } = moduleGeometry(previewStyle.size, previewStyle.margin, source.moduleCount);
    return modulePx >= 1 ? toQrOptions(source, previewStyle) : null;
  }, [source, debouncedStyle, ecLevel]);

  return (
    <div className="app">
      <header className="masthead">
        <h1 className="wordmark">
          Quiet Zone <span>QR codes that scan</span>
        </h1>
      </header>
      <main className="workspace">
        <div className="controls">
          <Group id="content" title="Content">
            <TypeTabs
              value={state.type}
              onChange={(qrType) => dispatch({ type: 'setType', qrType })}
            >
              <ContentForm state={state} errors={errors} status={status} dispatch={dispatch} />
            </TypeTabs>
          </Group>
          <Group
            id="presets"
            title="Presets"
            aside={<span className="group-aside">{preset ? preset.name : 'Custom'}</span>}
          >
            <PresetList style={style} source={source} activeId={preset?.id} dispatch={dispatch} />
          </Group>
          <Group id="pattern" title="Pattern">
            <PatternPanel style={style} dispatch={dispatch} />
          </Group>
          <Group id="colour" title="Colour">
            <ColourPanel style={style} dispatch={dispatch} />
          </Group>
          <Group id="logo" title="Logo">
            <LogoPanel style={style} dispatch={dispatch} />
          </Group>
          <Group id="size" title="Size">
            <SizePanel style={style} dispatch={dispatch} />
          </Group>
        </div>
        <aside className="output" aria-label="Preview and export">
          <div className="output-inner">
            <Preview status={status} options={previewOptions} style={style} />
            <Group id="export" title="Export">
              <ExportBar type={state.type} status={status} options={qrOptions} />
            </Group>
          </div>
        </aside>
      </main>
    </div>
  );
}
