import type { Options } from 'qr-code-styling';
import type { QrMode } from './qrData';
import { cornerDotColour, cornerSquareColour, moduleGeometry, type Style } from './style';

export interface QrSource {
  data: string;
  mode: QrMode;
  moduleCount: number;
}

// The one place that turns editor state into qr-code-styling options. The
// preview, the thumbnails, every export and the scan check all go through here,
// so what you download is always what you saw.
export function toQrOptions(source: QrSource, style: Style, size = style.size): Options {
  const { marginPx, modulePx } = moduleGeometry(size, style.margin, source.moduleCount);
  const { gradient, logo } = style;

  return {
    type: 'svg',
    width: size,
    height: size,
    margin: marginPx,
    data: source.data,
    qrOptions: { typeNumber: 0, mode: source.mode, errorCorrectionLevel: style.ecLevel },
    dotsOptions: {
      type: style.dotStyle,
      color: style.fg,
      gradient:
        gradient.kind === 'none'
          ? undefined
          : {
              type: gradient.kind,
              rotation: (gradient.angle * Math.PI) / 180,
              colorStops: [
                { offset: 0, color: style.fg },
                { offset: 1, color: gradient.to },
              ],
            },
    },
    cornersSquareOptions: { type: style.cornerSquareStyle, color: cornerSquareColour(style) },
    cornersDotOptions: { type: style.cornerDotStyle, color: cornerDotColour(style) },
    backgroundOptions: { color: style.bg },
    image: logo.src ?? undefined,
    imageOptions: {
      imageSize: logo.size,
      margin: Math.round(logo.margin * modulePx),
      hideBackgroundDots: logo.hideDots,
      saveAsBlob: true,
    },
  };
}
