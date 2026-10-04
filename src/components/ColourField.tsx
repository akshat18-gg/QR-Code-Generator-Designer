import { useId, useState } from 'react';
import { normaliseHex } from '../lib/colour';

interface ColourFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function ColourField({ label, value, onChange, disabled = false }: ColourFieldProps) {
  const id = useId();
  const [draft, setDraft] = useState(value);
  const [synced, setSynced] = useState(value);
  const [touched, setTouched] = useState(false);

  // Keep the text box in step when the colour changes from outside
  // (picker, swap button, preset) without fighting the user while they type.
  if (value !== synced) {
    setSynced(value);
    setDraft(value);
  }

  const invalid = normaliseHex(draft) === null;
  const error = touched && invalid ? 'Use a hex colour like #1a1916.' : undefined;

  return (
    <div className="field">
      <label className="label" htmlFor={`${id}-hex`}>
        {label}
      </label>
      <div className="colour-row">
        <input
          type="color"
          aria-label={`${label} picker`}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        />
        <input
          id={`${id}-hex`}
          className="input mono"
          value={draft}
          disabled={disabled}
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="off"
          maxLength={7}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(event) => {
            setDraft(event.target.value);
            const hex = normaliseHex(event.target.value);
            if (hex && hex !== value) {
              setSynced(hex);
              onChange(hex);
            }
          }}
          onBlur={() => {
            setTouched(true);
            const hex = normaliseHex(draft);
            if (hex) setDraft(hex);
          }}
        />
      </div>
      {error && (
        <p className="error" id={`${id}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}
