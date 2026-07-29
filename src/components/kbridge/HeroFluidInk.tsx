"use client";

import { useEffect, useRef, useState } from "react";
import type { FluidSim } from "@/lib/fluid/webgl-fluid";

// Real fluid dynamics for the hero ink, layered over the static SVG watercolor.
// The SVG stays the instant, zero-JS base and the only background users get
// under reduced motion, low memory, or missing WebGL — this component simply
// never activates there, so the fallback needs no code. Coarse-pointer devices
// run a lighter simulation profile; scrolling is never intercepted (passive
// listeners, no touch-action changes), so on phones the ink mostly lives off
// ambient drops and taps. The engine chunk is imported after idle so it never
// competes with LCP.

// Pinned palette literals as a fallback when computed styles are unavailable.
const FALLBACK_HEX = ["#c7d2fe", "#e5a0b3", "#4f5db3"] as const;
// --primary-strong absorbs far more light than the pale pins; dilute it so a
// random drop of it never overpowers the 연한 tone.
const STRONG_DILUTION = 0.4;

function hexToAbsorption(hex: string, dilution = 1): [number, number, number] | null {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return null;
  const value = parseInt(match[1], 16);
  const r = ((value >> 16) & 255) / 255;
  const g = ((value >> 8) & 255) / 255;
  const b = (value & 255) / 255;
  return [(1 - r) * dilution, (1 - g) * dilution, (1 - b) * dilution];
}

function readPalette(): Array<[number, number, number]> {
  const styles = getComputedStyle(document.documentElement);
  const tokens: Array<[string, string, number]> = [
    ["--primary", FALLBACK_HEX[0], 1],
    ["--icon-accent", FALLBACK_HEX[1], 1],
    ["--primary-strong", FALLBACK_HEX[2], STRONG_DILUTION],
  ];
  return tokens.map(([token, fallback, dilution]) => {
    return hexToAbsorption(styles.getPropertyValue(token), dilution)
      || hexToAbsorption(fallback, dilution)!;
  });
}

export function HeroFluidInk() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    if (memory !== undefined && memory < 4) return;
    // Phones and tablets run the sim too, on a lighter profile. The dye/sim
    // grid options are the real cost knobs (advection and the Jacobi passes
    // run at those fixed resolutions regardless of DPR); the tighter DPR cap
    // only trims the final display pass, whose upscale is invisible at hero
    // size on a DPR-3 screen.
    const coarsePointer = window.matchMedia("(pointer: coarse)").matches;

    let sim: FluidSim | null = null;
    let cancelled = false;
    let teardown: (() => void) | null = null;

    const start = async () => {
      const { createFluidSim } = await import("@/lib/fluid/webgl-fluid");
      if (cancelled) return;
      sim = createFluidSim(canvas, {
        palette: readPalette(),
        ...(coarsePointer ? { maxDpr: 1.25, simResolution: 96, dyeResolution: 384 } : {}),
      });
      if (!sim) return; // WebGL/half-float unavailable → SVG watercolor stands
      setActive(true);

      const section = canvas.closest("section");
      let lastX: number | null = null;
      let lastY: number | null = null;
      const onPointerMove = (event: PointerEvent) => {
        // Two resting fingers interleave their moves through this one shared
        // last-position, which would turn dx into the inter-finger distance —
        // a splat ~20x stronger than any real swipe. Follow the primary
        // pointer only.
        if (!event.isPrimary) return;
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        if (lastX !== null && lastY !== null) sim?.pointerMove(x, y, x - lastX, y - lastY);
        lastX = x;
        lastY = y;
      };
      const onPointerReset = () => {
        lastX = null;
        lastY = null;
      };
      // Tap = a blot of paint. On touch screens a drag belongs to scrolling
      // (passive listener, touch-action untouched), so the tap is the primary
      // mobile interaction; on desktop a click drops ink too. Re-seeding the
      // last position here keeps the first move of a new touch from bridging
      // the gap from wherever the previous touch ended — scroll takeovers end
      // in pointercancel, not pointerleave.
      const onPointerDown = (event: PointerEvent) => {
        if (!event.isPrimary) return;
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        lastX = x;
        lastY = y;
        sim?.tap(x, y);
      };
      section?.addEventListener("pointermove", onPointerMove, { passive: true });
      section?.addEventListener("pointerleave", onPointerReset, { passive: true });
      section?.addEventListener("pointercancel", onPointerReset, { passive: true });
      section?.addEventListener("pointerdown", onPointerDown, { passive: true });

      // The simulation only spends GPU time while the hero is actually on
      // screen in a visible tab. Canvas size changes are picked up by the
      // engine's own frame loop, so no ResizeObserver is needed.
      let inView = true;
      const applyPause = () => sim?.setPaused(!inView || document.hidden);
      const intersection = new IntersectionObserver((entries) => {
        inView = entries[0]?.isIntersecting ?? true;
        applyPause();
      });
      intersection.observe(canvas);
      document.addEventListener("visibilitychange", applyPause);

      teardown = () => {
        teardown = null;
        section?.removeEventListener("pointermove", onPointerMove);
        section?.removeEventListener("pointerleave", onPointerReset);
        section?.removeEventListener("pointercancel", onPointerReset);
        section?.removeEventListener("pointerdown", onPointerDown);
        document.removeEventListener("visibilitychange", applyPause);
        intersection.disconnect();
        motionQuery.removeEventListener("change", onMotionChange);
        sim?.destroy();
        sim = null;
        setActive(false);
      };

      // The mount-time gate only sees the initial preference; honor the user
      // turning Reduce Motion on afterwards by dissolving back to the SVG.
      const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      const onMotionChange = () => {
        if (motionQuery.matches) teardown?.();
      };
      motionQuery.addEventListener("change", onMotionChange);
    };

    // A rejected engine load (stale chunk after a redeploy, a driver that
    // fails shader compilation) must fall back to the SVG, not surface as an
    // unhandled rejection from a decorative background.
    const launch = () => {
      start().catch(() => {
        if (!cancelled) setActive(false);
      });
    };

    // Older Safari lacks requestIdleCallback; typeof keeps both runtime and
    // TypeScript honest (an `in` check narrows the false branch to never).
    const usesIdleCallback = typeof window.requestIdleCallback === "function";
    const idleId = usesIdleCallback
      ? window.requestIdleCallback(launch, { timeout: 2500 })
      : window.setTimeout(launch, 600);

    return () => {
      cancelled = true;
      if (usesIdleCallback) {
        window.cancelIdleCallback(idleId);
      } else {
        window.clearTimeout(idleId);
      }
      // teardown() covers listeners, observers, and the sim itself; when it is
      // still null, start() never created a sim, so there is nothing else.
      teardown?.();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`absolute inset-0 h-full w-full mix-blend-multiply transition-opacity duration-1000 ${active ? "opacity-100" : "opacity-0"}`}
    />
  );
}
