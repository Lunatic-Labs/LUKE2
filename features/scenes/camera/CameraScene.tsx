"use client";

import { useEffect, useRef, useState } from "react";
import { SceneFrame } from "@/components/SceneFrame";
import type { SceneComponentProps } from "@/features/kiosk/types";
import { captureFrame, idealCaptureSize, newSnapshotKey, uploadPhoto, type SnapshotKey } from "./capture";

/**
 * Take a Picture!
 *
 * Ported from `src/luke_java/CameraScene.pde`. Following the camera mockup, a
 * live preview with rounded corners fills most of the scene, inset on a purple
 * background, above a row of controls: a filters button, a camera-app style
 * capture button, and the snapshot button: a round thumbnail of the last
 * photo taken on this visit.
 * Upstream took a picture on a tap anywhere; a dedicated button keeps a
 * visitor who is only touching the screen from setting off the camera. The
 * button runs the gold Ready / Set / Pose! countdown and grabs the frame into
 * the snapshot button, keeping it in memory only. Tapping the snapshot button
 * opens the photo in a preview card over the dimmed camera, and the card's
 * upload button is the only thing that stores it, in the photo directory
 * (which `/api/gallery` lists alongside `public/gallery`). Closing the card,
 * taking another picture or leaving the scene drops a photo that was never
 * uploaded.
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

type Status =
  | "starting"
  | "ready"
  | "countdown"
  /** The flash, while the frame is grabbed. */
  | "capturing"
  /** The snapshot is open in the preview card. */
  | "review"
  /** The snapshot is being sent to the server from the preview card. */
  | "uploading"
  | "done"
  | "unavailable";

/** Shown for a second after a picture is taken, pointing at the snapshot button. */
export const SNAPSHOT_HINT = "Tap your snapshot to see it!";
/** Announced to screen readers when the preview card opens. */
export const REVIEW_PROMPT = "Your snapshot. Tap upload to add it to the gallery.";
/** Shown in the card's footer once its photo is in the gallery. */
export const UPLOADED_TEXT = "In the gallery!";
export const UPLOAD_FAILED_TEXT = "Sorry, that didn't upload. Try again!";
export const CAPTURE_FAILED_TEXT = "Sorry, that one didn't work. Try again!";

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
  /**
   * The snapshot: the last photo taken on this visit, as the JPEG, kept in
   * memory until the visitor uploads it, and an object URL of it for the
   * snapshot button and the preview card. Taking a photo never stores it;
   * only `handleUpload` does. `key` is made once, when the picture is taken,
   * and sent with every upload of it, so the server saves it at most once
   * even if an upload is retried after its response was lost.
   */
  const [lastPhoto, setLastPhoto] = useState<{ blob: Blob; url: string; key: SnapshotKey } | null>(null);
  /** The key of the snapshot once it has been uploaded, so the card won't offer it again. */
  const [uploadedId, setUploadedId] = useState<string | null>(null);
  /**
   * True from the moment an upload starts until it settles. The state checks
   * in `handleUpload` only see the last render, so two taps landing before
   * React re-renders would both pass them; a ref changes at once, so the
   * second tap is turned away. Set only in event handlers and callbacks,
   * never during render.
   */
  const uploadingRef = useRef(false);
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
      setStatus("capturing");
      setMessage("");
      captureFrame(video, filter.css).then(
        (blob) => {
          if (videoRef.current !== video) return;
          setLastPhoto({ blob, url: URL.createObjectURL(blob), key: newSnapshotKey() });
          setMessage(SNAPSHOT_HINT);
          setStatus("done");
        },
        (error: unknown) => {
          if (videoRef.current !== video) return;
          console.error("CameraScene: could not capture photo", error);
          setMessage(CAPTURE_FAILED_TEXT);
          setStatus("done");
        },
      );
    }, COUNTDOWN_STEP_MS);

    return () => clearTimeout(timer);
  }, [status, step, filter]);

  // Free each thumbnail's object URL once a newer photo replaces it, and the
  // last one when the scene leaves the screen, so the next visitor starts
  // with an empty thumbnail.
  useEffect(() => {
    if (!lastPhoto) return;
    return () => URL.revokeObjectURL(lastPhoto.url);
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
    // also disabled otherwise; this keeps the rule in one place. Taking a new
    // picture with the preview card open closes it, and the new photo
    // replaces the snapshot, uploaded or not.
    if (status !== "ready" && status !== "review") return;
    setMessage("");
    setStep(0);
    setStatus("countdown");
  }

  /** The only place a photo is stored: the preview card's upload button. */
  function handleUpload() {
    handle.reportActivity();
    if (uploadingRef.current) return;
    if (status !== "review" || !lastPhoto || uploadedId === lastPhoto.key.id) return;
    uploadingRef.current = true;
    const video = videoRef.current;
    const { key } = lastPhoto;
    setStatus("uploading");
    setMessage("");
    uploadPhoto(lastPhoto.blob, key).then(
      () => {
        uploadingRef.current = false;
        if (videoRef.current !== video) return;
        setUploadedId(key.id);
        setMessage(THANK_YOU_TEXT[Math.floor(Math.random() * THANK_YOU_TEXT.length)]);
        setStatus("done");
      },
      (error: unknown) => {
        uploadingRef.current = false;
        if (videoRef.current !== video) return;
        console.error("CameraScene: could not upload photo", error);
        // Stay on the card so the visitor can try again.
        setMessage(UPLOAD_FAILED_TEXT);
        setStatus("review");
      },
    );
  }

  /**
   * The snapshot button: opens the preview card, or closes it if it is
   * already open. Also works during the second-long hold after a capture,
   * which is when the hint points at it.
   */
  function handleSnapshot() {
    handle.reportActivity();
    if (!lastPhoto) return;
    if (status === "review") {
      closeSnapshot();
      return;
    }
    if (status !== "ready" && status !== "done") return;
    setMessage("");
    setStatus("review");
  }

  /** Closes the preview card. The snapshot stays in the button, unstored unless uploaded. */
  function handleCloseSnapshot() {
    handle.reportActivity();
    closeSnapshot();
  }

  function closeSnapshot() {
    if (status !== "review") return;
    setMessage("");
    setStatus("ready");
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
  const reviewing = (status === "review" || status === "uploading") && lastPhoto !== null;
  const uploaded = lastPhoto !== null && uploadedId === lastPhoto.key.id;
  const busy = status === "countdown" || status === "capturing" || status === "uploading";
  const cardNote = message || (uploaded ? UPLOADED_TEXT : "");
  const announcement =
    status === "countdown"
      ? COUNTDOWN[step]
      : status === "done"
        ? message
        : status === "review"
          ? cardNote || REVIEW_PROMPT
          : "";

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

        {/* The camera flash. Keyed on the photo so it plays again for each
            new one; it fades to nothing and never blocks a tap. */}
        {(status === "capturing" || lastPhoto) && (
          <div
            key={lastPhoto?.url ?? "capturing"}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 animate-[luke-flash_400ms_ease-out_forwards] bg-white"
          />
        )}

        {/* Preview card, from the camera mockup, opened by the snapshot
            button: the photo in a purple card over the dimmed live camera,
            with an upload button at the bottom right. Tapping the dimmed area
            around the card closes it; only the upload button stores the
            photo. */}
        {reviewing && (
          <>
            <button
              type="button"
              aria-label="Close snapshot"
              onClick={handleCloseSnapshot}
              disabled={status !== "review"}
              className="absolute inset-0 bg-white/40"
            />
            <div className="absolute inset-x-[9%] top-[3%] bottom-[9%] flex flex-col gap-[clamp(0.25rem,1dvh,0.75rem)] rounded-[clamp(0.5rem,1.5dvh,1.25rem)] bg-[var(--luke-purple)] p-[clamp(0.375rem,1.2dvh,1rem)] shadow-[0_4px_12px_rgb(0_0_0/0.35)]">
              {/* A blob URL, which next/image cannot optimise. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lastPhoto.url}
                alt="Your snapshot"
                className="min-h-0 w-full flex-1 rounded-[clamp(0.25rem,0.8dvh,0.75rem)] object-cover"
              />
              <div className="flex shrink-0 items-center justify-end gap-[3%]">
                {status === "review" && cardNote && (
                  <p className="min-w-0 flex-1 text-[clamp(0.75rem,3.5vw,1.5rem)] leading-tight font-semibold text-[var(--luke-lavender)]">
                    {cardNote}
                  </p>
                )}
                <button
                  type="button"
                  aria-label="Upload photo to the gallery"
                  onClick={handleUpload}
                  // Disabled once uploaded, so the same photo is never stored twice.
                  disabled={status !== "review" || uploaded}
                  className="shrink-0 text-[var(--luke-lavender)] transition-[filter,opacity] active:brightness-75 disabled:opacity-50"
                >
                  <UploadIcon />
                </button>
              </div>
            </div>
          </>
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
          disabled={busy}
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
          disabled={status !== "ready" && status !== "review"}
          className="group aspect-square w-[clamp(3rem,14vw,6.5rem)] rounded-full border-[clamp(2px,0.8vw,5px)] border-[var(--luke-lavender)] p-[clamp(2px,0.8vw,5px)] transition-opacity disabled:opacity-50"
        >
          <span className="block h-full w-full rounded-full bg-[var(--luke-lavender)] transition-transform duration-100 group-active:scale-90 group-disabled:scale-100" />
        </button>

        {/* Snapshot button: the last photo taken on this visit, which opens
            the preview card on a tap. Before the first photo it is a lilac
            placeholder with a person icon, and does nothing. */}
        {lastPhoto ? (
          <button
            type="button"
            aria-label={status === "review" ? "Close snapshot" : "See your snapshot"}
            aria-expanded={reviewing}
            onClick={handleSnapshot}
            // Locked during a capture or upload, like the filters button, so
            // the card can't hide the countdown or close mid-upload.
            disabled={busy}
            className="aspect-square w-[clamp(2.5rem,12vw,5.5rem)] overflow-hidden rounded-full transition-[filter,opacity] active:brightness-90 disabled:opacity-50"
          >
            {/* A blob URL, which next/image cannot optimise. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={lastPhoto.url} alt="" className="h-full w-full object-cover" />
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

/** A tray with an arrow rising out of it, the mockup's upload icon. */
function UploadIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-[clamp(1.5rem,7vw,3rem)]"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 15V3" />
      <path d="M7 8l5-5 5 5" />
      <path d="M4 13v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6" />
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
  // Without explicit constraints browsers fall back to a 640x480 default profile,
  // which pixelates when stretched across the kiosk screen.
  const { width, height } = idealCaptureSize();
  const audio = false;
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user",
        width: { max: width },
        height: { max: height },
      },
      audio,
    });
  } catch (error) {
    if (!(error instanceof DOMException) || error.name !== "OverconstrainedError") throw error;
    return navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user",
        width: { ideal: width },
        height: { ideal: height },
      },
      audio,
    });
  }
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
