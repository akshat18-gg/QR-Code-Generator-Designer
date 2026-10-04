import type { TypedInput } from './helpers';

// One or more realistic inputs per QR type, shared by the type and preset specs.
export const TYPE_CASES: { name: string; input: TypedInput }[] = [
  {
    name: 'bare domain gets https',
    input: { type: 'url', values: { url: 'gdg.community.dev/srm' } },
  },
  {
    name: 'plain text',
    input: { type: 'text', values: { text: 'Meet at the TP Ganesan auditorium, 5pm' } },
  },
  {
    name: 'Tamil, Hindi and emoji',
    input: { type: 'text', values: { text: 'வணக்கம் · नमस्ते · 😀' } },
  },
  {
    name: 'subject and body',
    input: {
      type: 'email',
      values: { to: 'gdg@srmist.edu.in', subject: 'Hi & welcome?', body: 'Line one\nLine two' },
    },
  },
  { name: 'spaces and dashes', input: { type: 'phone', values: { phone: '+91 98765-43210' } } },
  {
    name: 'WPA with characters that need escaping',
    input: {
      type: 'wifi',
      values: { ssid: 'SRM;Lab:2', security: 'WPA', password: 'p@ss,"word"\\1', hidden: true },
    },
  },
  {
    name: 'WEP hex key',
    input: {
      type: 'wifi',
      values: { ssid: 'Old router', security: 'WEP', password: '0123456789', hidden: false },
    },
  },
  {
    name: 'open network',
    input: {
      type: 'wifi',
      values: { ssid: 'Guest', security: 'nopass', password: '', hidden: false },
    },
  },
];
