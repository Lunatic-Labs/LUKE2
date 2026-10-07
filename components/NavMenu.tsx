"use client";

import { useEffect, useState, type CSSProperties } from "react";

/**
 * Drop-down scene menu, opened by the chevron under the header's shield.
 *
 * Not in the Processing build, which only had the bottom bar's previous/next
 * arrows. It hangs from the top-left of the scene area as an off-white panel
 * with a purple edge, over whatever scene is showing, and lists one pill
 * button per page.
 *
 * It stays mounted while closed so it can animate both ways: opening grows the
 * panel down from the header, closing shrinks it back up. Its height is what
 * animates, so the purple bottom edge and rounded corner stay drawn the whole
 * way and the buttons are uncovered behind them. Meanwhile the buttons slide
 * in from the left edge of the screen in a wave, top first, so each arrives as
 * the panel's edge reaches it; closing reverses the wave, bottom first.
 *
 * The buttons ignore taps until the opening animation has finished. While
 * closed the panel is `inert` and hidden from assistive tech, so its buttons
 * cannot be reached at all.
 */

export const NAV_MENU_ID = "kiosk-nav-menu";

/** Length of the whole open or close animation: the panel and the full wave. */
export const NAV_MENU_ANIMATION_MS = 400;

/** How long each button takes to slide across. The rest is spent staggering. */
const BUTTON_SLIDE_MS = 200;

export interface NavMenuItem {
  id: string;
  label: string;
}

export interface NavMenuProps {
  open: boolean;
  items: NavMenuItem[];
  /** The item for the page on screen, marked with `aria-current`. */
  currentId?: string;
  onSelect: (id: string) => void;
}

export function NavMenu({ open, items, currentId, onSelect }: NavMenuProps) {
  // Whether the buttons accept taps. Reset during render the moment the menu
  // closes (React's pattern for adjusting state to a prop change), and set
  // again only once a fresh opening animation has run its full length.
  const [interactive, setInteractive] = useState(false);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (!open) setInteractive(false);
  }

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => setInteractive(true), NAV_MENU_ANIMATION_MS);
    return () => clearTimeout(timer);
  }, [open]);

  // Spread the wave so the last button lands just as the panel finishes.
  const stagger =
    items.length > 1
      ? (NAV_MENU_ANIMATION_MS - BUTTON_SLIDE_MS) / (items.length - 1)
      : 0;

  return (
    <div
      id={NAV_MENU_ID}
      data-state={open ? "open" : "closed"}
      aria-hidden={!open}
      inert={!open}
      // Animating grid rows between 0fr and 1fr tweens the panel to its
      // content's natural height. `visibility` is in the transition so a
      // closing menu stays visible until it has shrunk, then drops out of
      // hit-testing.
      className={`absolute top-0 left-0 z-20 grid w-[48%] rounded-br-2xl border-r-2 border-b-2 border-[var(--luke-purple)] bg-[var(--luke-off-white)] px-[4%] select-none transition-[grid-template-rows,visibility] ease-out motion-reduce:transition-none ${
        open ? "visible grid-rows-[1fr]" : "invisible grid-rows-[0fr]"
      }`}
      style={{ transitionDuration: `${NAV_MENU_ANIMATION_MS}ms` }}
    >
      {/* Clips whatever the panel has not yet grown to cover. Only vertically,
          so sliding buttons come in from the screen edge rather than
          appearing at the panel's padding. It has no padding of its own,
          since padding cannot shrink and would poke out below the panel. */}
      <div className="min-h-0 overflow-x-visible overflow-y-clip">
        <div className="flex flex-col gap-[clamp(0.4rem,1.5dvh,1.25rem)] py-[clamp(0.5rem,2dvh,1.5rem)]">
          {items.map((item, i) => (
            <button
              key={item.id}
              type="button"
              aria-current={item.id === currentId ? "page" : undefined}
              onClick={() => onSelect(item.id)}
              disabled={!interactive}
              // Opening starts the wave at the top; closing starts it at the
              // bottom, which the shrinking panel covers first. The delay is
              // applied to the slide only, so the press feedback stays instant.
              style={
                {
                  "--wave-delay": `${(open ? i : items.length - 1 - i) * stagger}ms`,
                  "--wave-duration": `${BUTTON_SLIDE_MS}ms`,
                } as CSSProperties
              }
              className={`w-full rounded-full border-2 border-[var(--luke-purple)] bg-[var(--luke-lavender)] py-[clamp(0.125rem,0.6dvh,0.5rem)] shadow-[0_4px_4px_rgb(0_0_0/0.25)] text-[clamp(0.875rem,4.3vw,2rem)] leading-tight font-bold text-[var(--luke-purple)] transition-[translate,filter] ease-out [transition-delay:var(--wave-delay),0s] [transition-duration:var(--wave-duration),150ms] motion-reduce:transition-none active:brightness-90 ${
                open ? "translate-x-0" : "-translate-x-[150%]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
