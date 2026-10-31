import { render, renderHook, screen } from "@testing-library/react";
import { KioskShell } from "./components/KioskShell";
import { DEFAULT_OPTIONS, type KioskOptions } from "./options";
import { KioskOptionsContext, useKioskOptions } from "./options-context";

// Stand in for the attract screen, the first scene the shell renders, with a
// probe that shows which options it can see.
jest.mock("@/features/scenes/idle", () => {
  const { useKioskOptions: readOptions } = jest.requireActual("./options-context");
  return {
    IdleScene: function OptionsProbe() {
      return <p>idle after {readOptions().sessionIdleSeconds}s</p>;
    },
  };
});

describe("useKioskOptions", () => {
  it("falls back to the defaults outside a provider", () => {
    const { result } = renderHook(() => useKioskOptions());
    expect(result.current).toBe(DEFAULT_OPTIONS);
  });

  it("returns the options a provider supplies", () => {
    const options: KioskOptions = { ...DEFAULT_OPTIONS, sessionIdleSeconds: 90 };
    const { result } = renderHook(() => useKioskOptions(), {
      wrapper: ({ children }) => (
        <KioskOptionsContext.Provider value={options}>{children}</KioskOptionsContext.Provider>
      ),
    });
    expect(result.current).toBe(options);
  });

  it("gives scenes the options KioskShell was rendered with", () => {
    const sink = { writeSession: jest.fn(), writeError: jest.fn() };
    render(<KioskShell options={{ ...DEFAULT_OPTIONS, sessionIdleSeconds: 90 }} sessionSink={sink} />);
    expect(screen.getByText("idle after 90s")).toBeInTheDocument();
  });
});
