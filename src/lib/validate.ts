import { normaliseUrl, stripPhone } from './payload';
import type {
  EmailInput,
  Inputs,
  PhoneInput,
  QrType,
  TextInput,
  UrlInput,
  WifiInput,
} from './types';

export type Errors<T> = Partial<Record<keyof T, string>>;

export function validateUrl({ url }: UrlInput): Errors<UrlInput> {
  if (url.trim() === '') return { url: 'Enter a link.' };
  let parsed: URL;
  try {
    parsed = new URL(normaliseUrl(url));
  } catch {
    return { url: "That doesn't look like a web address." };
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { url: 'Only http and https links work here.' };
  }
  const host = parsed.hostname;
  if (host !== 'localhost' && !host.includes('.') && !host.startsWith('[')) {
    return { url: "That doesn't look like a web address." };
  }
  return {};
}

export function validateText({ text }: TextInput): Errors<TextInput> {
  return text.trim() === '' ? { text: 'Enter some text.' } : {};
}

// Deliberately loose: one @, no spaces, a dot in the domain. Anything stricter
// rejects real addresses, and the mail app does the final check anyway.
const EMAIL = /^[^\s@,;?&]+@[^\s@,;?&]+\.[^\s@,;?&.]{2,}$/;

export function isEmail(value: string): boolean {
  return EMAIL.test(value.trim());
}

export function validateEmail({ to }: EmailInput): Errors<EmailInput> {
  if (to.trim() === '') return { to: 'Enter an email address.' };
  if (!isEmail(to)) return { to: "That doesn't look like an email address." };
  return {};
}

export function validatePhone({ phone }: PhoneInput): Errors<PhoneInput> {
  if (phone.trim() === '') return { phone: 'Enter a phone number.' };
  const stripped = stripPhone(phone);
  if (!/^\+?\d*$/.test(stripped)) {
    return { phone: 'Use digits, spaces and dashes, with + only at the start.' };
  }
  const digits = stripped.replace('+', '').length;
  if (digits < 7 || digits > 15) return { phone: 'Phone numbers have 7 to 15 digits.' };
  return {};
}

const HEX = /^[0-9a-f]+$/i;

export function isValidWepKey(key: string): boolean {
  if (key.length === 5 || key.length === 13) return true;
  return (key.length === 10 || key.length === 26) && HEX.test(key);
}

export function validateWifi({ ssid, security, password }: WifiInput): Errors<WifiInput> {
  const errors: Errors<WifiInput> = {};

  if (ssid === '') errors.ssid = 'Enter the network name.';
  else if (new TextEncoder().encode(ssid).length > 32) {
    errors.ssid = 'Network names can be at most 32 bytes.';
  }

  if (security === 'WPA') {
    if (password === '') errors.password = 'Enter the Wi-Fi password.';
    else if (password.length < 8 || password.length > 63) {
      errors.password = 'WPA passwords are 8 to 63 characters.';
    }
  } else if (security === 'WEP') {
    if (password === '') errors.password = 'Enter the Wi-Fi password.';
    else if (!isValidWepKey(password)) {
      errors.password = 'WEP keys are 5 or 13 characters, or 10 or 26 hex digits.';
    }
  }

  return errors;
}

const validators: { [K in QrType]: (input: Inputs[K]) => Errors<Inputs[K]> } = {
  url: validateUrl,
  text: validateText,
  email: validateEmail,
  phone: validatePhone,
  wifi: validateWifi,
};

export function validate<K extends QrType>(type: K, inputs: Inputs): Errors<Inputs[K]> {
  return validators[type](inputs[type]);
}

export function hasErrors(errors: Errors<object>): boolean {
  return Object.values(errors).some((message) => message !== undefined);
}
