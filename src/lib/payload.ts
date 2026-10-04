import type {
  EmailInput,
  Inputs,
  PhoneInput,
  QrType,
  TextInput,
  UrlInput,
  WifiInput,
} from './types';

const HAS_SCHEME = /^[a-z][a-z\d+.-]*:\/\//i;

export function normaliseUrl(raw: string): string {
  const url = raw.trim();
  if (url === '') return '';
  return HAS_SCHEME.test(url) ? url : `https://${url}`;
}

export function buildUrl({ url }: UrlInput): string {
  return normaliseUrl(url);
}

export function buildText({ text }: TextInput): string {
  return text;
}

export function buildEmail({ to, subject, body }: EmailInput): string {
  const params: string[] = [];
  if (subject !== '') params.push(`subject=${encodeURIComponent(subject)}`);
  // RFC 6068 asks for CRLF line breaks in mailto bodies; some mail apps drop bare LFs.
  if (body !== '') params.push(`body=${encodeURIComponent(body.replace(/\r?\n/g, '\r\n'))}`);
  const query = params.length > 0 ? `?${params.join('&')}` : '';
  return `mailto:${to.trim()}${query}`;
}

export function stripPhone(phone: string): string {
  return phone.trim().replace(/[\s-]/g, '');
}

export function buildPhone({ phone }: PhoneInput): string {
  return `tel:${stripPhone(phone)}`;
}

// The WIFI: format uses ; , : as separators and " for quoting, so these (and the
// backslash itself) must be escaped in the SSID and password or scanners split the
// value in the wrong place. Backslash goes first so we don't double-escape.
export function escapeWifi(value: string): string {
  return value.replace(/[\\;,:"]/g, (ch) => `\\${ch}`);
}

export function buildWifi({ ssid, security, password, hidden }: WifiInput): string {
  const pass = security === 'nopass' ? '' : `P:${escapeWifi(password)};`;
  return `WIFI:T:${security};S:${escapeWifi(ssid)};${pass}H:${hidden};;`;
}

const builders: { [K in QrType]: (input: Inputs[K]) => string } = {
  url: buildUrl,
  text: buildText,
  email: buildEmail,
  phone: buildPhone,
  wifi: buildWifi,
};

export function buildPayload<K extends QrType>(type: K, inputs: Inputs): string {
  return builders[type](inputs[type]);
}
