export function createInputMode({
  root = document.documentElement,
  body = document.body,
  scrollCue = null,
  controlHint = null,
} = {}) {
  const params = new URLSearchParams(window.location.search);
  const forcedTouch = params.get("touch") === "1" || params.get("input") === "touch";
  const forcedPointer = params.get("touch") === "0" || params.get("input") === "pointer";
  const coarseMedia = window.matchMedia?.("(hover: none), (pointer: coarse)");
  let touchMode = false;

  function detectTouchMode() {
    if (forcedPointer) {
      return false;
    }
    if (forcedTouch) {
      return true;
    }
    return Boolean(navigator.maxTouchPoints > 0 || coarseMedia?.matches);
  }

  function applyCopy() {
    if (scrollCue) {
      scrollCue.textContent = touchMode ? "SWIPE UP" : "SCROLL DOWN";
    }

    if (controlHint) {
      controlHint.dataset.inputMode = touchMode ? "touch" : "pointer";
    }
  }

  function refresh() {
    touchMode = detectTouchMode();
    root?.classList.toggle("kpr-touch-mode", touchMode);
    body?.classList.toggle("kpr-touch-mode", touchMode);
    root.dataset.kprInputMode = touchMode ? "touch" : "pointer";
    applyCopy();
    return touchMode;
  }

  function start() {
    refresh();
    coarseMedia?.addEventListener?.("change", refresh);
    window.addEventListener("resize", refresh, { passive: true });
  }

  function stop() {
    coarseMedia?.removeEventListener?.("change", refresh);
    window.removeEventListener("resize", refresh);
  }

  return {
    isTouchMode: () => touchMode,
    refresh,
    start,
    stop,
  };
}
