import Image from "next/image";
import { NAV_MENU_ID } from "./NavMenu";

export interface KioskHeaderProps {
  /** False on the attract screen, which has no menu. */
  showMenuToggle?: boolean;
  menuOpen?: boolean;
  onToggleMenu?: () => void;
}

/**
 * Branding strip across the top of the kiosk: the Lipscomb shield, the product
 * name beside it, and the hamburger button that opens `NavMenu` in the
 * bottom-right corner. Shown on every scene, including the attract screen,
 * which hides the button.
 */
export function KioskHeader({ showMenuToggle = true, menuOpen = false, onToggleMenu }: KioskHeaderProps) {
  return (
    <header className="flex w-full shrink-0 items-center gap-[3%] bg-[var(--luke-purple)] px-[3%] py-[2%] select-none">
      <Image
        src="/images/lipscomb-shield.png"
        alt="Lipscomb University"
        width={372}
        height={438}
        priority
        className="h-[clamp(3.5rem,11dvh,8.5rem)] w-auto shrink-0"
      />
      <div className="flex min-w-0 flex-1 flex-col self-stretch">
        <p className="text-[clamp(0.75rem,3.8vw,1.75rem)] leading-tight text-[var(--luke-lilac)]">
          Lipscomb University Kiosk Experience
        </p>
        <div className="flex flex-1 items-end justify-between gap-[3%]">
          <p className="text-[clamp(2rem,10vw,5rem)] leading-none font-extrabold text-[var(--luke-gold)]">
            L.U.K.E.
          </p>
          {/* Hidden with `invisible` rather than removed, so the header keeps
              its layout on every scene. `invisible` also takes it out of the
              tab order and the accessibility tree. */}
          <button
            type="button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls={NAV_MENU_ID}
            onClick={onToggleMenu}
            className={`block shrink-0 ${menuOpen ? "text-[var(--luke-cream)]" : "text-[var(--luke-lilac)]"} ${showMenuToggle ? "" : "invisible"}`}
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
    </header>
  );
}
