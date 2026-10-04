import type { ReactNode } from 'react';

interface TextFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  hint?: ReactNode;
  optional?: boolean;
  multiline?: boolean;
  type?: 'text' | 'email' | 'tel' | 'password';
  inputMode?: 'text' | 'url' | 'email' | 'tel';
  autoComplete?: string;
  placeholder?: string;
  trailing?: ReactNode;
}

export function TextField({
  id,
  label,
  value,
  onChange,
  onBlur,
  error,
  hint,
  optional = false,
  multiline = false,
  type = 'text',
  inputMode,
  autoComplete = 'off',
  placeholder,
  trailing,
}: TextFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

  const shared = {
    id,
    value,
    placeholder,
    autoComplete,
    onBlur,
    spellCheck: false,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy,
    'aria-required': optional ? undefined : true,
  } as const;

  return (
    <div className="field">
      <label className="label" htmlFor={id}>
        {label}
        {optional && <span className="label-optional">optional</span>}
      </label>
      <div className="input-wrap">
        {multiline ? (
          <textarea
            {...shared}
            className="textarea"
            rows={5}
            onChange={(event) => onChange(event.target.value)}
          />
        ) : (
          <input
            {...shared}
            className="input"
            type={type}
            inputMode={inputMode}
            autoCapitalize="off"
            onChange={(event) => onChange(event.target.value)}
          />
        )}
        {trailing}
      </div>
      {error && (
        <p className="error" id={errorId}>
          {error}
        </p>
      )}
      {hint && (
        <div className="hint" id={hintId}>
          {hint}
        </div>
      )}
    </div>
  );
}
