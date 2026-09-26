import Image from "next/image";

/**
 * Branding strip across the top of the kiosk: the Lipscomb shield with the
 * product name beside it. Shown on every scene, including the attract screen,
 * which hides the menu chevron.
 */
export function KioskHeader({
  showMenuToggle = true,
}: {
  showMenuToggle?: boolean;
}) {
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
        {/* Decorative for now; becomes a menu toggle once there is a menu.
            Hidden with `invisible` rather than removed, so the header keeps
            its height and the title its position on every scene. */}
        <svg
          viewBox="0 0 24 12"
          className={`mt-1 w-[clamp(1.25rem,4dvh,3rem)] text-[var(--luke-lilac)] ${showMenuToggle ? "" : "invisible"}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="2,2 12,10 22,2" />
        </svg>
      </div>
      <p className="min-w-0 pb-[clamp(1rem,4dvh,3rem)] text-[clamp(0.875rem,4.3vw,2rem)] leading-tight text-[var(--luke-lilac)]">
        Lipscomb University Kiosk Experience
      </p>
    </header>
  );
}
