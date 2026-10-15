import Image from "next/image";
import { NAV_MENU_ID } from "./NavMenu";

export interface KioskHeaderProps {
  /** False on the attract screen, which has no menu. */
  showMenuToggle?: boolean;
  menuOpen?: boolean;
  onToggleMenu?: () => void;
}

/**
 * Branding strip across the top of the kiosk: the Lipscomb shield with the
 * product name beside it, and the hamburger button that opens `NavMenu`. Shown
 * on every scene, including the attract screen, which hides the button.
 */
export function KioskHeader({ showMenuToggle = true, menuOpen = false, onToggleMenu }: KioskHeaderProps) {
  return (
    <header className="flex w-full shrink-0 items-center gap-[3%] bg-[var(--luke-purple)] px-[3%] pt-[2%] select-none">
      <div className="flex shrink-0 flex-col items-center">
        <Image
          src="/images/lipscomb-shield.png"
          alt="Lipscomb University"
          width={372}
          height={438}
          priority
          className="h-[clamp(2.5rem,8dvh,6rem)] w-auto"
        />
        {/* The menu button sits in a strip that runs from the shield's bottom
            to the header's bottom (the header has no bottom padding), with
            equal space above and below, so the icon is centred exactly
            between the two.

            Hidden with `invisible` rather than removed, so the header keeps
            its height and the title its position on every scene. `invisible`
            also takes it out of the tab order and the accessibility tree. */}
        <div className="py-[clamp(0.25rem,1dvh,0.75rem)]">
          <button
            type="button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls={NAV_MENU_ID}
            onClick={onToggleMenu}
            className={`block ${menuOpen ? "text-[var(--luke-cream)]" : "text-[var(--luke-lilac)]"} ${showMenuToggle ? "" : "invisible"}`}
          >
            {/* Same icon open or closed; it turns cream while the menu is open. */}
            <svg
              viewBox="0 0 24 16"
              className="w-[clamp(1.5625rem,5dvh,3.75rem)]"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              aria-hidden="true"
            >
              <line x1="2" y1="2" x2="22" y2="2" />
              <line x1="2" y1="8" x2="22" y2="8" />
              <line x1="2" y1="14" x2="22" y2="14" />
            </svg>
          </button>
        </div>
      </div>
      <p className="min-w-0 pb-[clamp(1rem,4dvh,3rem)] text-[clamp(0.875rem,4.3vw,2rem)] leading-tight text-[var(--luke-lilac)]">
        Lipscomb University Kiosk Experience
      </p>
    </header>
  );
}
