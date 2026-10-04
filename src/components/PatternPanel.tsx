import type { Dispatch } from 'react';
import {
  CORNER_DOT_STYLES,
  CORNER_SQUARE_STYLES,
  DOT_STYLES,
  EC_LEVELS,
  type CornerDotStyle,
  type CornerSquareStyle,
  type DotStyle,
  type EcLevel,
  type Style,
} from '../lib/style';
import type { Action } from '../state/editor';
import { Segmented } from './Segmented';

const EC_HINTS: Record<EcLevel, string> = {
  L: 'Low: about 7% of the code can be damaged and still scan.',
  M: 'Medium: about 15% of the code can be damaged and still scan.',
  Q: 'Quartile: about 25% of the code can be damaged and still scan.',
  H: 'High: about 30% of the code can be damaged and still scan. Best with a logo.',
};

const DOT_LABELS: Record<DotStyle, string> = {
  square: 'Square',
  rounded: 'Rounded',
  dots: 'Dots',
  classy: 'Classy',
  'extra-rounded': 'Extra round',
};

const CORNER_SQUARE_LABELS: Record<CornerSquareStyle, string> = {
  square: 'Square',
  'extra-rounded': 'Rounded',
  dot: 'Circle',
};

const CORNER_DOT_LABELS: Record<CornerDotStyle, string> = {
  square: 'Square',
  dot: 'Circle',
};

function options<T extends string>(values: readonly T[], labels: Record<T, string>) {
  return values.map((value) => ({ value, label: labels[value] }));
}

interface PatternPanelProps {
  style: Style;
  dispatch: Dispatch<Action>;
}

export function PatternPanel({ style, dispatch }: PatternPanelProps) {
  return (
    <div className="stack">
      <Segmented
        legend="Error correction"
        mono
        value={style.ecLevel}
        options={EC_LEVELS.map((level) => ({ value: level, label: level }))}
        hint={EC_HINTS[style.ecLevel]}
        onChange={(ecLevel) => dispatch({ type: 'setStyle', patch: { ecLevel } })}
      />
      <Segmented
        legend="Dots"
        value={style.dotStyle}
        options={options(DOT_STYLES, DOT_LABELS)}
        onChange={(dotStyle) => dispatch({ type: 'setStyle', patch: { dotStyle } })}
      />
      <div className="row">
        <Segmented
          legend="Corner frames"
          value={style.cornerSquareStyle}
          options={options(CORNER_SQUARE_STYLES, CORNER_SQUARE_LABELS)}
          onChange={(cornerSquareStyle) =>
            dispatch({ type: 'setStyle', patch: { cornerSquareStyle } })
          }
        />
        <Segmented
          legend="Corner centres"
          value={style.cornerDotStyle}
          options={options(CORNER_DOT_STYLES, CORNER_DOT_LABELS)}
          onChange={(cornerDotStyle) => dispatch({ type: 'setStyle', patch: { cornerDotStyle } })}
        />
      </div>
    </div>
  );
}
