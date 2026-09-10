import { act, renderHook } from "@testing-library/react";
import { useCarousel } from "./useCarousel";

describe("useCarousel", () => {
  it("wraps forward past the end", () => {
    const { result } = renderHook(() => useCarousel({ length: 3, initialIndex: 2 }));

    act(() => result.current.next());
    expect(result.current.index).toBe(0);
  });

  it("wraps backward past the start", () => {
    const { result } = renderHook(() => useCarousel({ length: 3 }));

    act(() => result.current.previous());
    expect(result.current.index).toBe(2);
  });

  it("jumps to an absolute index", () => {
    const { result } = renderHook(() => useCarousel({ length: 4 }));

    act(() => result.current.goTo(3));
    expect(result.current.index).toBe(3);
  });

  it("ignores out-of-range jumps", () => {
    const { result } = renderHook(() => useCarousel({ length: 4, initialIndex: 1 }));

    act(() => result.current.goTo(9));
    act(() => result.current.goTo(-1));
    expect(result.current.index).toBe(1);
  });

  it("stays at zero for an empty carousel", () => {
    const { result } = renderHook(() => useCarousel({ length: 0 }));

    act(() => result.current.next());
    act(() => result.current.previous());
    expect(result.current.index).toBe(0);
  });
});
