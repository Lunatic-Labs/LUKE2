import { SceneFrame } from "@/components/SceneFrame";

export function FeedbackScene() {
  return (
    <SceneFrame className="bg-white text-black">
      <div className="flex items-center justify-between border-b border-black/15 px-5 py-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-black">L.U.K.E User Review Form</p>
          <h1 className="text-2xl font-semibold text-black">Feedback</h1>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-start gap-8 px-4 pb-4 pt-2 text-center">
        <h2 className="text-3xl font-semibold text-black">I&apos;m still Under Development</h2>

        <p className="max-w-4xl text-4xl font-semibold leading-snug text-black sm:text-5xl">
          Scan the QR code to leave feedback, suggest a feature, or report a bug
        </p>

        <img
          src="/feedback/EngineeringLogo.jpeg"
          alt="Lipscomb Engineering logo"
          className="w-1/3 max-w-[240px] shrink-0 object-contain"
        />

        <img
          src="/feedback/feedbackQR.png"
          alt="QR code linking to the team's feedback form"
          className="block min-h-0 w-3/5 max-w-[360px] shrink object-contain"
        />
      </div>
    </SceneFrame>
  );
}