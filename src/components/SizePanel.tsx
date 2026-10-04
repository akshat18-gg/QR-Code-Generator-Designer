import type { Dispatch } from 'react';
import { MARGIN_MAX, SIZE_MAX, SIZE_MIN, type Style } from '../lib/style';
import type { Action } from '../state/editor';
import { Slider } from './Slider';

interface SizePanelProps {
  style: Style;
  dispatch: Dispatch<Action>;
}

export function SizePanel({ style, dispatch }: SizePanelProps) {
  return (
    <div className="row">
      <Slider
        label="Image size"
        value={style.size}
        min={SIZE_MIN}
        max={SIZE_MAX}
        step={16}
        format={(size) => `${size} px`}
        hint="Size of the downloaded file. The preview is scaled to fit."
        onChange={(size) => dispatch({ type: 'setStyle', patch: { size } })}
      />
      <Slider
        label="Margin"
        value={style.margin}
        min={0}
        max={MARGIN_MAX}
        format={(margin) => `${margin} ${margin === 1 ? 'module' : 'modules'}`}
        hint="The blank border scanners need. 4 is the standard."
        onChange={(margin) => dispatch({ type: 'setStyle', patch: { margin } })}
      />
    </div>
  );
}
