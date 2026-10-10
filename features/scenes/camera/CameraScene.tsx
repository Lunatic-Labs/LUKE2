"use client";

import { useEffect, useRef, useState } from "react";
import { SceneFrame } from "@/components/SceneFrame";
import type { SceneComponentProps } from "@/features/kiosk/types";
import { captureFrame, uploadPhoto } from "./capture";

/**
 * Take a Picture!
 *
 * Ported from `src/luke_java/CameraScene.pde`. Following the camera mockup, a
 * live preview with rounded corners fills most of the scene, inset on a purple
 * background, above a camera-app style capture button.
 * Upstream took a picture on a tap anywhere; a dedicated button keeps a
 * visitor who is only touching the screen from setting off the camera. The
 * button runs the gold Ready / Set / Pose! countdown, saves the frame to the
 * photo directory (which `/api/gallery` lists alongside `public/gallery`), and
 * holds for a second before the next picture.
 *
 * Processing's `Capture` becomes `getUserMedia`, which only works in a secure
 * context (https or localhost) and after the browser's permission prompt. The
 * stream is opened on mount and stopped on unmount, standing in for upstream's
 * `video.start()` / `video.stop()`.
 */

export const COUNTDOWN = ["Ready.", "Set.", "Pose!"];
export const COUNTDOWN_STEP_MS = 1000;
/** Upstream's `delay(1000)` after each capture, marked "DONT CHANGE". */
export const COOLDOWN_MS = 1000;

/** `thankYouText[]` from upstream, where it was written but left disabled. */
export const THANK_YOU_TEXT = [
  "You look great!",
  "Thank you!",
  "That's a keeper!",
  "Thanks!",
  "That's going in my album!",
  "Lookin' good!",
];

type Status = "starting" | "ready" | "countdown" | "saving" | "done" | "unavailable";

/**
 * Shared look of the text over the preview, from the camera mockup: heavy
 * sans-serif with a thick dark purple outline. `paint-order` draws the outline
 * behind the fill, so it thickens the letters outward instead of eating in.
 */
const OVERLAY_TEXT =
  "px-4 text-center font-sans font-extrabold leading-tight [-webkit-text-stroke:6px_var(--luke-purple)] [paint-order:stroke_fill]";

export function CameraScene({ handle }: SceneComponentProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<Status>("starting");
  const [step, setStep] = useState(0);
  const [message, setMessage] = useState("");

  // Open the camera for as long as the scene is on screen.
  useEffect(() => {
    const video = videoRef.current;
    let stream: MediaStream | null = null;
    let cancelled = false;

    // getUserMedia resolving only means the camera is open. Until the video has
    // a frame, videoWidth is 0 and captureFrame would fail, so a tap has to wait.
    const markReady = () => {
      if (!cancelled) setStatus("ready");
    };

    openCamera().then(
      (opened) => {
        if (cancelled) {
          stopStream(opened);
          return;
        }
        stream = opened;
        if (!video) return;
        video.srcObject = opened;
        if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) markReady();
        else video.addEventListener("loadeddata", markReady, { once: true });
      },
      (error: unknown) => {
        if (cancelled) return;
        console.error("CameraScene: could not open camera", error);
        setMessage(describeCameraError(error));
        setStatus("unavailable");
      },
    );

    return () => {
      cancelled = true;
      video?.removeEventListener("loadeddata", markReady);
      if (stream) stopStream(stream);
    };
  }, []);

  // Step through the countdown, then take the picture.
  useEffect(() => {
    if (status !== "countdown") return;

    const timer = setTimeout(() => {
      if (step < COUNTDOWN.length - 1) {
        setStep(step + 1);
        return;
      }

      const video = videoRef.current;
      if (!video) return;
      setStatus("saving");
      captureFrame(video)
        .then(uploadPhoto)
        .then(
          () => setMessage(THANK_YOU_TEXT[Math.floor(Math.random() * THANK_YOU_TEXT.length)]),
          (error: unknown) => {
            console.error("CameraScene: could not save photo", error);
            setMessage("Sorry, that one didn't save. Try again!");
          },
        )
        .finally(() => setStatus("done"));
    }, COUNTDOWN_STEP_MS);

    return () => clearTimeout(timer);
  }, [status, step]);

  // Hold on the result briefly, then allow another picture.
  useEffect(() => {
    if (status !== "done") return;
    const timer = setTimeout(() => setStatus("ready"), COOLDOWN_MS);
    return () => clearTimeout(timer);
  }, [status]);

  function handleTakePicture() {
    handle.reportActivity();
    // Upstream's `canTakePicture` guard: one capture at a time. The button is
    // also disabled outside `ready`; this keeps the rule in one place.
    if (status !== "ready") return;
    setStep(0);
    setStatus("countdown");
  }

  if (status === "unavailable") {
    return (
      <SceneFrame className="items-center justify-center gap-3 bg-zinc-950 px-8 text-center">
        <p className="text-2xl font-semibold text-[var(--luke-gold)]">Camera unavailable</p>
        <p className="text-zinc-300">{message}</p>
      </SceneFrame>
    );
  }

  // What screen readers hear. The region stays mounted so each change is
  // announced, and it sits outside the button because a button's children
  // can be treated as presentational and never read.
  const announcement = status === "countdown" ? COUNTDOWN[step] : status === "done" ? message : "";

  return (
    <SceneFrame className="bg-[var(--luke-purple)] px-[2%] pt-[2%] select-none">
      <p role="status" aria-atomic="true" className="sr-only">
        {announcement}
      </p>
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-[clamp(0.5rem,1.5dvh,1.25rem)] bg-black">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
        />

        {status === "ready" && (
          <p className={`absolute inset-x-0 top-[6%] text-[clamp(1.5rem,8vw,4rem)] text-white ${OVERLAY_TEXT}`}>
            Take A Picture
          </p>
        )}

        {/* Starts just below the middle and stacks downward, one word a second. */}
        {status === "countdown" && (
          <div
            aria-hidden="true"
            className={`absolute inset-x-0 top-[53%] flex flex-col items-center text-[clamp(1.75rem,9vw,4.5rem)] text-[var(--luke-gold)] ${OVERLAY_TEXT}`}
          >
            {COUNTDOWN.slice(0, step + 1).map((word) => (
              <span key={word}>{word}</span>
            ))}
          </div>
        )}

        {status === "saving" && (
          <div aria-hidden="true" className="absolute inset-0 animate-[luke-flash_400ms_ease-out_forwards] bg-white" />
        )}

        {status === "done" && (
          <p
            aria-hidden="true"
            className={`absolute inset-x-0 top-[66%] text-[clamp(1.75rem,9vw,4.5rem)] text-white ${OVERLAY_TEXT}`}
          >
            {message}
          </p>
        )}
      </div>

      {/* Capture button: a lavender ring around a lavender disc, with a purple
          gap between them. The disc shrinks a little while pressed. It stays
          on screen, dimmed, while it cannot be used, so it never jumps. */}
      <div className="flex shrink-0 justify-center py-[clamp(0.5rem,2dvh,1.5rem)]">
        <button
          type="button"
          aria-label="Take picture"
          onClick={handleTakePicture}
          disabled={status !== "ready"}
          className="group aspect-square w-[clamp(3rem,14vw,6.5rem)] rounded-full border-[clamp(2px,0.8vw,5px)] border-[var(--luke-lavender)] p-[clamp(2px,0.8vw,5px)] transition-opacity disabled:opacity-50"
        >
          <span className="block h-full w-full rounded-full bg-[var(--luke-lavender)] transition-transform duration-100 group-active:scale-90 group-disabled:scale-100" />
        </button>
      </div>
    </SceneFrame>
  );
}

/** Rejects rather than throws, so callers only ever handle a failed promise. */
async function openCamera(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    // Named so describeCameraError can tell the visitor why, not just that it failed.
    throw Object.assign(
      new Error("getUserMedia is unavailable; the page must be served over https or localhost"),
      { name: "InsecureContextError" },
    );
  }
  return navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
}

function stopStream(stream: MediaStream) {
  for (const track of stream.getTracks()) track.stop();
}

function describeCameraError(error: unknown): string {
  // getUserMedia rejects with a DOMException, which is not always an Error subclass.
  const name = typeof error === "object" && error !== null && "name" in error ? String(error.name) : "";
  if (name === "InsecureContextError") return "The camera only works when this page is opened over https or on localhost.";
  if (name === "NotAllowedError") return "Camera access was blocked. Allow it in the browser to take pictures.";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "No camera is connected to this kiosk.";
  if (name === "NotReadableError") return "The camera is in use by another program.";
  return "The camera could not be started.";
}
