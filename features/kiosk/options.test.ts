import { bottomBarHeight, DEFAULT_OPTIONS, parseOptions } from "./options";

describe("parseOptions", () => {
  it("reads the key=value format used by the Processing build", () => {
    const options = parseOptions(
      ["isFullscreen=0", "ScreenWidth=360", "ScreenHeight=640"].join("\n"),
    );

    expect(options.isFullscreen).toBe(false);
    expect(options.screenWidth).toBe(360);
    expect(options.screenHeight).toBe(640);
  });

  it("treats any non-zero isFullscreen as enabled, as Options.pde did", () => {
    expect(parseOptions("isFullscreen=1").isFullscreen).toBe(true);
    expect(parseOptions("isFullscreen=0").isFullscreen).toBe(false);
  });

  it("splits on the first = only, so values may contain =", () => {
    // Options.pde used split("=", 2) for exactly this reason.
    const options = parseOptions("ScreenWidth=800=ignored");
    expect(options.screenWidth).toBe(DEFAULT_OPTIONS.screenWidth);
  });

  it("skips blank, comment, and malformed lines instead of throwing", () => {
    const options = parseOptions(
      ["", "a comment line with no separator", "=leading", "ScreenWidth=1080"].join("\n"),
    );

    expect(options.screenWidth).toBe(1080);
    expect(options.screenHeight).toBe(DEFAULT_OPTIONS.screenHeight);
  });

  it("falls back to defaults for absent and non-numeric values", () => {
    const options = parseOptions("ScreenHeight=not-a-number");
    expect(options.screenHeight).toBe(DEFAULT_OPTIONS.screenHeight);
    expect(options.sceneIdleSeconds).toBe(DEFAULT_OPTIONS.sceneIdleSeconds);
  });
});

describe("bottomBarHeight", () => {
  it("is one ninth of screen height, as Options.pde derived it", () => {
    expect(bottomBarHeight(640)).toBe(71);
    expect(bottomBarHeight(1080)).toBe(120);
  });
});
