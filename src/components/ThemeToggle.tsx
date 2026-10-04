import { useTheme } from '../hooks/useTheme';

const RAYS = [0, 45, 90, 135, 180, 225, 270, 315];

// One drawing for both states: in dark mode the rays shrink away, the disc
// grows, and a masked circle slides over it to cut the crescent.
export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const next = theme === 'dark' ? 'light' : 'dark';

  return (
    <button
      type="button"
      className="theme-toggle"
      data-theme-icon={theme}
      aria-label={`Switch to ${next} theme`}
      onClick={toggle}
    >
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
        <mask id="theme-moon-cut">
          <rect width="24" height="24" fill="white" />
          <circle className="theme-cut" cx="17" cy="7" r="6" fill="black" />
        </mask>
        <circle className="theme-disc" cx="12" cy="12" r="5" mask="url(#theme-moon-cut)" />
        <g className="theme-rays">
          {RAYS.map((angle) => (
            <line
              key={angle}
              x1="12"
              y1="2.5"
              x2="12"
              y2="4.5"
              transform={`rotate(${angle} 12 12)`}
            />
          ))}
        </g>
      </svg>
    </button>
  );
}
