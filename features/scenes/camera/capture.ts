/**
 * Browser half of taking a picture: grab the current video frame and send it
 * to `app/api/photos`, which stands in for Processing's `saveFrame()`.
 */

const JPEG_QUALITY = 0.9;

/**
 * The largest capture worth asking the camera for: the screen it will be
 * stretched across. getUserMedia treats `ideal` as a soft preference, so the
 * camera delivers its best profile up to this size — the effective resolution
 * is whichever is lower, the camera's or the screen's.
 */
export function idealCaptureSize(): { width: number; height: number } {
  const width = Math.round(window.screen.width * (window.devicePixelRatio || 1));
  const height = Math.round(window.screen.height * (window.devicePixelRatio || 1));
  // Some embedded browsers (and jsdom) report a 0x0 screen; fall back to full HD.
  if (!width || !height) return { width: 1920, height: 1080 };
  return { width, height };
}
/**
 * Draw the video's current frame, at the camera's native resolution, to a JPEG.
 * `filter` is a CSS filter string, the same one the preview shows, so the
 * saved photo looks like what the visitor saw.
 */
export function captureFrame(video: HTMLVideoElement, filter = "none"): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const context = canvas.getContext("2d");
  if (!context || canvas.width === 0 || canvas.height === 0) {
    return Promise.reject(new Error("Camera has no frame to capture yet"));
  }
  context.filter = filter;
  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not encode photo"))),
      "image/jpeg",
      JPEG_QUALITY,
    );
  });
}

export async function uploadPhoto(photo: Blob): Promise<void> {
  const response = await fetch("/api/photos", {
    method: "POST",
    headers: { "Content-Type": "image/jpeg" },
    body: photo,
  });
  if (!response.ok) {
    throw new Error(`Photo upload failed with ${response.status}`);
  }
}
