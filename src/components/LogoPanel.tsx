import { useId, useState, type ChangeEvent, type Dispatch } from 'react';
import { checkLogoFile, readLogo } from '../lib/image';
import { EC_RECOVERY, type Style } from '../lib/style';
import type { Action } from '../state/editor';
import { Slider } from './Slider';

interface LogoPanelProps {
  style: Style;
  dispatch: Dispatch<Action>;
}

export function LogoPanel({ style, dispatch }: LogoPanelProps) {
  const id = useId();
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const { logo, ecLevel } = style;

  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const input = event.target;
    const file = input.files?.[0];
    // Clear the input so picking the same file again still fires a change.
    input.value = '';
    if (!file) return;

    const problem = checkLogoFile(file);
    setError(problem);
    if (problem) return;

    setReading(true);
    try {
      const src = await readLogo(file);
      dispatch({ type: 'setLogo', patch: { src, name: file.name } });
    } catch {
      setError("Couldn't read that image. Try another file.");
    } finally {
      setReading(false);
    }
  }

  return (
    <div className="stack">
      <div className="logo-pick">
        {logo.src && <img className="logo-thumb" src={logo.src} alt="" width={44} height={44} />}
        <input
          id={id}
          className="visually-hidden file-input"
          type="file"
          accept="image/png,image/jpeg,image/svg+xml,.svg"
          aria-describedby={`${id}-hint${error ? ` ${id}-error` : ''}`}
          onChange={onFile}
        />
        <label className="button" htmlFor={id}>
          {logo.src ? 'Replace logo' : 'Upload logo'}
        </label>
        {logo.src && (
          <button
            type="button"
            className="button button-quiet"
            onClick={() => {
              setError(null);
              dispatch({ type: 'clearLogo' });
            }}
          >
            Remove
          </button>
        )}
      </div>
      <p className="hint" id={`${id}-hint`}>
        {reading
          ? 'Reading image…'
          : logo.src
            ? logo.name
            : 'PNG, JPG or SVG, up to 2 MB. Sits in the middle of the code.'}
      </p>
      {error && (
        <p className="error" id={`${id}-error`} role="alert">
          {error}
        </p>
      )}

      {logo.src && (
        <>
          <div className="row">
            <Slider
              label="Logo size"
              value={logo.size}
              min={0.1}
              max={0.8}
              step={0.05}
              // imageSize is a share of what error correction can repair, so the
              // area the logo actually covers depends on the level too.
              format={(size) => `${Math.round(size * EC_RECOVERY[ecLevel] * 100)}% of code`}
              onChange={(size) => dispatch({ type: 'setLogo', patch: { size } })}
            />
            <Slider
              label="Logo padding"
              value={logo.margin}
              min={0}
              max={3}
              format={(margin) => `${margin} ${margin === 1 ? 'module' : 'modules'}`}
              onChange={(margin) => dispatch({ type: 'setLogo', patch: { margin } })}
            />
          </div>
          <label className="check">
            <input
              type="checkbox"
              checked={logo.hideDots}
              onChange={(event) =>
                dispatch({ type: 'setLogo', patch: { hideDots: event.target.checked } })
              }
            />
            Clear the dots behind the logo
          </label>
        </>
      )}
    </div>
  );
}
