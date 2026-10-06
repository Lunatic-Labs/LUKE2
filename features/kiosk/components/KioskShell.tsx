"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BottomBar } from "@/components/BottomBar";
import { KioskHeader } from "@/components/KioskHeader";
import { NavMenu } from "@/components/NavMenu";
import { useCarousel } from "@/hooks/useCarousel";
import { useIdleTimer } from "@/hooks/useIdleTimer";
import { bottomBarHeight, DEFAULT_OPTIONS, type KioskOptions } from "../options";
import { IDLE_SCENE, MAIN_MENU_SCENE, MENU_ITEMS, SCENES } from "../registry";
import { SessionTracker, type SessionSink } from "../session-log";
import type { SceneHandle } from "../types";
import { SceneErrorBoundary } from "./SceneErrorBoundary";

/**
 * The kiosk shell — the React counterpart of `DisplayManager.pde`.
 *
 * It owns the same three responsibilities the Processing class did:
 *
 *  1. Hold the scene carousel, plus the idle scene and main menu held apart
 *     from it. A tap on idle opens the main menu; picking a page there enters
 *     the carousel, and the session never returns to the menu.
 *  2. Run the idle clock. A scene untouched for `sceneIdleSeconds` advances the
 *     carousel; once the carousel wraps back to where it first went idle — or a
 *     single scene sits for `sessionIdleSeconds` — the session ends and the
 *     idle screen returns.
 *  3. Track per-scene dwell time for the session log, counting only attended
 *     time (upstream: `idleSceneIndex == -1`), never time the carousel drifted
 *     through unwatched.
 */
export interface KioskShellProps {
  options?: KioskOptions;
  /** Override where session logs go. Defaults to the console. */
  sessionSink?: SessionSink;
}

export function KioskShell({ options = DEFAULT_OPTIONS, sessionSink }: KioskShellProps) {
  const [sessionActive, setSessionActive] = useState(false);
  /** True from the tap that leaves idle until the visitor picks a page. */
  const [onMainMenu, setOnMainMenu] = useState(false);
  const { index, next, previous, goTo } = useCarousel({ length: SCENES.length });

  /**
   * Carousel position where the visitor first stopped interacting, or null
   * while a session is being actively used. Upstream's `idleSceneIndex`, whose
   * -1 sentinel becomes null here.
   */
  const [driftOrigin, setDriftOrigin] = useState<number | null>(null);

  // Read inside the timer tick, which must see the current values without
  // restarting the interval on every render. Synced in an effect because React
  // forbids writing refs during render.
  const indexRef = useRef(index);
  const driftOriginRef = useRef(driftOrigin);
  const sessionActiveRef = useRef(sessionActive);
  const onMainMenuRef = useRef(onMainMenu);
  useEffect(() => {
    indexRef.current = index;
    driftOriginRef.current = driftOrigin;
    sessionActiveRef.current = sessionActive;
    onMainMenuRef.current = onMainMenu;
  });

  const tracker = useMemo(() => new SessionTracker(sessionSink), [sessionSink]);
  const barHeight = bottomBarHeight(options.screenHeight);

  // The tick callback below has to reset the very timer it belongs to, so the
  // reset function is reached through a ref filled in just after the hook runs.
  const resetIdleRef = useRef<(() => void) | null>(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const toggleMenu = useCallback(() => setMenuOpen((open) => !open), []);

  const endSession = useCallback(() => {
    tracker.end();
    setSessionActive(false);
    setOnMainMenu(false);
    // The next visitor should not find the previous one's menu left open.
    setMenuOpen(false);
    setDriftOrigin(null);
    goTo(0);
  }, [goTo, tracker]);

  const idleTimer = useIdleTimer({
    enabled: sessionActive,
    onTick: (elapsed) => {
      if (elapsed >= options.sessionIdleSeconds) {
        endSession();
        return;
      }

      if (elapsed >= options.sceneIdleSeconds) {
        // The main menu is not on the carousel, so there is nothing to drift
        // to; it waits for the session timeout above instead.
        if (onMainMenuRef.current) return;

        const origin = driftOriginRef.current ?? indexRef.current;
        const upcoming = (indexRef.current + 1) % SCENES.length;

        // Wrapped the whole carousel untouched — nobody is here.
        if (upcoming === origin) {
          endSession();
          return;
        }

        setDriftOrigin(origin);
        goTo(upcoming);
        resetIdleRef.current?.();
        return;
      }

      // Only attended seconds count toward the log.
      if (driftOriginRef.current === null && sessionActiveRef.current) {
        tracker.record(onMainMenuRef.current ? MAIN_MENU_SCENE.id : SCENES[indexRef.current].id);
      }
    },
  });

  useEffect(() => {
    resetIdleRef.current = idleTimer.reset;
  });

  const reportActivity = useCallback(() => {
    setDriftOrigin(null);
    resetIdleRef.current?.();
  }, []);

  const beginSession = useCallback(() => {
    tracker.begin();
    setSessionActive(true);
    setOnMainMenu(true);
    setDriftOrigin(null);
    goTo(0);
    resetIdleRef.current?.();
  }, [goTo, tracker]);

  // Stepping the carousel closes the menu, like choosing a page from it does.
  const goNext = useCallback(() => {
    reportActivity();
    next();
    setMenuOpen(false);
  }, [next, reportActivity]);

  const goPrevious = useCallback(() => {
    reportActivity();
    previous();
    setMenuOpen(false);
  }, [previous, reportActivity]);

  const goToScene = useCallback(
    (sceneId: string) => {
      reportActivity();
      goTo(SCENES.findIndex((scene) => scene.id === sceneId));
      setOnMainMenu(false);
      setMenuOpen(false);
    },
    [goTo, reportActivity],
  );

  const handle: SceneHandle = useMemo(
    () => ({
      reportActivity,
      nextScene: goNext,
      previousScene: goPrevious,
      exitCarousel: endSession,
      goToScene,
    }),
    [endSession, goNext, goPrevious, goToScene, reportActivity],
  );

  const scene = !sessionActive ? IDLE_SCENE : onMainMenu ? MAIN_MENU_SCENE : SCENES[index];
  const { Component } = scene;
  // The main menu already lists every page, so the header's menu is hidden there.
  const inCarousel = sessionActive && !onMainMenu;

  return (
    <div
      className="flex h-dvh w-full flex-col overflow-hidden bg-[var(--luke-lavender)]"
      // Upstream `DisplayManager.Click()` saw every tap before delegating, so
      // any interaction anywhere reset the idle clock. Same here.
      onPointerDown={sessionActive ? reportActivity : beginSession}
    >
      <KioskHeader showMenuToggle={inCarousel} menuOpen={menuOpen} onToggleMenu={toggleMenu} />

      <main className="relative min-h-0 flex-1">
        {/* Backdrop only: its solid base meets the bottom bar so the skyline
            appears to rise out of it. Scenes paint over it and get the taps. */}
        <Image
          src="/images/nashville-skyline.png"
          alt=""
          width={482}
          height={119}
          priority
          className="pointer-events-none absolute inset-x-0 bottom-0 h-auto w-full"
        />
        <div className="relative h-full">
          <SceneErrorBoundary
            // Remount on scene change so a recovered boundary does not stay tripped.
            key={scene.id}
            onError={(error) => {
              tracker.recordError(scene.name, error);
              endSession();
            }}
          >
            <Component bounds={{ width: options.screenWidth, height: options.screenHeight }} handle={handle} />
          </SceneErrorBoundary>
        </div>
        <NavMenu
          open={inCarousel && menuOpen}
          items={MENU_ITEMS.map(({ sceneId, label }) => ({ id: sceneId, label }))}
          currentId={scene.id}
          onSelect={goToScene}
        />
      </main>

      {inCarousel ? (
        <BottomBar sceneName={scene.name} onNext={goNext} onPrevious={goPrevious} height={barHeight} />
      ) : (
        // The attract screen and main menu have no arrows, but keep the bar's
        // purple strip so the layout does not jump on the way into the carousel.
        <div aria-hidden="true" className="w-full shrink-0 bg-[var(--luke-purple)]" style={{ height: barHeight }} />
      )}
    </div>
  );
}
