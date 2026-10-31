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
 * colour, pen and eraser along the top left, and a trash can on the right that
 * clears the board. The colour button opens into a pill listing the inks.
 */

// Upstream ink colour: fill(51, 30, 84). The default ink.
const PURPLE = "rgb(51, 30, 84)";

/** Ink colours, in the order the colour menu lists them. From the drawing mockup. */
const INKS = [
  { name: "Red", value: "#e04c46" },
  { name: "Yellow", value: "#f0cd48" },
  { name: "Green", value: "#71c467" },
  { name: "Blue", value: "#5588f6" },
  { name: "Purple", value: PURPLE },
] as const;

type Ink = (typeof INKS)[number]["value"];

/** How long the colour menu takes to open or close. */
const COLOUR_MENU_ANIMATION_MS = 300;
/** How long each colour takes to fade and slide in or out. */
const COLOUR_FADE_MS = 150;
/** Height of each colour below the top one, as a fraction of the button. */
const COLOUR_SLOT = 0.615;

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
  const [ink, setInk] = useState<Ink>(PURPLE);
  const [colourMenuOpen, setColourMenuOpen] = useState(false);

  function selectTool(next: Tool) {
    setTool(next);
    setColourMenuOpen(false);
    moveEraserCursor(null);
  }

  // Picking a colour means the visitor wants to draw with it.
  function selectInk(next: Ink) {
    setInk(next);
    selectTool("pen");
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
    setColourMenuOpen(false);
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
    context.strokeStyle = ink;
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
            between and around the buttons. `--tool` is every button's size. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between px-[3%] pt-[3%] [--tool:clamp(2.5rem,12vw,4.5rem)]">
          <div role="toolbar" aria-label="Drawing tools" className="flex gap-[clamp(0.25rem,1.5vw,0.75rem)]">
            <ColourPicker
              ink={ink}
              open={colourMenuOpen}
              onToggle={() => setColourMenuOpen((open) => !open)}
              onSelect={selectInk}
            />
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

interface ColourPickerProps {
  ink: Ink;
  open: boolean;
  onToggle: () => void;
  onSelect: (ink: Ink) => void;
}

/**
 * The colour button, from the drawing mockup. Closed, it's a round button
 * showing the current ink. Tapped, it grows downwards into a pill: the current
 * ink stays on top, and the other inks appear below it in `INKS` order, each
 * fading in as the pill's edge reaches it. Picking one selects it and closes
 * the menu; tapping the top dot closes it unchanged.
 */
function ColourPicker({ ink, open, onToggle, onSelect }: ColourPickerProps) {
  const current = INKS.find((option) => option.value === ink) ?? INKS[INKS.length - 1];
  const others = INKS.filter((option) => option.value !== ink);
  // Spread the fades across the pill's growth, last one ending with it.
  const stagger = (COLOUR_MENU_ANIMATION_MS - COLOUR_FADE_MS) / (others.length - 1);

  return (
    // Holds the button's place in the toolbar; the pill grows out of it over
    // the board without moving the other buttons.
    <div className="relative aspect-square w-[var(--tool)]">
      <div
        className="pointer-events-auto absolute inset-x-0 top-0 z-10 flex flex-col overflow-hidden rounded-full border-[clamp(2px,0.6vw,4px)] border-[var(--luke-purple)] bg-[var(--luke-lavender)] transition-[height] ease-out motion-reduce:transition-none"
        style={{
          height: open ? `calc(var(--tool) * ${1 + others.length * COLOUR_SLOT})` : "var(--tool)",
          transitionDuration: `${COLOUR_MENU_ANIMATION_MS}ms`,
        }}
      >
        <button
          type="button"
          aria-label={`Pen colour: ${current.name}`}
          aria-expanded={open}
          onClick={onToggle}
          className="flex aspect-square w-full shrink-0 items-center justify-center transition-[filter] active:brightness-90"
        >
          <span className="aspect-square w-[55%] rounded-full" style={{ backgroundColor: current.value }} />
        </button>

        {others.map((option, i) => (
          <button
            key={option.value}
            type="button"
            aria-label={option.name}
            onClick={() => onSelect(option.value)}
            // Hidden colours can't be tapped or reached with the keyboard.
            disabled={!open}
            tabIndex={open ? 0 : -1}
            className="flex w-full shrink-0 items-center justify-center transition-[opacity,translate] ease-out motion-reduce:transition-none"
            style={{
              height: `calc(var(--tool) * ${COLOUR_SLOT})`,
              opacity: open ? 1 : 0,
              translate: open ? "0 0" : "0 -50%",
              transitionDuration: `${COLOUR_FADE_MS}ms`,
              // Top to bottom on the way out, bottom to top on the way in.
              transitionDelay: `${(open ? i : others.length - 1 - i) * stagger}ms`,
            }}
          >
            {/* Slightly smaller than the selected colour's dot. */}
            <span className="aspect-square w-[45%] rounded-full" style={{ backgroundColor: option.value }} />
          </button>
        ))}
      </div>
    </div>
  );
}

interface ToolButtonProps {
  label: string;
  children: React.ReactNode;
  onClick?: () => void;
  /** Set on the pen and eraser: whether this is the tool in use. */
  pressed?: boolean;
}

/**
 * A round toolbar button from the drawing mockup: lavender with a purple
 * outline and icon. The tool in use gets a thicker outline.
 */
function ToolButton({ label, children, onClick, pressed }: ToolButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      onClick={onClick}
      className={`pointer-events-auto flex aspect-square w-[var(--tool)] items-center justify-center rounded-full border-[var(--luke-purple)] bg-[var(--luke-lavender)] text-[var(--luke-purple)] transition-[filter] active:brightness-90 ${
        pressed ? "border-[clamp(3.5px,1.1vw,7px)]" : "border-[clamp(2px,0.6vw,4px)]"
      }`}
    >
      {children}
    </button>
  );
}
