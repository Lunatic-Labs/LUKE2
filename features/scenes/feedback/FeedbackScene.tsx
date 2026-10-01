import { SceneFrame } from "@/components/SceneFrame";

/**
 * "Leave Some Feedback?"
 *
 * Ported from `src/luke_java/FeedbackScene.pde`, which was itself a static
 * screen for the field demo — no interaction, just the greeting text, the
 * Lipscomb Engineering logo, and the feedback QR code (`ReDraw()`; `Draw()`
 * and the Click handlers were empty).
 * Assets live in `public/feedback/`.
 */

export function FeedbackScene() {
  return (
    <SceneFrame className="bg-white text-black">
      <div className="flex items-center justify-between border-b border-black/15 px-5 py-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-black">L.U.K.E User Review Form</p>
          <h1 className="text-2xl font-semibold text-black">Feedback</h1>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 px-4 py-2 text-center">
        <h2 className="text-4xl font-semibold text-black">I&apos;m still Under Development</h2>

        <p className="max-w-4xl text-5xl font-semibold leading-snug text-black sm:text-6xl">
          Scan the QR code to leave feedback, suggest a feature, or report a bug
        </p>

        <img
          src="/feedback/EngineeringLogo.jpeg"
          alt="Lipscomb Engineering logo"
          className="mt-2 w-1/4 max-w-[160px] shrink-0 object-contain"
        />

        <div className="mt-4 min-h-0 w-5/6 max-w-md shrink rounded-[2rem] border border-[#AD8C45]/50 bg-white p-1.2">
          <img
            src="/feedback/feedbackQR.png"
            alt="QR code linking to the team's feedback form"
            className="block min-h-0 w-full object-contain"
          />
        </div>
      </div>
    </SceneFrame>
  );
}
