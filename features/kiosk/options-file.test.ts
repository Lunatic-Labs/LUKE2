/**
 * @jest-environment node
 */
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DEFAULT_OPTIONS } from "./options";
import { DEFAULT_OPTIONS_FILE, loadOptions, optionsFilePath } from "./options-file";

describe("options-file", () => {
  const originalPath = process.env.OPTIONS_FILE;
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), "luke-options-"));
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    if (originalPath === undefined) delete process.env.OPTIONS_FILE;
    else process.env.OPTIONS_FILE = originalPath;
    await rm(dir, { recursive: true, force: true });
  });

  it("looks in data/options.txt unless OPTIONS_FILE says otherwise", () => {
    delete process.env.OPTIONS_FILE;
    expect(optionsFilePath()).toBe(path.resolve(DEFAULT_OPTIONS_FILE));

    process.env.OPTIONS_FILE = path.join(dir, "elsewhere.txt");
    expect(optionsFilePath()).toBe(path.join(dir, "elsewhere.txt"));
  });

  it("reads the file's values and defaults the rest", async () => {
    process.env.OPTIONS_FILE = path.join(dir, "options.txt");
    await writeFile(process.env.OPTIONS_FILE, "KioskId=north\r\nSessionIdleSeconds=90\r\n");

    expect(await loadOptions()).toEqual({
      ...DEFAULT_OPTIONS,
      kioskId: "north",
      sessionIdleSeconds: 90,
    });
  });

  it("quietly uses the defaults when there is no file", async () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    process.env.OPTIONS_FILE = path.join(dir, "missing.txt");

    expect(await loadOptions()).toBe(DEFAULT_OPTIONS);
    expect(warn).not.toHaveBeenCalled();
  });

  it("warns and uses the defaults when the file can't be read", async () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    // A folder exists at the path, but reading it as a file fails.
    process.env.OPTIONS_FILE = dir;

    expect(await loadOptions()).toBe(DEFAULT_OPTIONS);
    expect(warn).toHaveBeenCalledTimes(1);
  });
});
