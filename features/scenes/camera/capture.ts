/**
 * Browser half of taking a picture: grab the current video frame and send it
 * to `app/api/photos`, which stands in for Processing's `saveFrame()`.
 */

const JPEG_QUALITY = 0.9;

/** Draw the video's current frame, at the camera's native resolution, to a JPEG. */
export function captureFrame(video: HTMLVideoElement): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const context = canvas.getContext("2d");
  if (!context || canvas.width === 0 || canvas.height === 0) {
    return Promise.reject(new Error("Camera has no frame to capture yet"));
  }
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
