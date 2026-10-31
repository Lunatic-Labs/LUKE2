"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SceneFrame } from "@/components/SceneFrame";
import type { SceneComponentProps } from "@/features/kiosk/types";

/**
 * "Touch to Draw!" whiteboard.
 *
 * Ported from `src/luke_java/BoardScene.pde`. Upstream drew `line()` segments
 * straight into the Processing canvas while the pointer was down (purple, 2px),
 * with the erase toggle drawing white 30px segments over them; releasing the
 * pointer reset the segment chain, and `Enable()` cleared the canvas white. The
 * scene remounts on scene change here, so a fresh mount is the cleared board.
 *
 * Two changes from upstream: a Clear button that wipes the whole canvas at
 * once, and a real eraser. The canvas holds only ink on a transparent
 * background, with the white board behind it in CSS, and the eraser removes
 * ink (`destination-out`) instead of painting white over it, so it erases any
 * colour.
 */

// Upstream colors: fill(51, 30, 84) purple, stroke(244, 170, 0) gold.
const PURPLE = "rgb(51, 30, 84)";
const GOLD = "rgb(244, 170, 0)";

const PEN_WIDTH = 2;
const ERASER_WIDTH = 30;

interface Point {
  x: number;
  y: number;
}

export function BoardScene({ bounds }: SceneComponentProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const activePointerIdRef = useRef<number | null>(null);
  // Upstream `points`: the previous segment endpoint, -1 when not drawing.
  const lastPointRef = useRef<Point | null>(null);
  // Grey circle showing the eraser's reach while an erase stroke is under way.
  const eraserCursorRef = useRef<HTMLDivElement>(null);
  const [eraseMode, setEraseMode] = useState(false);

  // Moved by hand rather than through state, since it follows every pointer move.
  function moveEraserCursor(point: Point | null) {
    const cursor = eraserCursorRef.current;
    if (!cursor) return;
    if (!point) {
      cursor.style.visibility = "hidden";
      return;
    }
    cursor.style.transform = `translate(${point.x - ERASER_WIDTH / 2}px, ${point.y - ERASER_WIDTH / 2}px)`;
    cursor.style.visibility = "visible";
  }

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    // Upstream `Enable()` did `background(255)`; the white is behind the canvas.
    context.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  // Size the canvas to its layout box and start from a clean board.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const resizeCanvas = (preservePixels: boolean) => {
      const nextWidth = canvas.clientWidth;
      const nextHeight = canvas.clientHeight;
      if (nextWidth <= 0 || nextHeight <= 0) return;
      if (
        preservePixels &&
        canvas.width === nextWidth &&
        canvas.height === nextHeight
      ) return;

      const previousCanvas =
        preservePixels && canvas.width > 0 && canvas.height > 0
          ? (() => {
              const snapshot = document.createElement("canvas");
              snapshot.width = canvas.width;
              snapshot.height = canvas.height;
              snapshot.getContext("2d")?.drawImage(canvas, 0, 0);
              return snapshot;
            })()
          : null;

      // Resizing a canvas clears it to transparent.
      canvas.width = nextWidth;
      canvas.height = nextHeight;

      if (previousCanvas) {
        context.drawImage(previousCanvas, 0, 0, canvas.width, canvas.height);
      }
    };

    resizeCanvas(false);

    const handleResize = () => {
      drawingRef.current = false;
      lastPointRef.current = null;
      activePointerIdRef.current = null;
      if (eraserCursorRef.current) eraserCursorRef.current.style.visibility = "hidden";
      resizeCanvas(true);
    };

    window.addEventListener("resize", handleResize);
    window.visualViewport?.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.visualViewport?.removeEventListener("resize", handleResize);
    };
  }, []);

  function canvasPoint(event: React.PointerEvent<HTMLCanvasElement>): Point {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    if (activePointerIdRef.current !== null) return;
    activePointerIdRef.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    drawingRef.current = true;
    lastPointRef.current = canvasPoint(event);
    if (eraseMode) moveEraserCursor(lastPointRef.current);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (event.pointerId !== activePointerIdRef.current) return;
    if (!drawingRef.current) return;

    const context = canvasRef.current?.getContext("2d");
    const from = lastPointRef.current;
    if (!context || !from) return;

    const to = canvasPoint(event);
    // `destination-out` removes whatever the stroke covers, leaving the canvas
    // transparent so the white board behind it shows through.
    context.globalCompositeOperation = eraseMode ? "destination-out" : "source-over";
    context.strokeStyle = PURPLE;
    context.lineWidth = eraseMode ? ERASER_WIDTH : PEN_WIDTH;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.beginPath();
    context.moveTo(from.x, from.y);
    context.lineTo(to.x, to.y);
    context.stroke();

    lastPointRef.current = to;
    if (eraseMode) moveEraserCursor(to);
  }

  // `ClickRelease()` reset the point chain so strokes don't reconnect.
  function endStroke(event: React.PointerEvent<HTMLCanvasElement>) {
    if (event.pointerId !== activePointerIdRef.current) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    drawingRef.current = false;
    lastPointRef.current = null;
    activePointerIdRef.current = null;
    moveEraserCursor(null);
  }

  return (
    // White like the other pages, covering the shell's lavender; the
    // transparent canvas sits on top, so erased ink reveals this white.
    <SceneFrame className="bg-white text-black">
      <div className="relative min-h-0 flex-1 touch-none">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endStroke}
          onPointerCancel={endStroke}
          className="absolute inset-0 h-full w-full"
        />

        <div
          ref={eraserCursorRef}
          aria-hidden="true"
          className="pointer-events-none invisible absolute top-0 left-0 rounded-full bg-[#d9d9d9]/30"
          style={{ width: ERASER_WIDTH, height: ERASER_WIDTH }}
        />

        <h2
          className="pointer-events-none absolute inset-x-0 top-0 text-center font-semibold"
          style={{ color: PURPLE, fontSize: bounds.width / 11 }}
        >
          Touch to Draw!
        </h2>

        <button
          type="button"
          onClick={() => {
            setEraseMode((current) => !current);
            moveEraserCursor(null);
          }}
          className="absolute rounded border"
          style={{
            left: "2%",
            top: "92%",
            width: "20%",
            height: "7%",
            backgroundColor: PURPLE,
            borderColor: GOLD,
            color: GOLD,
          }}
        >
          {eraseMode ? "Draw" : "Erase"}
        </button>

        <button
          type="button"
          onClick={clearCanvas}
          className="absolute rounded border"
          style={{
            left: "24%",
            top: "92%",
            width: "20%",
            height: "7%",
            backgroundColor: PURPLE,
            borderColor: GOLD,
            color: GOLD,
          }}
        >
          Clear
        </button>
      </div>
    </SceneFrame>
  );
}
