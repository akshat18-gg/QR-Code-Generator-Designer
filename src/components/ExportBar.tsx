import type { Options } from 'qr-code-styling';
import { useEffect, useState } from 'react';
import { canCopyImage, copyPng, downloadBlob, renderBlob } from '../lib/exportQr';
import { exportFilename } from '../lib/filename';
import type { QrStatus } from '../lib/status';
import type { QrType } from '../lib/types';

interface ExportBarProps {
  type: QrType;
  status: QrStatus;
  options: Options | null;
}

type Notice = { text: string; tone: 'ok' | 'error' } | null;

export function ExportBar({ type, status, options }: ExportBarProps) {
  const [notice, setNotice] = useState<Notice>(null);
  const [busy, setBusy] = useState(false);
  const ready = status.kind === 'ready' && options !== null;

  useEffect(() => {
    if (notice?.tone !== 'ok') return;
    const id = window.setTimeout(() => setNotice(null), 2500);
    return () => window.clearTimeout(id);
  }, [notice]);

  async function download(extension: 'png' | 'svg') {
    if (!options) return;
    setBusy(true);
    try {
      const blob = await renderBlob(options, extension);
      downloadBlob(blob, exportFilename(type, extension));
      setNotice({ text: `Saved ${extension.toUpperCase()}`, tone: 'ok' });
    } catch {
      setNotice({ text: "Couldn't make the file. Try again.", tone: 'error' });
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!options) return;
    if (!canCopyImage()) {
      setNotice({
        text: "This browser can't copy images. Download the PNG instead.",
        tone: 'error',
      });
      return;
    }
    setBusy(true);
    try {
      await copyPng(options);
      setNotice({ text: 'Copied', tone: 'ok' });
    } catch {
      setNotice({
        text: "Couldn't copy. Your browser may have blocked it. Download the PNG instead.",
        tone: 'error',
      });
    } finally {
      setBusy(false);
    }
  }

  const disabled = !ready || busy;

  return (
    <div className="export-bar">
      <div className="export-buttons">
        <button
          type="button"
          className="button button-primary"
          disabled={disabled}
          aria-describedby={ready ? undefined : 'export-reason'}
          onClick={() => void download('png')}
        >
          Download PNG
        </button>
        <button
          type="button"
          className="button"
          disabled={disabled}
          aria-describedby={ready ? undefined : 'export-reason'}
          onClick={() => void download('svg')}
        >
          SVG
        </button>
        <button
          type="button"
          className="button"
          disabled={disabled}
          aria-describedby={ready ? undefined : 'export-reason'}
          onClick={() => void copy()}
        >
          Copy
        </button>
      </div>
      {!ready && (
        <p className="hint" id="export-reason">
          {status.kind === 'ready' ? '' : status.message}
        </p>
      )}
      <p
        className={notice?.tone === 'error' ? 'export-notice error' : 'export-notice'}
        role="status"
      >
        {notice?.text}
      </p>
    </div>
  );
}
