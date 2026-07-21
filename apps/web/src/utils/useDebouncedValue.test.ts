import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDebouncedValue } from './useDebouncedValue';

describe('useDebouncedValue', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('ne propage la valeur qu’après le délai (B1 : debounce ≤ 300 ms)', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
      initialProps: { value: 'e' },
    });

    rerender({ value: 'el' });
    rerender({ value: 'elden' });
    expect(result.current).toBe('e');

    act(() => vi.advanceTimersByTime(300));
    expect(result.current).toBe('elden');
  });
});
