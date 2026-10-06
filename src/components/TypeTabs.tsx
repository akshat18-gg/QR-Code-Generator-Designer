import { useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { QR_TYPES, TYPE_COLOURS, TYPE_LABELS, type QrType } from '../lib/types';

interface TypeTabsProps {
  value: QrType;
  onChange: (type: QrType) => void;
  children: ReactNode;
}

const PANEL_ID = 'content-panel';
// Matches .type-underline's width in the CSS.
const UNDERLINE_PX = 100;

export function TypeTabs({ value, onChange, children }: TypeTabsProps) {
  const refs = useRef<Partial<Record<QrType, HTMLButtonElement | null>>>({});
  const list = useRef<HTMLDivElement>(null);
  const [underline, setUnderline] = useState<{ left: number; width: number } | null>(null);

  // The underline is one element that slides to the selected tab. It's moved
  // with transform so the slide stays on the compositor.
  useLayoutEffect(() => {
    const element = list.current;
    if (!element) return;
    const measure = () => {
      const tab = refs.current[value];
      if (tab) setUnderline({ left: tab.offsetLeft, width: tab.offsetWidth });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    document.fonts.ready.then(measure, () => undefined);
    return () => observer.disconnect();
  }, [value]);

  // Arrow keys, Home and End move between tabs, following the ARIA tabs pattern
  // with automatic activation.
  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const index = QR_TYPES.indexOf(value);
    const last = QR_TYPES.length - 1;
    const next = {
      ArrowRight: index === last ? 0 : index + 1,
      ArrowLeft: index === 0 ? last : index - 1,
      Home: 0,
      End: last,
    }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    const type = QR_TYPES[next];
    if (!type) return;
    onChange(type);
    refs.current[type]?.focus();
  }

  return (
    <div className="stack">
      <div className="type-tabs" role="tablist" aria-label="Code type" ref={list}>
        {QR_TYPES.map((type) => {
          const selected = type === value;
          return (
            <button
              key={type}
              ref={(element) => {
                refs.current[type] = element;
              }}
              id={`tab-${type}`}
              type="button"
              role="tab"
              className="type-tab"
              aria-selected={selected}
              aria-controls={PANEL_ID}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(type)}
              onKeyDown={onKeyDown}
            >
              {TYPE_LABELS[type]}
            </button>
          );
        })}
        {underline && (
          <span
            className="type-underline"
            data-colour={TYPE_COLOURS[value] ?? 'all'}
            aria-hidden="true"
            style={{
              transform: `translateX(${underline.left}px) scaleX(${underline.width / UNDERLINE_PX})`,
            }}
          />
        )}
      </div>
      <div role="tabpanel" id={PANEL_ID} aria-labelledby={`tab-${value}`}>
        {children}
      </div>
    </div>
  );
}
