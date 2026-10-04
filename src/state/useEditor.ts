import { useMemo, useReducer } from 'react';
import { toQrOptions } from '../lib/qrConfig';
import { deriveStatus } from '../lib/status';
import { validate } from '../lib/validate';
import { editorReducer, INITIAL_STATE } from './editor';
import { activePreset } from './presets';

export function useEditor() {
  const [state, dispatch] = useReducer(editorReducer, INITIAL_STATE);
  const { type, inputs, style } = state;

  const errors = useMemo(() => validate(type, inputs), [type, inputs]);
  const status = useMemo(
    () => deriveStatus(type, inputs, style, errors),
    [type, inputs, style, errors],
  );
  const qrOptions = useMemo(
    () => (status.kind === 'ready' ? toQrOptions(status.source, style) : null),
    [status, style],
  );
  const preset = useMemo(() => activePreset(style), [style]);

  return { state, dispatch, errors, status, qrOptions, preset };
}
