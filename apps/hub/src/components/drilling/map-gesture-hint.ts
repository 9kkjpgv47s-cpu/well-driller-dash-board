/**
 * Two-finger map hint for coarse-pointer devices. When the map is created
 * with `dragging: false`, one finger scrolls the page and Leaflet TouchZoom
 * owns two-finger gestures; this overlay tells the user. Mirrors the
 * standalone well viewer's cjInstallGestureHint (same classes/copy so
 * design/cj/components.css styles both).
 *
 * Returns a cleanup function that removes listeners + the overlay.
 */
export function installMapGestureHint(el: HTMLElement): () => void {
  const existing = el.querySelector<HTMLElement>(".cj-map-gesture-hint");
  if (existing) return () => {};

  const hint = document.createElement("div");
  hint.className = "cj-map-gesture-hint";
  hint.setAttribute("aria-hidden", "true");
  hint.innerHTML = "<span>Use two fingers to move the map</span>";
  el.appendChild(hint);

  let timer: ReturnType<typeof setTimeout> | null = null;
  const hide = () => {
    el.classList.remove("is-gesture-hint");
  };
  const show = () => {
    el.classList.add("is-gesture-hint");
    if (timer) clearTimeout(timer);
    timer = setTimeout(hide, 1400);
  };
  const onTouchMove = (e: TouchEvent) => {
    if (e.touches.length === 1) show();
    else hide();
  };
  const onTouchCancel = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(hide, 1200);
  };
  const onTouchEnd = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(hide, 900);
  };

  el.addEventListener("touchmove", onTouchMove, { passive: true });
  el.addEventListener("touchcancel", onTouchCancel, { passive: true });
  el.addEventListener("touchend", onTouchEnd, { passive: true });

  return () => {
    if (timer) clearTimeout(timer);
    el.removeEventListener("touchmove", onTouchMove);
    el.removeEventListener("touchcancel", onTouchCancel);
    el.removeEventListener("touchend", onTouchEnd);
    hint.remove();
  };
}
