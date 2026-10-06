import { COLOURS, TYPE_COLOURS, type QrType } from '../lib/types';

const WIDE = 0.5;
// Scaled neighbours can leave a hairline gap between them; a sliver of overlap
// hides it.
const OVERLAP = 0.004;

// A thin bar of the four colours across the top of the page. The selected
// tab's colour widens to half the bar; on Wi-Fi they share it equally and a
// shimmer runs across, like a signal.
export function ColourStrip({ type }: { type: QrType }) {
  const active = TYPE_COLOURS[type];
  const widths = COLOURS.map((colour) => {
    if (!active) return 1 / COLOURS.length;
    return colour === active ? WIDE : (1 - WIDE) / (COLOURS.length - 1);
  });
  const offsets = widths.map((_, i) => widths.slice(0, i).reduce((sum, w) => sum + w, 0));

  return (
    <div className="colour-strip" data-active={active ?? 'all'} aria-hidden="true">
      {COLOURS.map((colour, i) => (
        <span
          key={colour}
          className={`strip-segment strip-${colour}`}
          style={{
            transform: `translateX(${(offsets[i] ?? 0) * 100}%) scaleX(${(widths[i] ?? 0) + OVERLAP})`,
          }}
        />
      ))}
      {!active && <span className="strip-shimmer" />}
    </div>
  );
}
