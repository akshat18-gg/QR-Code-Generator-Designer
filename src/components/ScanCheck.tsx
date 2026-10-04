import type { Dispatch } from 'react';
import type { ScanCheckState } from '../hooks/useScanCheck';
import type { DecodeResult } from '../lib/scanCheck';
import { scanHints, scanStatus, SMALL_SIZE, type Hint, type ScanStatus } from '../lib/scanRules';
import type { QrStatus } from '../lib/status';
import type { Style } from '../lib/style';
import type { Action } from '../state/editor';

interface ScanCheckProps {
  status: QrStatus;
  style: Style;
  check: ScanCheckState;
  dispatch: Dispatch<Action>;
}

const BADGE: Record<ScanStatus, string> = { pass: 'Pass', warn: 'Warning', fail: 'Fail' };

function summary(state: ScanStatus, decode: DecodeResult): string {
  if (decode.full === 'mismatch') return 'It scanned, but read back the wrong text.';
  if (decode.full === 'unreadable') return "Our scanner couldn't read this code.";
  if (decode.small !== 'pass' && decode.small !== 'skipped') {
    return `Reads at full size, but not when shrunk to ${SMALL_SIZE} px.`;
  }
  if (state === 'warn')
    return 'Reads back correctly, but a few settings could trip up other scanners.';
  return decode.small === 'pass'
    ? `Reads back correctly at full size and at ${SMALL_SIZE} px.`
    : 'Reads back correctly.';
}

export function ScanCheck({ status, style, check, dispatch }: ScanCheckProps) {
  const ready = status.kind === 'ready';
  const { decode, checking } = check;
  const hints: Hint[] = ready
    ? scanHints(style, { moduleCount: status.source.moduleCount, version: status.version }, decode)
    : [];
  const state = ready && decode ? scanStatus(decode, hints) : null;

  let badge = '';
  if (ready) badge = checking || !state ? 'Checking' : BADGE[state];

  return (
    <section
      className="group scan"
      aria-labelledby="scan-title"
      aria-busy={checking}
      data-checking={checking || undefined}
      data-state={state ?? undefined}
    >
      <div className="group-head">
        <h2 className="group-title" id="scan-title">
          Scan check
        </h2>
        {badge && (
          <span className={`scan-badge is-${checking || !state ? 'checking' : state}`}>
            {badge}
          </span>
        )}
      </div>
      <p className="scan-summary" role="status">
        {!ready
          ? 'Nothing to check yet.'
          : decode && state
            ? summary(state, decode)
            : 'Reading the code back…'}
      </p>
      {hints.length > 0 && (
        <ul className="scan-hints">
          {hints.map((hint) => (
            <li key={hint.id + hint.text}>
              <p>{hint.text}</p>
              {hint.fix && (
                <button
                  type="button"
                  className="button"
                  onClick={() => {
                    if (hint.fix) dispatch({ type: 'patchStyle', patch: hint.fix.patch });
                  }}
                >
                  {hint.fix.label}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
