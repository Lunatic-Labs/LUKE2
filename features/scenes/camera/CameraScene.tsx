"use client";

import { useEffect, useRef, useState } from "react";
import { SceneFrame } from "@/components/SceneFrame";
import type { SceneComponentProps } from "@/features/kiosk/types";
import { captureFrame, uploadPhoto } from "./capture";

/**
 * Take a Picture!
 *
 * Ported from `src/luke_java/CameraScene.pde`. A live preview fills the scene
 * under an outlined "Touch to take a picture!" prompt; a tap runs the gold
 * Ready / Set / Pose! countdown, saves the frame to the photo directory the
 * gallery reads, and holds for a second before the next picture.
 *
 * Processing's `Capture` becomes `getUserMedia`, which only works in a secure
 * context (https or localhost) and after the browser's permission prompt. The
 * stream is opened on mount and stopped on unmount, standing in for upstream's
 * `video.start()` / `video.stop()`.
 */

export const COUNTDOWN = ["Ready", "Set", "Pose!"];
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

export function CameraScene({ handle }: SceneComponentProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<Status>("starting");
  const [step, setStep] = useState(0);
  const [message, setMessage] = useState("");

  // Open the camera for as long as the scene is on screen.
  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;

    openCamera().then(
      (opened) => {
        if (cancelled) {
          stopStream(opened);
          return;
        }
        stream = opened;
        if (videoRef.current) videoRef.current.srcObject = opened;
        setStatus("ready");
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

  function handleTap() {
    handle.reportActivity();
    // Upstream's `canTakePicture` guard: one capture at a time.
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

  return (
    <SceneFrame className="bg-black">
      <div
        onClick={handleTap}
        role="button"
        tabIndex={0}
        aria-label="Take a picture"
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") handleTap();
        }}
        className="relative h-full w-full cursor-pointer select-none"
      >
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
        />

        {status === "ready" && (
          <p className="absolute inset-x-0 top-[8%] px-4 text-center font-serif text-4xl text-white [-webkit-text-stroke:6px_black] [paint-order:stroke_fill]">
            Touch to take a picture!
          </p>
        )}

        {status === "countdown" && (
          <div className="absolute inset-x-0 top-[33%] flex flex-col items-center gap-2 font-serif text-6xl font-bold text-[var(--luke-gold)] [-webkit-text-stroke:4px_black] [paint-order:stroke_fill]">
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
            role="status"
            className="absolute inset-x-0 bottom-[12%] px-4 text-center font-serif text-4xl text-white [-webkit-text-stroke:6px_black] [paint-order:stroke_fill]"
          >
            {message}
          </p>
        )}
      </div>
    </SceneFrame>
  );
}

/** Rejects rather than throws, so callers only ever handle a failed promise. */
async function openCamera(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("getUserMedia is unavailable; the page must be served over https or localhost");
  }
  return navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
}

function stopStream(stream: MediaStream) {
  for (const track of stream.getTracks()) track.stop();
}

function describeCameraError(error: unknown): string {
  // getUserMedia rejects with a DOMException, which is not always an Error subclass.
  const name = typeof error === "object" && error !== null && "name" in error ? String(error.name) : "";
  if (name === "NotAllowedError") return "Camera access was blocked. Allow it in the browser to take pictures.";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "No camera is connected to this kiosk.";
  if (name === "NotReadableError") return "The camera is in use by another program.";
  return "The camera could not be started.";
}
