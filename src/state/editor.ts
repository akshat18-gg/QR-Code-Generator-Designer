import { NO_LOGO, type Gradient, type Logo, type Style } from '../lib/style';
import type { Inputs, QrType } from '../lib/types';
import { NEWSPRINT, type PresetLook } from './presets';

export interface EditorState {
  type: QrType;
  inputs: Inputs;
  // Keys look like "email.to". A field shows its error only once it's in here.
  touched: Record<string, true>;
  style: Style;
}

export type Snapshot = Pick<EditorState, 'type' | 'inputs' | 'style'>;

type SetInput = {
  [K in QrType]: { type: 'setInput'; qrType: K; patch: Partial<Inputs[K]> };
}[QrType];

export type Action =
  | { type: 'setType'; qrType: QrType }
  | SetInput
  | { type: 'touch'; field: string }
  | { type: 'setStyle'; patch: Partial<Omit<Style, 'gradient' | 'logo'>> }
  | { type: 'setGradient'; patch: Partial<Gradient> }
  | { type: 'setLogo'; patch: Partial<Logo> }
  | { type: 'clearLogo' }
  | { type: 'swapColours' }
  | { type: 'applyPreset'; look: PresetLook }
  | { type: 'load'; snapshot: Snapshot };

export const EMPTY_INPUTS: Inputs = {
  url: { url: '' },
  text: { text: '' },
  email: { to: '', subject: '', body: '' },
  phone: { phone: '' },
  wifi: { ssid: '', security: 'WPA', password: '', hidden: false },
};

export const DEFAULT_STYLE: Style = {
  ...NEWSPRINT.look,
  size: 512,
  margin: 4,
  ecLevel: 'M',
  logo: NO_LOGO,
};

export const INITIAL_STATE: EditorState = {
  type: 'url',
  inputs: EMPTY_INPUTS,
  touched: {},
  style: DEFAULT_STYLE,
};

export function editorReducer(state: EditorState, action: Action): EditorState {
  switch (action.type) {
    case 'setType':
      return { ...state, type: action.qrType };
    case 'setInput':
      return {
        ...state,
        inputs: {
          ...state.inputs,
          [action.qrType]: { ...state.inputs[action.qrType], ...action.patch },
        },
      };
    case 'touch':
      if (state.touched[action.field]) return state;
      return { ...state, touched: { ...state.touched, [action.field]: true } };
    case 'setStyle':
      return { ...state, style: { ...state.style, ...action.patch } };
    case 'setGradient':
      return {
        ...state,
        style: { ...state.style, gradient: { ...state.style.gradient, ...action.patch } },
      };
    case 'setLogo':
      return {
        ...state,
        style: { ...state.style, logo: { ...state.style.logo, ...action.patch } },
      };
    case 'clearLogo':
      return { ...state, style: { ...state.style, logo: NO_LOGO } };
    case 'swapColours':
      return { ...state, style: { ...state.style, fg: state.style.bg, bg: state.style.fg } };
    case 'applyPreset':
      return { ...state, style: { ...state.style, ...action.look } };
    case 'load':
      return { ...action.snapshot, touched: {} };
  }
}
