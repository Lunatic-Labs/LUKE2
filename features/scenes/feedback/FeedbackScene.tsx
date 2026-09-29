import { SceneFrame } from "@/components/SceneFrame";
import type { SceneComponentProps } from "@/features/kiosk/types";

/**
 * "Leave Some Feedback?"
 *
 * Ported from `src/luke_java/FeedbackScene.pde`, which was itself a static
 * screen for the field demo — no interaction, just the greeting text and the
 * feedback QR code (`ReDraw()`; `Draw()` and the Click handlers were empty).
 * The QR asset lives at `public/feedback/feedbackQR.png`, copied from the
 * kiosk repo's `data/feedbackQR.png`, sized to `y_max/5` as upstream resized it.
 */

// Upstream colors: fill(51, 30, 84) purple, plain black text otherwise.
const PURPLE = "rgb(51, 30, 84)";

/** Vertical anchor as a percentage — the `n * (y_max/9)` offsets upstream. */
function yFraction(n: number): string {
  return `${((n * 100) / 9).toFixed(2)}%`;
}

export function FeedbackScene({ bounds }: SceneComponentProps) {
  return (
    <SceneFrame>
      <div className="relative min-h-0 flex-1">
        <h2
          className="absolute inset-x-0 text-center font-semibold text-black"
          style={{ top: yFraction(1), fontSize: bounds.width / 11 }}
        >
          Hi, I&apos;m L.U.K.E.!
        </h2>

        <p
          className="absolute inset-x-0 text-center text-black"
          style={{ top: yFraction(1.5), fontSize: bounds.width / 12 }}
        >
          The Lipscomb University
          <br />
          Kiosk Experience!
        </p>

        <p
          className="absolute inset-x-0 text-center"
          style={{ top: yFraction(3), fontSize: bounds.width / 12, color: PURPLE }}
        >
          I&apos;m still under development.
        </p>

        <p
          className="absolute left-0 text-black"
          style={{ top: yFraction(5), fontSize: bounds.width / 12 }}
        >
          If you&apos;re enjoying
          <br />
          our time together,
          <br />
          please leave my
          <br />
          team some feedback!
          <br />
          <br />
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Thanks :)
        </p>

        {/* image(qr, x_max*0.65, y_max/2) at y_max/5 square */}
        <img
          src="/feedback/feedbackQR.png"
          alt="QR code linking to the team's feedback form"
          className="absolute"
          style={{ left: "65%", top: "50%", height: "20%", width: "20%", objectFit: "contain" }}
        />
      </div>
    </SceneFrame>
  );
}
