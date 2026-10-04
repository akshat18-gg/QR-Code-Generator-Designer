import { useMemo } from 'react';
import { ConfirmPopover } from './components/ConfirmPopover';
import { ColourPanel } from './components/ColourPanel';
import { ContentForm } from './components/ContentForm';
import { ExportBar } from './components/ExportBar';
import { Group } from './components/Group';
import { LogoPanel } from './components/LogoPanel';
import { PatternPanel } from './components/PatternPanel';
import { PresetList } from './components/PresetList';
import { ScanCheck } from './components/ScanCheck';
import { Preview } from './components/Preview';
import { RecentList } from './components/RecentList';
import { SizePanel } from './components/SizePanel';
import { ThemeToggle } from './components/ThemeToggle';
import { TypeTabs } from './components/TypeTabs';
import { useDebouncedValue } from './hooks/useDebouncedValue';
import { useRecent } from './hooks/useRecent';
import { useScanCheck } from './hooks/useScanCheck';
import { toQrOptions, type QrSource } from './lib/qrConfig';
import { moduleGeometry } from './lib/style';
import { restoreInputs, type RecentEntry, type RecentItem } from './state/recent';
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

  // The scan check reads back the exact options the export buttons use.
  const payload = status.kind === 'ready' ? status.payload : null;
  const scanInput = useMemo(
    () => (qrOptions && payload !== null ? { options: qrOptions, payload } : null),
    [qrOptions, payload],
  );
  const check = useScanCheck(scanInput);
  const recent = useRecent();

  function saveRecent() {
    if (!qrOptions) return;
    const entry = { type: state.type, input: state.inputs[state.type], style } as RecentEntry;
    void recent.save(entry, qrOptions);
  }

  function loadRecent(item: RecentItem) {
    dispatch({
      type: 'load',
      snapshot: { type: item.type, inputs: restoreInputs(item, state.inputs), style: item.style },
    });
    // On phones the preview is far above the list, so bring it back into view.
    const preview = document.querySelector('.preview');
    if (preview && preview.getBoundingClientRect().bottom < 0) {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      preview.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    }
  }

  return (
    <div className="app">
      <a className="skip-link" href="#output">
        Skip to preview
      </a>
      <header className="masthead">
        <h1 className="wordmark">
          Quiet Zone <span>QR codes that scan</span>
        </h1>
        <ThemeToggle />
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
          <Group
            id="recent"
            title="Recent"
            aside={
              recent.items.length > 0 && (
                <ConfirmPopover
                  label="Clear all"
                  question={`Remove all ${recent.items.length} recent codes? This can't be undone.`}
                  confirmLabel="Remove all"
                  onConfirm={recent.clear}
                />
              )
            }
          >
            <RecentList
              items={recent.items}
              problem={recent.problem}
              onLoad={loadRecent}
              onRemove={recent.remove}
            />
          </Group>
        </div>
        <aside className="output">
          {/* Focusable so keyboard users can scroll it when it's taller than the
              screen; also the skip link's target. */}
          <div className="output-inner" id="output" role="region" aria-label="Preview" tabIndex={0}>
            <Preview status={status} options={previewOptions} style={style} />
            <Group id="export" title="Export">
              <ExportBar
                type={state.type}
                status={status}
                options={qrOptions}
                onExported={saveRecent}
              />
            </Group>
            <ScanCheck status={status} style={style} check={check} dispatch={dispatch} />
          </div>
        </aside>
      </main>
    </div>
  );
}
