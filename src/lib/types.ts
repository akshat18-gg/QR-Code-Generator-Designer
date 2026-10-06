export type QrType = 'url' | 'text' | 'email' | 'phone' | 'wifi';

export const QR_TYPES: readonly QrType[] = ['url', 'text', 'email', 'phone', 'wifi'];

export const TYPE_LABELS: Record<QrType, string> = {
  url: 'Link',
  text: 'Text',
  email: 'Email',
  phone: 'Phone',
  wifi: 'Wi-Fi',
};

export const COLOURS = ['blue', 'red', 'yellow', 'green'] as const;
export type Colour = (typeof COLOURS)[number];

// Each type tab owns one of the four colours. Wi-Fi gets all four.
export const TYPE_COLOURS: Record<QrType, Colour | null> = {
  url: 'blue',
  text: 'red',
  email: 'yellow',
  phone: 'green',
  wifi: null,
};

export interface UrlInput {
  url: string;
}

export interface TextInput {
  text: string;
}

export interface EmailInput {
  to: string;
  subject: string;
  body: string;
}

export interface PhoneInput {
  phone: string;
}

export type WifiSecurity = 'WPA' | 'WEP' | 'nopass';

export interface WifiInput {
  ssid: string;
  security: WifiSecurity;
  password: string;
  hidden: boolean;
}

export interface Inputs {
  url: UrlInput;
  text: TextInput;
  email: EmailInput;
  phone: PhoneInput;
  wifi: WifiInput;
}
