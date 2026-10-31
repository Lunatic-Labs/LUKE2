"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SceneFrame } from "@/components/SceneFrame";

/**
 * "Touch to Draw!" whiteboard.
 *
 * Ported from `src/luke_java/BoardScene.pde`. Upstream drew `line()` segments
 * straight into the Processing canvas while the pointer was down (purple, 2px),
 * with the erase toggle drawing white 30px segments over them; releasing the
 * pointer reset the segment chain, and `Enable()` cleared the canvas white. The
 * scene remounts on scene change here, so a fresh mount is the cleared board.
 *
 * Changes from upstream: a Clear button that wipes the whole canvas at once,
 * and a real eraser. The canvas holds only ink on a transparent background,
 * with the white board behind it in CSS, and the eraser removes ink
 * (`destination-out`) instead of painting white over it, so it erases any
 * colour. The toolbar follows the drawing mockup: round icon buttons for the
 * colour (not wired up yet), pen and eraser along the top left, and a trash
 * can on the right that clears the board.
 */

// Upstream ink colour: fill(51, 30, 84).
const PURPLE = "rgb(51, 30, 84)";

const PEN_WIDTH = 2;
const ERASER_WIDTH = 30;

type Tool = "pen" | "eraser";

interface Point {
  x: number;
  y: number;
}

// The shell passes `bounds` and `handle`; the board needs neither.
export function BoardScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const activePointerIdRef = useRef<number | null>(null);
  // Upstream `points`: the previous segment endpoint, -1 when not drawing.
  const lastPointRef = useRef<Point | null>(null);
  // Grey circle showing the eraser's reach while an erase stroke is under way.
  const eraserCursorRef = useRef<HTMLDivElement>(null);
  const [tool, setTool] = useState<Tool>("pen");
  const eraseMode = tool === "eraser";

  function selectTool(next: Tool) {
    setTool(next);
    moveEraserCursor(null);
  }

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

        {/* The row itself lets touches through, so the board can be drawn on
            between and around the buttons. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between px-[3%] pt-[3%]">
          <div role="toolbar" aria-label="Drawing tools" className="flex gap-[clamp(0.25rem,1.5vw,0.75rem)]">
            {/* Colour picker from the mockup; not wired up yet. The dot shows
                the pen's current ink. */}
            <ToolButton label="Pen colour (coming soon)" disabled>
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[60%] w-[60%]">
                <circle cx="12" cy="12" r="9" fill={PURPLE} />
              </svg>
            </ToolButton>
            <ToolButton label="Pen" pressed={tool === "pen"} onClick={() => selectTool("pen")}>
              <MaskIcon src="/images/board/pen.png" />
            </ToolButton>
            <ToolButton label="Eraser" pressed={tool === "eraser"} onClick={() => selectTool("eraser")}>
              <MaskIcon src="/images/board/eraser.png" />
            </ToolButton>
          </div>

          <ToolButton label="Clear the board" onClick={clearCanvas}>
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-[60%] w-[60%]"
            >
              <path d="M4 6h16" />
              <path d="M9 6V4h6v2" />
              <path d="M6 6l1 14h10l1-14" />
              <path d="M10 10v6" />
              <path d="M14 10v6" />
            </svg>
          </ToolButton>
        </div>
      </div>
    </SceneFrame>
  );
}

/**
 * An icon image used as a mask and filled with the text colour, so it matches
 * the button's purple whatever colour the PNG itself was saved in.
 */
function MaskIcon({ src }: { src: string }) {
  return (
    <span
      aria-hidden="true"
      className="h-[60%] w-[60%] bg-current [mask-position:center] [mask-repeat:no-repeat] [mask-size:contain]"
      style={{ maskImage: `url(${src})`, WebkitMaskImage: `url(${src})` }}
    />
  );
}

interface ToolButtonProps {
  label: string;
  children: React.ReactNode;
  onClick?: () => void;
  /** Set on the pen and eraser: whether this is the tool in use. */
  pressed?: boolean;
  disabled?: boolean;
}

/**
 * A round toolbar button from the drawing mockup: lavender with a purple
 * outline and icon. The tool in use gets a thicker outline.
 */
function ToolButton({ label, children, onClick, pressed, disabled }: ToolButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      onClick={onClick}
      disabled={disabled}
      className={`pointer-events-auto flex aspect-square w-[clamp(2.5rem,12vw,4.5rem)] items-center justify-center rounded-full border-[var(--luke-purple)] bg-[var(--luke-lavender)] text-[var(--luke-purple)] transition-[filter] active:brightness-90 disabled:active:brightness-100 ${
        pressed ? "border-[clamp(3.5px,1.1vw,7px)]" : "border-[clamp(2px,0.6vw,4px)]"
      }`}
    >
      {children}
    </button>
  );
}
