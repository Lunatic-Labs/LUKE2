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
 *  1. Hold the scene carousel and the idle scene held apart from it.
 *  2. Run the idle clock. The carousel never advances on its own; a session
 *     untouched for `sessionIdleSeconds` ends and the idle screen returns.
 *  3. Track per-scene dwell time for the session log.
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

  // Read inside the timer tick, which must see the current values without
  // restarting the interval on every render. Synced in an effect because React
  // forbids writing refs during render.
  const indexRef = useRef(index);
  const sessionActiveRef = useRef(sessionActive);
  const onMainMenuRef = useRef(onMainMenu);
  useEffect(() => {
    indexRef.current = index;
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
    goTo(0);
  }, [goTo, tracker]);

  const idleTimer = useIdleTimer({
    enabled: sessionActive,
    onTick: (elapsed) => {
      if (elapsed >= options.sessionIdleSeconds) {
        endSession();
        return;
      }

      if (sessionActiveRef.current) {
        tracker.record(onMainMenuRef.current ? MAIN_MENU_SCENE.id : SCENES[indexRef.current].id);
      }
    },
  });

  useEffect(() => {
    resetIdleRef.current = idleTimer.reset;
  });

  const reportActivity = useCallback(() => {
    resetIdleRef.current?.();
  }, []);

  const beginSession = useCallback(() => {
    tracker.begin();
    setSessionActive(true);
    setOnMainMenu(true);
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
