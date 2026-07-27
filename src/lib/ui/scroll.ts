// Motion-safe scroll helpers: users with "prefers-reduced-motion: reduce" get an
// instant jump ("auto") instead of an animated scroll, per WCAG 2.3.3 guidance.

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function smoothScrollIntoView(
  el: Element | null,
  opts: ScrollIntoViewOptions = {},
): void {
  if (!el) return;
  el.scrollIntoView({
    ...opts,
    behavior: prefersReducedMotion() ? "auto" : (opts.behavior ?? "smooth"),
  });
}

export function smoothScrollTo(top: number): void {
  if (typeof window === "undefined") return;
  window.scrollTo({
    top,
    behavior: prefersReducedMotion() ? "auto" : "smooth",
  });
}
