export const MOTION_QUERY = "(prefers-reduced-motion: reduce)";

// Progressive enhancement: content is visible without animation support.
// Don't retain transforms after finishing: they can trap fixed-position UI.
export function animateContent(element, variant = "rise", media = globalThis.matchMedia?.(MOTION_QUERY)) {
  if (!element?.animate || media?.matches) return () => {};
  const frames = variant === "fade"
    ? [{ opacity: 0.65 }, { opacity: 1 }]
    : [{ opacity: 0.6, transform: "translateY(8px)" }, { opacity: 1, transform: "translateY(0)" }];
  let animation;
  try {
    animation = element.animate(frames, {
      id: "fitbae-content", duration: variant === "fade" ? 180 : 240,
      easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "none",
    });
  } catch { return () => {}; }
  const changed = (event) => { if (event.matches) animation.cancel(); };
  media?.addEventListener?.("change", changed);
  const unlisten = () => media?.removeEventListener?.("change", changed);
  animation.addEventListener?.("finish", unlisten, { once: true });
  return () => { animation.cancel(); unlisten(); };
}
