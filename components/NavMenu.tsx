/**
 * Drop-down scene menu, opened by the chevron under the header's shield.
 *
 * Not in the Processing build, which only had the bottom bar's previous/next
 * arrows. It hangs from the top-left of the scene area as an off-white panel
 * with a purple edge, over whatever scene is showing, and lists one pill
 * button per page.
 *
 * It stays mounted while closed so it can animate both ways: opening wipes it
 * down from the top edge, closing wipes it back up. While closed it is
 * `inert` and hidden from assistive tech, so its buttons cannot be reached.
 */

export const NAV_MENU_ID = "kiosk-nav-menu";

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
  return (
    <div
      id={NAV_MENU_ID}
      data-state={open ? "open" : "closed"}
      aria-hidden={!open}
      inert={!open}
      // `visibility` is in the transition so a closing menu stays visible
      // until the wipe finishes, then drops out of hit-testing.
      className={`absolute top-0 left-0 z-20 flex w-[48%] flex-col gap-[clamp(0.4rem,1.5dvh,1.25rem)] rounded-br-2xl border-r-2 border-b-2 border-[var(--luke-purple)] bg-[var(--luke-off-white)] px-[4%] py-[clamp(0.5rem,2dvh,1.5rem)] select-none transition-[clip-path,visibility] duration-300 ease-out motion-reduce:transition-none ${
        open ? "visible [clip-path:inset(0_0_0_0)]" : "invisible [clip-path:inset(0_0_100%_0)]"
      }`}
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          aria-current={item.id === currentId ? "page" : undefined}
          onClick={() => onSelect(item.id)}
          className="w-full rounded-full border-2 border-[var(--luke-purple)] bg-[var(--luke-lavender)] py-[clamp(0.125rem,0.6dvh,0.5rem)] shadow-[0_4px_4px_rgb(0_0_0/0.25)] text-[clamp(0.875rem,4.3vw,2rem)] leading-tight font-bold text-[var(--luke-purple)] transition-[filter] active:brightness-90"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
