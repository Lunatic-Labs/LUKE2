/**
 * Drop-down scene menu, opened by the chevron under the header's shield.
 *
 * Not in the Processing build, which only had the bottom bar's previous/next
 * arrows. It hangs from the top-left of the scene area as a lavender panel
 * with a purple edge, over whatever scene is showing, and lists one pill
 * button per page.
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
  if (!open) return null;

  return (
    <div
      id={NAV_MENU_ID}
      className="absolute top-0 left-0 z-20 flex w-[48%] flex-col gap-[clamp(0.4rem,1.5dvh,1.25rem)] rounded-br-2xl border-r-2 border-b-2 border-[var(--luke-purple)] bg-[var(--luke-lavender)] px-[4%] py-[clamp(0.5rem,2dvh,1.5rem)] select-none"
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          aria-current={item.id === currentId ? "page" : undefined}
          onClick={() => onSelect(item.id)}
          className="w-full rounded-full border-2 border-[var(--luke-purple)] py-[clamp(0.125rem,0.6dvh,0.5rem)] text-[clamp(0.875rem,4.3vw,2rem)] leading-tight font-bold text-[var(--luke-purple)] transition-[filter] active:brightness-90"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
