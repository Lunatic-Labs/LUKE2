"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

/**
 * Keeps one broken scene from taking down the kiosk.
 *
 * `luke_java.pde` wrapped its `draw()` call in a try/catch that logged the
 * error and called `dm.ExitCarousel()` — returning to the idle screen "instead
 * of crashing", since nobody is standing at a kiosk to restart it. React needs
 * an error boundary to do the same, and boundaries must be class components.
 */
export interface SceneErrorBoundaryProps {
  children: ReactNode;
  /** Reported so the shell can log it and bail out to idle. */
  onError: (error: Error, info: ErrorInfo) => void;
}

interface SceneErrorBoundaryState {
  hasError: boolean;
}

export class SceneErrorBoundary extends Component<
  SceneErrorBoundaryProps,
  SceneErrorBoundaryState
> {
  state: SceneErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): SceneErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    this.props.onError(error, info);
  }

  render() {
    // Render nothing on failure: the shell is already switching to the idle
    // scene, and a visitor should never see a stack trace.
    return this.state.hasError ? null : this.props.children;
  }
}
