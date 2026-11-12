"use client";

import { createContext, useContext } from "react";
import { DEFAULT_OPTIONS, type KioskOptions } from "./options";

/**
 * The kiosk's options, as `KioskShell` was given them.
 *
 * `Options.pde` was a global every Processing scene could read. Scenes here
 * receive only their bounds and handle as props, so the shell provides the
 * options through context instead and a scene that needs one calls
 * `useKioskOptions()`. Outside a provider (a scene rendered on its own in a
 * test) the defaults apply.
 */
export const KioskOptionsContext = createContext<KioskOptions>(DEFAULT_OPTIONS);

export function useKioskOptions(): KioskOptions {
  return useContext(KioskOptionsContext);
}
