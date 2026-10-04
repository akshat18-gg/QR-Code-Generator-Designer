import type { Options } from 'qr-code-styling';
import { useEffect, useState } from 'react';
import { runDecodeTest, type DecodeResult } from '../lib/scanCheck';
import { useDebouncedValue } from './useDebouncedValue';

export interface ScanInput {
  options: Options;
  payload: string;
}

export interface ScanCheckState {
  // The last finished result. It may belong to an earlier input while a new
  // check is pending, so the panel can keep showing it instead of flickering.
  decode: DecodeResult | null;
  checking: boolean;
}

// The decode test renders a full-size PNG and runs jsQR over every pixel, which
// takes tens of milliseconds. Running it on every keystroke or slider tick would
// make typing lag, so it waits until the input has been still for 300 ms.
export function useScanCheck(input: ScanInput | null): ScanCheckState {
  const settled = useDebouncedValue(input, 300);
  const [result, setResult] = useState<{ input: ScanInput; decode: DecodeResult } | null>(null);

  useEffect(() => {
    if (!settled) return;
    let current = true;
    runDecodeTest(settled.options, settled.payload)
      .catch((): DecodeResult => ({ full: 'unreadable', small: 'skipped' }))
      .then((decode) => {
        if (current) setResult({ input: settled, decode });
      });
    return () => {
      current = false;
    };
  }, [settled]);

  return {
    decode: result?.decode ?? null,
    checking: input !== null && result?.input !== input,
  };
}
