import { buildPayload } from './payload';
import { analyse, overflowMessage } from './qrData';
import type { QrSource } from './qrConfig';
import { moduleGeometry, type Style } from './style';
import type { Inputs, QrType } from './types';

export type QrStatus =
  | { kind: 'empty'; message: string }
  | { kind: 'invalid'; message: string }
  | { kind: 'overflow'; message: string }
  | { kind: 'too-small'; message: string }
  | { kind: 'ready'; payload: string; source: QrSource; version: number };

const EMPTY_MESSAGES: Record<QrType, string> = {
  url: 'Type a link to see its code.',
  text: 'Type some text to see its code.',
  email: 'Enter an email address to see its code.',
  phone: 'Enter a phone number to see its code.',
  wifi: 'Enter the network details to see its code.',
};

function isEmpty(type: QrType, inputs: Inputs): boolean {
  switch (type) {
    case 'url':
      return inputs.url.url.trim() === '';
    case 'text':
      return inputs.text.text === '';
    case 'email':
      return inputs.email.to.trim() === '';
    case 'phone':
      return inputs.phone.phone.trim() === '';
    case 'wifi':
      return inputs.wifi.ssid === '' && inputs.wifi.password === '';
  }
}

export function deriveStatus(
  type: QrType,
  inputs: Inputs,
  style: Style,
  errors: Partial<Record<string, string>>,
): QrStatus {
  if (isEmpty(type, inputs)) return { kind: 'empty', message: EMPTY_MESSAGES[type] };

  const firstError = Object.values(errors).find((message) => message !== undefined);
  if (firstError !== undefined) return { kind: 'invalid', message: firstError };

  const payload = buildPayload(type, inputs);
  const analysis = analyse(payload, style.ecLevel);
  if (!analysis.ok) return { kind: 'overflow', message: overflowMessage(style.ecLevel) };

  const { data, mode, moduleCount, version } = analysis;
  if (moduleGeometry(style.size, style.margin, moduleCount).modulePx < 1) {
    return {
      kind: 'too-small',
      message: `This needs ${moduleCount} modules across, more than fit in ${style.size} px. Make the image bigger or shorten the content.`,
    };
  }

  return { kind: 'ready', payload, source: { data, mode, moduleCount }, version };
}
