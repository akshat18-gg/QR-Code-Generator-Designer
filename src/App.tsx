import { useMemo } from 'react';
import { ColourPanel } from './components/ColourPanel';
import { ConfirmPopover } from './components/ConfirmPopover';
import { ContentForm } from './components/ContentForm';
import { ExportBar } from './components/ExportBar';
import { Group } from './components/Group';
import { LogoPanel } from './components/LogoPanel';
import { PatternPanel } from './components/PatternPanel';
import { PresetList } from './components/PresetList';
import { Preview } from './components/Preview';
import { RecentList } from './components/RecentList';
import { ScanCheck } from './components/ScanCheck';
import { SizePanel } from './components/SizePanel';
import { ThemeToggle } from './components/ThemeToggle';
import { TypeTabs } from './components/TypeTabs';
import { usePreviewOptions } from './hooks/usePreviewOptions';
import { useRecent } from './hooks/useRecent';
import { useScanCheck } from './hooks/useScanCheck';
import { restoreInputs, type RecentEntry, type RecentItem } from './state/recent';
import { useEditor } from './state/useEditor';

export default function App() {
  const { state, dispatch, errors, status, qrOptions, preset } = useEditor();
  const { style } = state;

  const preview = usePreviewOptions(status, style);

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
    const figure = document.querySelector('.preview');
    if (figure && figure.getBoundingClientRect().bottom < 0) {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      figure.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
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
            <PresetList
              style={style}
              source={preview.source}
              activeId={preset?.id}
              dispatch={dispatch}
            />
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
            <Preview status={status} options={preview.options} style={style} />
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
