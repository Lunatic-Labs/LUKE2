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
 * product name beside it, and the chevron that opens `NavMenu`. Shown on every
 * scene, including the attract screen, which hides the chevron.
 */
export function KioskHeader({ showMenuToggle = true, menuOpen = false, onToggleMenu }: KioskHeaderProps) {
  return (
    <header className="flex w-full shrink-0 items-center gap-[3%] bg-[var(--luke-purple)] px-[3%] py-[2%] select-none">
      <div className="flex shrink-0 flex-col items-center">
        <Image
          src="/images/lipscomb-shield.png"
          alt="Lipscomb University"
          width={372}
          height={438}
          priority
          className="h-[clamp(2.5rem,8dvh,6rem)] w-auto"
        />
        {/* Hidden with `invisible` rather than removed, so the header keeps
            its height and the title its position on every scene. `invisible`
            also takes it out of the tab order and the accessibility tree. */}
        <button
          type="button"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          aria-controls={NAV_MENU_ID}
          onClick={onToggleMenu}
          className={`mt-1 text-[var(--luke-lilac)] ${showMenuToggle ? "" : "invisible"}`}
        >
          {/* Points down when closed; flips to point up when open. */}
          <svg
            viewBox="0 0 24 12"
            className={`w-[clamp(1.25rem,4dvh,3rem)] transition-transform duration-200 ${menuOpen ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="2,2 12,10 22,2" />
          </svg>
        </button>
      </div>
      <p className="min-w-0 pb-[clamp(1rem,4dvh,3rem)] text-[clamp(0.875rem,4.3vw,2rem)] leading-tight text-[var(--luke-lilac)]">
        Lipscomb University Kiosk Experience
      </p>
    </header>
  );
}
