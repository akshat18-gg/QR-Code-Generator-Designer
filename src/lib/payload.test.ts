import { describe, expect, it } from 'vitest';
import {
  buildEmail,
  buildPayload,
  buildPhone,
  buildText,
  buildUrl,
  buildWifi,
  escapeWifi,
  normaliseUrl,
} from './payload';
import type { Inputs } from './types';

describe('normaliseUrl', () => {
  it('adds https:// when there is no scheme', () => {
    expect(normaliseUrl('example.com')).toBe('https://example.com');
    expect(normaliseUrl('example.com/path?q=1')).toBe('https://example.com/path?q=1');
  });

  it('keeps an existing scheme', () => {
    expect(normaliseUrl('http://example.com')).toBe('http://example.com');
    expect(normaliseUrl('HTTPS://Example.com')).toBe('HTTPS://Example.com');
  });

  it('trims whitespace and leaves empty input empty', () => {
    expect(normaliseUrl('  example.com  ')).toBe('https://example.com');
    expect(normaliseUrl('   ')).toBe('');
  });

  it('does not treat a port as a scheme', () => {
    expect(normaliseUrl('localhost:5173')).toBe('https://localhost:5173');
  });
});

describe('buildUrl', () => {
  it('returns the normalised url', () => {
    expect(buildUrl({ url: 'gdg.community.dev' })).toBe('https://gdg.community.dev');
  });
});

describe('buildText', () => {
  it('passes text through unchanged, including non-English text and emoji', () => {
    const text = 'வணக்கம் नमस्ते 😀\nline two';
    expect(buildText({ text })).toBe(text);
  });
});

describe('buildEmail', () => {
  it('builds a bare mailto when subject and body are empty', () => {
    expect(buildEmail({ to: 'a@b.co', subject: '', body: '' })).toBe('mailto:a@b.co');
  });

  it('encodes subject and body with encodeURIComponent', () => {
    expect(buildEmail({ to: 'a@b.co', subject: 'Hi & bye?', body: 'x=1 #2' })).toBe(
      'mailto:a@b.co?subject=Hi%20%26%20bye%3F&body=x%3D1%20%232',
    );
  });

  it('includes only the body when there is no subject', () => {
    expect(buildEmail({ to: 'a@b.co', subject: '', body: 'hello' })).toBe(
      'mailto:a@b.co?body=hello',
    );
  });

  it('turns line breaks into CRLF', () => {
    expect(buildEmail({ to: 'a@b.co', subject: '', body: 'one\ntwo\r\nthree' })).toBe(
      'mailto:a@b.co?body=one%0D%0Atwo%0D%0Athree',
    );
  });

  it('encodes UTF-8 subjects', () => {
    expect(buildEmail({ to: 'a@b.co', subject: 'नमस्ते 😀', body: '' })).toBe(
      `mailto:a@b.co?subject=${encodeURIComponent('नमस्ते 😀')}`,
    );
  });

  it('trims the address', () => {
    expect(buildEmail({ to: '  a@b.co ', subject: '', body: '' })).toBe('mailto:a@b.co');
  });
});

describe('buildPhone', () => {
  it('strips spaces and dashes', () => {
    expect(buildPhone({ phone: '+91 98765-43210' })).toBe('tel:+919876543210');
    expect(buildPhone({ phone: ' 044 2222 3333 ' })).toBe('tel:04422223333');
  });
});

describe('escapeWifi', () => {
  it('escapes backslash, semicolon, comma, colon and double quote', () => {
    expect(escapeWifi(String.raw`a\b;c,d:e"f`)).toBe(String.raw`a\\b\;c\,d\:e\"f`);
  });

  it('leaves other characters alone', () => {
    expect(escapeWifi("Café 5G's net")).toBe("Café 5G's net");
  });
});

describe('buildWifi', () => {
  it('builds a WPA network', () => {
    expect(buildWifi({ ssid: 'Home', security: 'WPA', password: 'secret123', hidden: false })).toBe(
      'WIFI:T:WPA;S:Home;P:secret123;H:false;;',
    );
  });

  it('builds a WEP hidden network', () => {
    expect(buildWifi({ ssid: 'Lab', security: 'WEP', password: 'abcde', hidden: true })).toBe(
      'WIFI:T:WEP;S:Lab;P:abcde;H:true;;',
    );
  });

  it('omits the password for open networks even if one was typed', () => {
    expect(
      buildWifi({ ssid: 'Cafe', security: 'nopass', password: 'left over', hidden: false }),
    ).toBe('WIFI:T:nopass;S:Cafe;H:false;;');
  });

  it('escapes special characters in SSID and password', () => {
    expect(
      buildWifi({ ssid: 'My;Net', security: 'WPA', password: 'p:a,s"s\\', hidden: false }),
    ).toBe(String.raw`WIFI:T:WPA;S:My\;Net;P:p\:a\,s\"s\\;H:false;;`);
  });
});

describe('buildPayload', () => {
  const inputs: Inputs = {
    url: { url: 'example.com' },
    text: { text: 'hello' },
    email: { to: 'a@b.co', subject: '', body: '' },
    phone: { phone: '+1 555-0100-200' },
    wifi: { ssid: 'Home', security: 'WPA', password: 'secret123', hidden: false },
  };

  it('dispatches to the builder for the selected type', () => {
    expect(buildPayload('url', inputs)).toBe('https://example.com');
    expect(buildPayload('text', inputs)).toBe('hello');
    expect(buildPayload('email', inputs)).toBe('mailto:a@b.co');
    expect(buildPayload('phone', inputs)).toBe('tel:+15550100200');
    expect(buildPayload('wifi', inputs)).toBe('WIFI:T:WPA;S:Home;P:secret123;H:false;;');
  });
});
