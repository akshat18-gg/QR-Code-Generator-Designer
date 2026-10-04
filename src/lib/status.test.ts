import { describe, expect, it } from 'vitest';
import { DEFAULT_STYLE, EMPTY_INPUTS } from '../state/editor';
import { deriveStatus } from './status';
import type { Inputs, QrType } from './types';
import { validate } from './validate';

function statusFor(type: QrType, patch: Partial<Inputs>, style = DEFAULT_STYLE) {
  const inputs = { ...EMPTY_INPUTS, ...patch };
  return deriveStatus(type, inputs, style, validate(type, inputs));
}

describe('deriveStatus', () => {
  it('is empty before anything is typed', () => {
    expect(statusFor('url', {})).toEqual({
      kind: 'empty',
      message: 'Type a link to see its code.',
    });
  });

  it('is invalid with the first field error', () => {
    expect(statusFor('email', { email: { to: 'nope', subject: '', body: '' } })).toEqual({
      kind: 'invalid',
      message: "That doesn't look like an email address.",
    });
  });

  it('is ready with the payload and module data', () => {
    const status = statusFor('url', { url: { url: 'example.com' } });
    expect(status).toMatchObject({
      kind: 'ready',
      payload: 'https://example.com',
      source: { data: 'https://example.com', mode: 'Byte', moduleCount: 25 },
      version: 2,
    });
  });

  it('reports overflow instead of throwing', () => {
    const status = statusFor(
      'text',
      { text: { text: 'x'.repeat(1300) } },
      { ...DEFAULT_STYLE, ecLevel: 'H' },
    );
    expect(status).toEqual({
      kind: 'overflow',
      message:
        'Too much text for one QR code at level H. Shorten it or lower the error correction.',
    });
  });

  it('reports when the code has more modules than the image has pixels', () => {
    const status = statusFor(
      'text',
      { text: { text: 'x'.repeat(2000) } },
      { ...DEFAULT_STYLE, ecLevel: 'L', size: 128 },
    );
    expect(status.kind).toBe('too-small');
  });

  it('treats an untouched Wi-Fi form as empty', () => {
    expect(statusFor('wifi', {}).kind).toBe('empty');
  });
});
