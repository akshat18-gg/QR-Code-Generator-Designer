import { useRef } from 'react';
import type { Options } from 'qr-code-styling';
import { useQrSvg } from '../hooks/useQrSvg';
import type { QrStatus } from '../lib/status';
import type { Style } from '../lib/style';

interface PreviewProps {
  status: QrStatus;
  options: Options | null;
  style: Style;
}

function placeholderText(status: QrStatus): string {
  switch (status.kind) {
    case 'invalid':
      return 'Finish the details to see the code.';
    case 'empty':
    case 'overflow':
    case 'too-small':
      return status.message;
    case 'ready':
      return '';
  }
}

export function Preview({ status, options, style }: PreviewProps) {
  const ref = useRef<HTMLDivElement>(null);
  const ready = status.kind === 'ready';
  useQrSvg(ref, ready ? options : null, true);

  return (
    <figure className="preview">
      <div className="sheet">
        <span className="crop crop-tl" />
        <span className="crop crop-tr" />
        <span className="crop crop-bl" />
        <span className="crop crop-br" />
        {/* The box keeps its size whether it holds a code or the placeholder,
            so nothing around it moves when the code redraws. */}
        <div className="preview-box">
          <div
            ref={ref}
            className="preview-qr"
            role="img"
            aria-label={ready ? `QR code for ${status.payload}` : undefined}
            hidden={!ready}
            data-testid="preview"
          />
          {!ready && (
            <p
              className={
                status.kind === 'overflow' || status.kind === 'too-small'
                  ? 'preview-empty is-error'
                  : 'preview-empty'
              }
              role={status.kind === 'overflow' || status.kind === 'too-small' ? 'alert' : undefined}
            >
              {placeholderText(status)}
            </p>
          )}
        </div>
      </div>
      <figcaption className="preview-meta">
        {ready ? (
          <>
            {status.source.moduleCount}×{status.source.moduleCount} modules · version{' '}
            {status.version} · level {style.ecLevel} · {style.size} px
          </>
        ) : (
          'No code yet'
        )}
      </figcaption>
    </figure>
  );
}
