import { useTheme, type ThemeChoice } from '../hooks/useTheme';
import { Segmented } from './Segmented';

const OPTIONS: readonly { value: ThemeChoice; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export function ThemeToggle() {
  const { choice, choose } = useTheme();
  return (
    <div className="theme-toggle">
      <Segmented
        legend="Theme"
        hideLegend
        mono
        value={choice}
        options={OPTIONS}
        onChange={choose}
      />
    </div>
  );
}
