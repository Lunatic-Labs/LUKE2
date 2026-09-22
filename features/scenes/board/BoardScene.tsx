"use client";

import { useEffect, useRef, useState } from "react";
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
 */

// Upstream colors: fill(51, 30, 84) purple, stroke(244, 170, 0) gold.
const PURPLE = "rgb(51, 30, 84)";
const GOLD = "rgb(244, 170, 0)";

interface Point {
  x: number;
  y: number;
}

export function BoardScene({ bounds }: SceneComponentProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  // Upstream `points`: the previous segment endpoint, -1 when not drawing.
  const lastPointRef = useRef<Point | null>(null);
  const [eraseMode, setEraseMode] = useState(false);

  // `Enable()` did `background(255)` — fill the canvas white as it mounts.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    context.fillStyle = "white";
    context.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  function canvasPoint(event: React.PointerEvent<HTMLCanvasElement>): Point {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    drawingRef.current = true;
    lastPointRef.current = canvasPoint(event);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;

    const context = canvasRef.current?.getContext("2d");
    const from = lastPointRef.current;
    if (!context || !from) return;

    const to = canvasPoint(event);
    context.strokeStyle = eraseMode ? "white" : PURPLE; // White color for erasing
    context.lineWidth = eraseMode ? 30 : 2;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.beginPath();
    context.moveTo(from.x, from.y);
    context.lineTo(to.x, to.y);
    context.stroke();

    lastPointRef.current = to;
  }

  // `ClickRelease()` reset the point chain so strokes don't reconnect.
  function endStroke() {
    drawingRef.current = false;
    lastPointRef.current = null;
  }

  return (
    <SceneFrame>
      <div className="relative min-h-0 flex-1 touch-none">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endStroke}
          onPointerCancel={endStroke}
          className="absolute inset-0 h-full w-full"
        />

        <h2
          className="pointer-events-none absolute inset-x-0 top-0 text-center font-semibold"
          style={{ color: PURPLE, fontSize: bounds.width / 11 }}
        >
          Touch to Draw!
        </h2>

        <button
          type="button"
          onClick={() => setEraseMode((current) => !current)}
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
      </div>
    </SceneFrame>
  );
}
