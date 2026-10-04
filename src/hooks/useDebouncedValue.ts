import { useEffect, useState } from 'react';

// Dragging a slider or colour picker fires dozens of updates a second, and each
// full QR redraw rebuilds thousands of SVG nodes. The controls update instantly;
// only the expensive render waits for the input to settle.
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(id);
  }, [value, delay]);

  return debounced;
}
