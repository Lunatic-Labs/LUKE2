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
 * clears the board. The colour button opens into a pill listing the inks, and
 * the pen and eraser open into pills listing their sizes.
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

interface SizeOption {
  name: string;
  /** Line width in pixels. */
  width: number;
  /** Width of the circle that stands for it in the menu, as a fraction of the button (from the mockup). */
  dot: number;
}

/** Line widths offered by each tool's menu, thinnest first. */
const SIZES: Record<Tool, readonly SizeOption[]> = {
  pen: [
    { name: "Small", width: 5, dot: 0.31 },
    { name: "Medium", width: 20, dot: 0.46 },
    { name: "Large", width: 40, dot: 0.69 },
  ],
  // A 2px eraser barely erases anything, so its smallest is wider.
  eraser: [
    { name: "Small", width: 10, dot: 0.31 },
    { name: "Medium", width: 20, dot: 0.46 },
    { name: "Large", width: 40, dot: 0.69 },
  ],
};

/** Both tools start on the middle size, as in the mockup. */
const DEFAULT_SIZE = 20;

/** How long a menu takes to open or close. */
const MENU_ANIMATION_MS = 300;
/** How long each option takes to fade and slide in or out. */
const MENU_FADE_MS = 150;
/**
 * An open menu's height in buttons, as in the mockup; its options share the
 * space below the top button, unless a menu sets its own row height.
 */
const MENU_OPEN_HEIGHT = 3.46;
/**
 * The colour menu's layout, in buttons, from the colour menu reference: rows
 * 0.64 apart, pulled 0.17 up under the top button, which leaves the same 0.17
 * margin below the last colour. The menu opens to 1 + 4 × 0.64 = 3.56 buttons.
 */
const COLOUR_SLOT = 0.64;
const COLOUR_LIFT = 0.17;

type Tool = "pen" | "eraser";
type Menu = "colour" | Tool;

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
  // Circle showing the tool's reach: the pen's whenever the pen is in use, the
  // eraser's only while an erase stroke is under way.
  const cursorRef = useRef<HTMLDivElement>(null);
  const [tool, setTool] = useState<Tool>("pen");
  const eraseMode = tool === "eraser";
  const [ink, setInk] = useState<Ink>(PURPLE);
  const [penSize, setPenSize] = useState(DEFAULT_SIZE);
  const [eraserSize, setEraserSize] = useState(DEFAULT_SIZE);
  const lineWidth = eraseMode ? eraserSize : penSize;
  // At most one menu is open at a time.
  const [openMenu, setOpenMenu] = useState<Menu | null>(null);

  // First press picks the tool; once it's picked, presses open and close its
  // size menu.
  function pressTool(next: Tool) {
    if (tool !== next) {
      setTool(next);
      setOpenMenu(null);
      moveCursor(null);
      return;
    }
    setOpenMenu((open) => (open === next ? null : next));
  }

  function selectSize(target: Tool, size: number) {
    if (target === "pen") setPenSize(size);
    else setEraserSize(size);
    setOpenMenu(null);
  }

  // Picking a colour means the visitor wants to draw with it.
  function selectInk(next: Ink) {
    setInk(next);
    if (tool !== "pen") moveCursor(null);
    setTool("pen");
    setOpenMenu(null);
  }

  // Moved by hand rather than through state, since it follows every pointer
  // move. Its size and colour come from state; it's centred on the point
  // whatever its size.
  function moveCursor(point: Point | null) {
    const cursor = cursorRef.current;
    if (!cursor) return;
    if (!point) {
      cursor.style.visibility = "hidden";
      return;
    }
    cursor.style.transform = `translate(${point.x}px, ${point.y}px) translate(-50%, -50%)`;
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
      if (cursorRef.current) cursorRef.current.style.visibility = "hidden";
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
    setOpenMenu(null);
    activePointerIdRef.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    drawingRef.current = true;
    lastPointRef.current = canvasPoint(event);
    moveCursor(lastPointRef.current);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    // A mouse or stylus hovering over the board: the pen's circle follows it.
    if (activePointerIdRef.current === null) {
      if (!eraseMode) moveCursor(canvasPoint(event));
      return;
    }
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
    context.lineWidth = lineWidth;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.beginPath();
    context.moveTo(from.x, from.y);
    context.lineTo(to.x, to.y);
    context.stroke();

    lastPointRef.current = to;
    moveCursor(to);
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
    // The eraser's circle only shows mid-stroke; the pen's stays where the
    // finger lifted, ready for the next stroke.
    if (eraseMode) moveCursor(null);
  }

  // A mouse leaving the board takes the pen's circle with it. Touch is left
  // alone: a finger "leaves" every time it lifts.
  function handlePointerLeave(event: React.PointerEvent<HTMLCanvasElement>) {
    if (event.pointerType === "touch" || activePointerIdRef.current !== null) return;
    moveCursor(null);
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
          onPointerLeave={handlePointerLeave}
          className="absolute inset-0 h-full w-full"
        />

        {/* The tool's circle, the same width as its line: the pen's in its ink
            (half opacity, so it reads apart from drawn ink), the eraser's a
            faint grey. */}
        <div
          ref={cursorRef}
          aria-hidden="true"
          className="pointer-events-none invisible absolute top-0 left-0 rounded-full"
          style={{
            width: lineWidth,
            height: lineWidth,
            backgroundColor: eraseMode ? "rgb(217 217 217 / 0.3)" : ink,
            opacity: eraseMode ? 1 : 0.5,
          }}
        />

        {/* The row itself lets touches through, so the board can be drawn on
            between and around the buttons. `--tool` is every button's size. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between px-[3%] pt-[3%] [--tool:clamp(2.5rem,12vw,4.5rem)]">
          <div role="toolbar" aria-label="Drawing tools" className="flex gap-[clamp(0.25rem,1.5vw,0.75rem)]">
            <ColourPicker
              ink={ink}
              open={openMenu === "colour"}
              onToggle={() => setOpenMenu((open) => (open === "colour" ? null : "colour"))}
              onSelect={selectInk}
            />
            <SizePicker
              tool="pen"
              label="Pen"
              icon="/images/board/pen.png"
              selected={tool === "pen"}
              size={penSize}
              open={openMenu === "pen"}
              onPress={() => pressTool("pen")}
              onSelect={(size) => selectSize("pen", size)}
            />
            <SizePicker
              tool="eraser"
              label="Eraser"
              icon="/images/board/eraser.png"
              selected={tool === "eraser"}
              size={eraserSize}
              open={openMenu === "eraser"}
              onPress={() => pressTool("eraser")}
              onSelect={(size) => selectSize("eraser", size)}
            />
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

interface PillMenuOption {
  key: string;
  label: string;
  onSelect: () => void;
  /** Size options: whether this is the size in use. */
  selected?: boolean;
  content: React.ReactNode;
}

interface PillMenuProps {
  open: boolean;
  /** The top button: what it says to screen readers, and what it shows. */
  label: string;
  content: React.ReactNode;
  onPress: () => void;
  /** Pen and eraser: whether this is the tool in use (thicker outline). */
  pressed?: boolean;
  options: PillMenuOption[];
  /** Each option's row height, in buttons. Defaults to sharing `MENU_OPEN_HEIGHT`. */
  slot?: number;
  /**
   * How far the options are pulled up under the top button, in buttons. The
   * pill's height doesn't change, so the same space opens below the last one.
   */
  lift?: number;
}

/**
 * A toolbar button that opens downwards into a pill, from the drawing mockup.
 * Closed, it's a round button like the others. Open, it grows into a pill the
 * same width, its options appearing below the top button one after another
 * as the pill's edge reaches them. By default every menu opens to the same
 * height, its options sharing the space below the top button.
 */
function PillMenu({ open, label, content, onPress, pressed, options, slot: slotOverride, lift = 0 }: PillMenuProps) {
  const slot = slotOverride ?? (MENU_OPEN_HEIGHT - 1) / options.length;
  const openHeight = 1 + options.length * slot;
  // Spread the fades across the pill's growth, last one ending with it.
  const stagger = (MENU_ANIMATION_MS - MENU_FADE_MS) / Math.max(options.length - 1, 1);

  return (
    // Holds the button's place in the toolbar; the pill grows out of it over
    // the board without moving the other buttons.
    <div className="relative aspect-square w-[var(--tool)]">
      <div
        className={`pointer-events-auto absolute inset-x-0 top-0 z-10 flex flex-col overflow-hidden rounded-full border-[var(--luke-purple)] bg-[var(--luke-lavender)] text-[var(--luke-purple)] transition-[height] ease-out motion-reduce:transition-none ${
          pressed ? "border-[clamp(3.5px,1.1vw,7px)]" : "border-[clamp(2px,0.6vw,4px)]"
        }`}
        style={{
          height: open ? `calc(var(--tool) * ${openHeight})` : "var(--tool)",
          transitionDuration: `${MENU_ANIMATION_MS}ms`,
        }}
      >
        <button
          type="button"
          aria-label={label}
          aria-pressed={pressed}
          aria-expanded={open}
          onClick={onPress}
          className="flex aspect-square w-full shrink-0 items-center justify-center transition-[filter] active:brightness-90"
        >
          {content}
        </button>

        {options.map((option, i) => (
          <button
            key={option.key}
            type="button"
            aria-label={option.label}
            aria-pressed={option.selected}
            onClick={option.onSelect}
            // Hidden options can't be tapped or reached with the keyboard, and
            // let taps through to the top button they're tucked under.
            disabled={!open}
            tabIndex={open ? 0 : -1}
            className="flex w-full shrink-0 items-center justify-center transition-[opacity,translate] ease-out motion-reduce:transition-none"
            style={{
              height: `calc(var(--tool) * ${slot})`,
              marginTop: i === 0 && lift ? `calc(var(--tool) * ${-lift})` : undefined,
              pointerEvents: open ? "auto" : "none",
              opacity: open ? 1 : 0,
              translate: open ? "0 0" : "0 -50%",
              transitionDuration: `${MENU_FADE_MS}ms`,
              // Top to bottom on the way out, bottom to top on the way in.
              transitionDelay: `${(open ? i : options.length - 1 - i) * stagger}ms`,
            }}
          >
            {option.content}
          </button>
        ))}
      </div>
    </div>
  );
}

interface ColourPickerProps {
  ink: Ink;
  open: boolean;
  onToggle: () => void;
  onSelect: (ink: Ink) => void;
}

/**
 * The colour button. The current ink stays on top; the other inks are listed
 * below it in `INKS` order, slightly smaller. Picking one selects it and closes
 * the menu; tapping the top dot closes it unchanged.
 */
function ColourPicker({ ink, open, onToggle, onSelect }: ColourPickerProps) {
  const current = INKS.find((option) => option.value === ink) ?? INKS[INKS.length - 1];

  return (
    <PillMenu
      open={open}
      label={`Pen colour: ${current.name}`}
      content={<span className="aspect-square w-[55%] rounded-full" style={{ backgroundColor: current.value }} />}
      onPress={onToggle}
      slot={COLOUR_SLOT}
      lift={COLOUR_LIFT}
      options={INKS.filter((option) => option.value !== ink).map((option) => ({
        key: option.value,
        label: option.name,
        onSelect: () => onSelect(option.value),
        content: <span className="aspect-square w-[45%] rounded-full" style={{ backgroundColor: option.value }} />,
      }))}
    />
  );
}

interface SizePickerProps {
  /** Which tool this is, for its sizes. */
  tool: Tool;
  label: string;
  /** Icon image, drawn through `MaskIcon`. */
  icon: string;
  /** Whether this is the tool in use. */
  selected: boolean;
  size: number;
  open: boolean;
  onPress: () => void;
  onSelect: (size: number) => void;
}

/**
 * The pen or eraser button. Its menu lists the tool's `SIZES`, thinnest first, as
 * outlined circles; the size in use is filled in.
 */
function SizePicker({ tool, label, icon, selected, size, open, onPress, onSelect }: SizePickerProps) {
  return (
    <PillMenu
      open={open}
      label={label}
      content={<MaskIcon src={icon} />}
      onPress={onPress}
      pressed={selected}
      options={SIZES[tool].map((option) => ({
        key: option.name,
        label: `${label} size: ${option.name}`,
        selected: option.width === size,
        onSelect: () => onSelect(option.width),
        content: (
          <span
            className={`aspect-square rounded-full border-[clamp(1.5px,0.5vw,3px)] border-[var(--luke-purple)] ${
              option.width === size ? "bg-[var(--luke-purple)]" : ""
            }`}
            // A share of the button's width, which is `--tool` less the outline.
            style={{ width: `calc(var(--tool) * ${option.dot})` }}
          />
        ),
      }))}
    />
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
