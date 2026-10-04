import { describe, expect, it } from 'vitest';
import type { WifiInput } from './types';
import {
  hasErrors,
  isEmail,
  isValidWepKey,
  validate,
  validateEmail,
  validatePhone,
  validateText,
  validateUrl,
  validateWifi,
} from './validate';

describe('validateUrl', () => {
  it.each([
    'example.com',
    'https://example.com',
    'http://sub.example.co.in/a?b=c#d',
    'localhost:5173',
  ])('accepts %s', (url) => {
    expect(validateUrl({ url })).toEqual({});
  });

  it('asks for a link when empty', () => {
    expect(validateUrl({ url: '  ' })).toEqual({ url: 'Enter a link.' });
  });

  it.each(['hello world', 'justaword', 'https://', 'javascript:alert(1)'])('rejects %s', (url) => {
    expect(validateUrl({ url }).url).toBe("That doesn't look like a web address.");
  });

  it('rejects schemes other than http and https', () => {
    expect(validateUrl({ url: 'ftp://example.com' })).toEqual({
      url: 'Only http and https links work here.',
    });
  });
});

describe('validateText', () => {
  it('accepts text', () => {
    expect(validateText({ text: 'வணக்கம்' })).toEqual({});
  });

  it('rejects empty or whitespace-only text', () => {
    expect(validateText({ text: '' })).toEqual({ text: 'Enter some text.' });
    expect(validateText({ text: ' \n ' })).toEqual({ text: 'Enter some text.' });
  });
});

describe('validateEmail', () => {
  it.each(['a@b.co', 'first.last+tag@uni.srmist.edu.in', ' padded@example.com '])(
    'accepts %s',
    (to) => {
      expect(isEmail(to)).toBe(true);
      expect(validateEmail({ to, subject: '', body: '' })).toEqual({});
    },
  );

  it('asks for an address when empty', () => {
    expect(validateEmail({ to: '', subject: 'x', body: 'y' })).toEqual({
      to: 'Enter an email address.',
    });
  });

  it.each([
    'plainaddress',
    'a@b',
    'a@b.c',
    'a b@c.com',
    'a@@b.com',
    'a@b.com,c@d.com',
    'a@b.com?cc=x',
  ])('rejects %s', (to) => {
    expect(validateEmail({ to, subject: '', body: '' })).toEqual({
      to: "That doesn't look like an email address.",
    });
  });
});

describe('validatePhone', () => {
  it.each(['+91 98765 43210', '044-2222-3333', '1234567', '+123456789012345'])(
    'accepts %s',
    (phone) => {
      expect(validatePhone({ phone })).toEqual({});
    },
  );

  it('asks for a number when empty', () => {
    expect(validatePhone({ phone: '' })).toEqual({ phone: 'Enter a phone number.' });
  });

  it.each(['123-abc-4567', '98765+43210', '(044) 2222 3333', '++911234567'])(
    'rejects characters in %s',
    (phone) => {
      expect(validatePhone({ phone }).phone).toBe(
        'Use digits, spaces and dashes, with + only at the start.',
      );
    },
  );

  it.each(['123456', '+1234567890123456'])('rejects the digit count of %s', (phone) => {
    expect(validatePhone({ phone }).phone).toBe('Phone numbers have 7 to 15 digits.');
  });
});

describe('isValidWepKey', () => {
  it.each(['abcde', 'abcdefghijklm', '0123456789', 'ABCDEF0123456789abcdef0123'])(
    'accepts %s',
    (key) => {
      expect(isValidWepKey(key)).toBe(true);
    },
  );

  it.each(['abcd', 'abcdef', 'ghijklmnop', '0123456789abcdef0123456789a'])('rejects %s', (key) => {
    expect(isValidWepKey(key)).toBe(false);
  });
});

describe('validateWifi', () => {
  const base: WifiInput = { ssid: 'Home', security: 'WPA', password: 'secret123', hidden: false };

  it('accepts a valid WPA network', () => {
    expect(validateWifi(base)).toEqual({});
  });

  it('requires a network name', () => {
    expect(validateWifi({ ...base, ssid: '' })).toEqual({ ssid: 'Enter the network name.' });
  });

  it('limits the network name to 32 bytes, counting UTF-8', () => {
    expect(validateWifi({ ...base, ssid: 'a'.repeat(32) })).toEqual({});
    expect(validateWifi({ ...base, ssid: 'வ'.repeat(11) }).ssid).toBe(
      'Network names can be at most 32 bytes.',
    );
  });

  it('checks WPA password length', () => {
    expect(validateWifi({ ...base, password: '' }).password).toBe('Enter the Wi-Fi password.');
    expect(validateWifi({ ...base, password: '1234567' }).password).toBe(
      'WPA passwords are 8 to 63 characters.',
    );
    expect(validateWifi({ ...base, password: 'x'.repeat(63) })).toEqual({});
    expect(validateWifi({ ...base, password: 'x'.repeat(64) }).password).toBe(
      'WPA passwords are 8 to 63 characters.',
    );
  });

  it('checks WEP keys', () => {
    expect(validateWifi({ ...base, security: 'WEP', password: 'abcde' })).toEqual({});
    expect(validateWifi({ ...base, security: 'WEP', password: 'abcdef' }).password).toBe(
      'WEP keys are 5 or 13 characters, or 10 or 26 hex digits.',
    );
  });

  it('ignores the password for open networks', () => {
    expect(validateWifi({ ...base, security: 'nopass', password: '' })).toEqual({});
  });

  it('reports both fields at once', () => {
    expect(validateWifi({ ...base, ssid: '', password: 'short' })).toEqual({
      ssid: 'Enter the network name.',
      password: 'WPA passwords are 8 to 63 characters.',
    });
  });
});

describe('validate + hasErrors', () => {
  const inputs = {
    url: { url: '' },
    text: { text: 'ok' },
    email: { to: 'a@b.co', subject: '', body: '' },
    phone: { phone: '12' },
    wifi: { ssid: 'Home', security: 'nopass' as const, password: '', hidden: false },
  };

  it('validates only the selected type', () => {
    expect(hasErrors(validate('url', inputs))).toBe(true);
    expect(hasErrors(validate('text', inputs))).toBe(false);
    expect(hasErrors(validate('email', inputs))).toBe(false);
    expect(hasErrors(validate('phone', inputs))).toBe(true);
    expect(hasErrors(validate('wifi', inputs))).toBe(false);
  });
});
