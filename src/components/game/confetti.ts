"use client";

import type { Options } from "canvas-confetti";

const COLORS = ["#ff6b9a", "#45c4f5", "#ffd23f", "#22d39b", "#6c4dff"];

/** Fires confetti unless the user prefers reduced motion. */
export async function celebrate(kind: "small" | "big" = "small") {
  if (typeof window === "undefined") return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  const { default: confetti } = await import("canvas-confetti");
  const base: Options = { colors: COLORS, disableForReducedMotion: true, zIndex: 60 };
  if (kind === "small") {
    void confetti({ ...base, particleCount: 70, spread: 70, origin: { y: 0.7 } });
    return;
  }
  const end = Date.now() + 1800;
  const frame = () => {
    void confetti({ ...base, particleCount: 6, angle: 60, spread: 60, origin: { x: 0, y: 0.7 } });
    void confetti({ ...base, particleCount: 6, angle: 120, spread: 60, origin: { x: 1, y: 0.7 } });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  void confetti({ ...base, particleCount: 160, spread: 100, startVelocity: 45, origin: { y: 0.55 } });
  frame();
}
