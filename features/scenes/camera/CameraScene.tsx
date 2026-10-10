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
 * background, above a row of controls: a filters button, a camera-app style
 * capture button, and a thumbnail of the last photo taken on this visit, which
 * opens enlarged on a tap, as in the gallery scene.
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

/**
 * What the filters button cycles through, in order. `css` is a CSS filter,
 * applied to the live preview and drawn into the saved photo by `captureFrame`.
 */
export const FILTERS = [
  { name: "No filter", css: "none" },
  { name: "Black and white", css: "grayscale(1)" },
  { name: "Sepia", css: "sepia(0.9)" },
  { name: "Vivid", css: "saturate(1.8) contrast(1.1)" },
  { name: "Cool", css: "hue-rotate(180deg) saturate(1.2)" },
] as const;

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
  const [filterIndex, setFilterIndex] = useState(0);
  /** Object URL of the last photo saved on this visit, for the thumbnail. */
  const [lastPhoto, setLastPhoto] = useState<string | null>(null);
  /** Whether the last photo is open in the enlarged view. */
  const [enlarged, setEnlarged] = useState(false);
  const filter = FILTERS[filterIndex];

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
      captureFrame(video, filter.css)
        .then(async (photo) => {
          await uploadPhoto(photo);
          return photo;
        })
        .then(
          (photo) => {
            setLastPhoto(URL.createObjectURL(photo));
            setMessage(THANK_YOU_TEXT[Math.floor(Math.random() * THANK_YOU_TEXT.length)]);
          },
          (error: unknown) => {
            console.error("CameraScene: could not save photo", error);
            setMessage("Sorry, that one didn't save. Try again!");
          },
        )
        .finally(() => setStatus("done"));
    }, COUNTDOWN_STEP_MS);

    return () => clearTimeout(timer);
  }, [status, step, filter]);

  // Free each thumbnail's object URL once a newer photo replaces it, and the
  // last one when the scene leaves the screen, so the next visitor starts
  // with an empty thumbnail.
  useEffect(() => {
    if (!lastPhoto) return;
    return () => URL.revokeObjectURL(lastPhoto);
  }, [lastPhoto]);

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

  function openLastPhoto() {
    handle.reportActivity();
    setEnlarged(true);
  }

  function closeLastPhoto() {
    handle.reportActivity();
    setEnlarged(false);
  }

  function handleNextFilter() {
    handle.reportActivity();
    setFilterIndex((index) => (index + 1) % FILTERS.length);
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
          style={{ filter: filter.css }}
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

      {/* Controls row, from the mockup: filters on the left, the capture
          button in the middle, the last photo on the right. Three equal
          columns keep the capture button centred whatever the sides hold. */}
      <div className="grid shrink-0 grid-cols-3 items-center justify-items-center py-[clamp(0.5rem,2dvh,1.5rem)]">
        <button
          type="button"
          aria-label={`Change filter, now ${filter.name}`}
          onClick={handleNextFilter}
          // The photo is taken with the filter on screen at "Pose!", so it
          // can't change mid-countdown.
          disabled={status === "countdown" || status === "saving"}
          className="flex aspect-square w-[clamp(2.5rem,12vw,5.5rem)] items-center justify-center rounded-full bg-[var(--luke-lavender)] text-[var(--luke-purple)] transition-[filter,opacity] active:brightness-90 disabled:opacity-50"
        >
          <SparklesIcon />
        </button>

        {/* Capture button: a lavender ring around a lavender disc, with a
            purple gap between them. The disc shrinks a little while pressed.
            It stays on screen, dimmed, while it cannot be used, so it never
            jumps. */}
        <button
          type="button"
          aria-label="Take picture"
          onClick={handleTakePicture}
          disabled={status !== "ready"}
          className="group aspect-square w-[clamp(3rem,14vw,6.5rem)] rounded-full border-[clamp(2px,0.8vw,5px)] border-[var(--luke-lavender)] p-[clamp(2px,0.8vw,5px)] transition-opacity disabled:opacity-50"
        >
          <span className="block h-full w-full rounded-full bg-[var(--luke-lavender)] transition-transform duration-100 group-active:scale-90 group-disabled:scale-100" />
        </button>

        {/* Last photo taken on this visit, which opens enlarged on a tap.
            Before the first photo it is a lilac placeholder with a person
            icon, and does nothing. */}
        {lastPhoto ? (
          <button
            type="button"
            aria-label="Enlarge your last photo"
            onClick={openLastPhoto}
            // Locked during a capture, like the filters button, so the
            // enlarged view can't hide the countdown.
            disabled={status === "countdown" || status === "saving"}
            className="aspect-square w-[clamp(2.5rem,12vw,5.5rem)] overflow-hidden rounded-full transition-[filter,opacity] active:brightness-90 disabled:opacity-50"
          >
            {/* A blob URL, which next/image cannot optimise. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={lastPhoto} alt="Your last photo" className="h-full w-full object-cover" />
          </button>
        ) : (
          <div
            aria-hidden="true"
            className="flex aspect-square w-[clamp(2.5rem,12vw,5.5rem)] items-center justify-center rounded-full border-[clamp(1.5px,0.5vw,3px)] border-[var(--luke-lavender)] bg-[var(--luke-lilac)] text-[var(--luke-purple)]"
          >
            <PersonIcon />
          </div>
        )}
      </div>

      {/* Same enlarged view as the gallery scene: the photo in a gold frame
          over a dimmed screen, closed by a tap anywhere. */}
      {enlarged && lastPhoto && (
        <button
          type="button"
          aria-label="Close enlarged photo"
          onClick={closeLastPhoto}
          className="fixed inset-0 z-30 flex items-center justify-center bg-black/60"
        >
          <span className="relative block h-[70vh] w-[70vw] max-w-2xl rounded-lg border-8 border-[var(--luke-gold)] bg-white p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={lastPhoto} alt="" className="h-full w-full object-contain" />
          </span>
        </button>
      )}
    </SceneFrame>
  );
}

/** Head and shoulders outline, the mockup's empty-thumbnail icon. */
function PersonIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3/5 w-3/5"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" />
    </svg>
  );
}

/** Three four-pointed stars, the mockup's filters icon. */
function SparklesIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3/5 w-3/5" fill="currentColor" aria-hidden="true">
      <path d="M10 2 Q11 9 18 10 Q11 11 10 18 Q9 11 2 10 Q9 9 10 2Z" />
      <path d="M18.5 13 Q19 16.5 22 17 Q19 17.5 18.5 21 Q18 17.5 15 17 Q18 16.5 18.5 13Z" />
      <path d="M5.5 15 Q6 18.5 9 19 Q6 19.5 5.5 23 Q5 19.5 2 19 Q5 18.5 5.5 15Z" />
    </svg>
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
