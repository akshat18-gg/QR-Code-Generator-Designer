import { useId } from 'react';

interface SegmentedProps<T extends string> {
  legend: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  hint?: string;
  mono?: boolean;
  hideLegend?: boolean;
}

export function Segmented<T extends string>({
  legend,
  value,
  options,
  onChange,
  hint,
  mono = false,
  hideLegend = false,
}: SegmentedProps<T>) {
  const name = useId();
  const hintId = `${name}-hint`;

  return (
    <fieldset
      className={mono ? 'segmented segmented-mono' : 'segmented'}
      aria-describedby={hint ? hintId : undefined}
    >
      <legend className={hideLegend ? 'visually-hidden' : 'label'}>{legend}</legend>
      <div className="segmented-options">
        {options.map((option) => (
          <label className="segmented-option" key={option.value}>
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={option.value === value}
              onChange={() => onChange(option.value)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
      {hint && (
        <p className="hint" id={hintId}>
          {hint}
        </p>
      )}
    </fieldset>
  );
}
