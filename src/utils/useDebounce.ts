import { useEffect, useState } from 'react';

/**
 * Returns the input value after it has been stable for `delayMs` milliseconds.
 * Useful for debouncing search inputs so a query doesn't fire on every keystroke.
 */
export function useDebounce<T>(value: T, delayMs: number = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(handle);
  }, [value, delayMs]);

  return debounced;
}
