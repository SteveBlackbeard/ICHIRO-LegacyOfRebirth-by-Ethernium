const DEFAULT_ACTIVITY_EVENTS = ["pointermove", "pointerdown", "wheel", "touchstart", "scroll"];

export function createIdleDirector({
  thresholdMs = 45_000,
  isEligible,
  onIdle,
  onEscape,
  onSuspend,
  activityEvents = DEFAULT_ACTIVITY_EVENTS,
} = {}) {
  let lastActivityAt = performance.now();
  let timer = 0;
  let started = false;

  function markActivity() {
    lastActivityAt = performance.now();
  }

  function tick() {
    if (!isEligible?.()) {
      markActivity();
      return;
    }
    if (performance.now() - lastActivityAt >= thresholdMs) onIdle?.();
  }

  function handleKeydown(event) {
    markActivity();
    if (event.key === "Escape") onEscape?.();
  }

  function handleVisibilityChange() {
    markActivity();
    if (document.hidden) onSuspend?.();
  }

  function start() {
    if (started) return;
    started = true;
    markActivity();
    timer = window.setInterval(tick, 1000);
    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, markActivity, { passive: true, capture: true });
    });
    window.addEventListener("keydown", handleKeydown, { capture: true });
    document.addEventListener("visibilitychange", handleVisibilityChange);
  }

  function destroy() {
    if (!started) return;
    started = false;
    window.clearInterval(timer);
    timer = 0;
    activityEvents.forEach((eventName) => {
      window.removeEventListener(eventName, markActivity, { capture: true });
    });
    window.removeEventListener("keydown", handleKeydown, { capture: true });
    document.removeEventListener("visibilitychange", handleVisibilityChange);
  }

  return Object.freeze({ destroy, markActivity, start });
}
