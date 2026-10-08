import Image from "next/image";

/**
 * Lilac-washed photo of the campus entrance with the Nashville skyline along
 * the bottom, filling its positioned parent. Shared by the attract screen and
 * the main menu. The shell's own skyline sits underneath scenes, so this paints
 * its own copy on top of the photo.
 */
export function CampusBackdrop() {
  return (
    <>
      <Image
        src="/images/lipscomb-entrance.png"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      {/* Tint: lilac over the whole photo, deepening at the very bottom. */}
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,#8f7eb3_87%,#3e364d_100%)] opacity-50" />
      {/* Extra lilac behind the top of the screen, fading out to reveal the photo. */}
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,#8f7eb3_23%,rgb(255_255_255/0)_39%)] opacity-25" />
      <Image
        src="/images/nashville-skyline.png"
        alt=""
        width={482}
        height={119}
        className="pointer-events-none absolute inset-x-0 bottom-0 h-auto w-full"
      />
    </>
  );
}
