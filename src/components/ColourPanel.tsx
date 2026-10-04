import type { Dispatch } from 'react';
import { cornerDotColour, cornerSquareColour, type GradientKind, type Style } from '../lib/style';
import type { Action } from '../state/editor';
import { ColourField } from './ColourField';
import { Segmented } from './Segmented';
import { Slider } from './Slider';

const GRADIENT_OPTIONS: readonly { value: GradientKind; label: string }[] = [
  { value: 'none', label: 'Off' },
  { value: 'linear', label: 'Linear' },
  { value: 'radial', label: 'Radial' },
];

interface ColourPanelProps {
  style: Style;
  dispatch: Dispatch<Action>;
}

export function ColourPanel({ style, dispatch }: ColourPanelProps) {
  const { gradient } = style;
  const hasGradient = gradient.kind !== 'none';

  return (
    <div className="stack">
      <div className="row">
        <ColourField
          label={hasGradient ? 'Dots, start' : 'Dots'}
          value={style.fg}
          onChange={(fg) => dispatch({ type: 'setStyle', patch: { fg } })}
        />
        <ColourField
          label="Background"
          value={style.bg}
          onChange={(bg) => dispatch({ type: 'setStyle', patch: { bg } })}
        />
        <button
          type="button"
          className="button swap-button"
          onClick={() => dispatch({ type: 'swapColours' })}
        >
          Swap colours
        </button>
      </div>

      <Segmented
        legend="Gradient on dots"
        value={gradient.kind}
        options={GRADIENT_OPTIONS}
        onChange={(kind) => dispatch({ type: 'setGradient', patch: { kind } })}
      />
      {hasGradient && (
        <div className="row">
          <ColourField
            label="Dots, end"
            value={gradient.to}
            onChange={(to) => dispatch({ type: 'setGradient', patch: { to } })}
          />
          {gradient.kind === 'linear' && (
            <Slider
              label="Angle"
              value={gradient.angle}
              min={0}
              max={360}
              step={15}
              format={(angle) => `${angle}°`}
              onChange={(angle) => dispatch({ type: 'setGradient', patch: { angle } })}
            />
          )}
        </div>
      )}

      <div className="row">
        <CornerColour
          label="Corner frames"
          colour={cornerSquareColour(style)}
          custom={style.cornerSquareColor !== null}
          onChange={(cornerSquareColor) =>
            dispatch({ type: 'setStyle', patch: { cornerSquareColor } })
          }
        />
        <CornerColour
          label="Corner centres"
          colour={cornerDotColour(style)}
          custom={style.cornerDotColor !== null}
          onChange={(cornerDotColor) => dispatch({ type: 'setStyle', patch: { cornerDotColor } })}
        />
      </div>
    </div>
  );
}

interface CornerColourProps {
  label: string;
  colour: string;
  custom: boolean;
  onChange: (colour: string | null) => void;
}

// Corners follow the dot colour until the user unticks "Same as dots", so a
// beginner can't end up with mismatched corners by accident.
function CornerColour({ label, colour, custom, onChange }: CornerColourProps) {
  return (
    <div className="field">
      <ColourField label={label} value={colour} disabled={!custom} onChange={onChange} />
      <label className="check">
        <input
          type="checkbox"
          checked={!custom}
          onChange={(event) => onChange(event.target.checked ? null : colour)}
        />
        Same as dots
      </label>
    </div>
  );
}
