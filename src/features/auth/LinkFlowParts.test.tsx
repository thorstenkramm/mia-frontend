import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useRetryAvailable } from "./LinkFlowParts";

const maximumTimerDelay = 2_147_483_647;

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useRetryAvailable", () => {
  it("stays unavailable for a wait beyond the browser timer maximum until all of it passes", () => {
    // One second longer than the largest delay a single browser timer holds.
    const seconds = Math.ceil(maximumTimerDelay / 1000) + 1;
    const { result } = renderHook(() => useRetryAvailable(seconds));
    expect(result.current).toBe(false);

    act(() => vi.advanceTimersByTime(maximumTimerDelay));
    expect(result.current).toBe(false);
    act(() => vi.advanceTimersByTime(seconds * 1000 - maximumTimerDelay - 1));
    expect(result.current).toBe(false);
    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe(true);
  });

  it("enables an ordinary wait only after it passes", () => {
    const { result } = renderHook(() => useRetryAvailable(3));
    act(() => vi.advanceTimersByTime(2999));
    expect(result.current).toBe(false);
    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe(true);
  });

  it("cancels the pending chunk on unmount", () => {
    const seconds = Math.ceil(maximumTimerDelay / 1000) + 1;
    const { unmount } = renderHook(() => useRetryAvailable(seconds));
    act(() => vi.advanceTimersByTime(maximumTimerDelay));
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
