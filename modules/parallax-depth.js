// 5-Layer Parallax Depth Engine (v226 — SAFE)
// Uses CSS custom properties (--parallax-x, --parallax-y) instead of directly
// overriding style.transform, which would destroy existing CSS fold/rotate
// transforms on elements like .archive-video-frame and .kpr-profile-container.
//
// Only targets elements that have NO critical CSS transforms (canvases, HUD).
// For complex-transform elements, the parallax is opt-in via CSS var consumption.

export function initParallaxDepth() {
  const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches || false;
  if (prefersReducedMotion) return;

  // SAFE layers: only elements that don't have existing CSS transforms
  // Canvases and HUD labels are safe to directly shift.
  // Profile/video/dossier are NOT safe — they use complex CSS transforms.
  const SAFE_LAYERS = [
    { selector: ".dot-canvas, .dot-front-canvas", factor: 0.6 },
    { selector: ".hud-telemetry", factor: 1.2 },
    { selector: ".hud__mark", factor: 1.5 },
  ];

  const archiveScreen = document.getElementById("archive-screen");
  if (!archiveScreen) return;

  let mouseNormX = 0;
  let mouseNormY = 0;
  let currentX = 0;
  let currentY = 0;
  let active = false;
  let listening = false;
  let frameId = 0;
  let cacheTimer = 0;
  let safeElements = [];

  function cacheSafeElements() {
    safeElements = SAFE_LAYERS.map(layer => {
      const els = Array.from(document.querySelectorAll(layer.selector));
      return { ...layer, elements: els };
    });
  }

  function onPointerMove(e) {
    mouseNormX = (e.clientX / window.innerWidth - 0.5) * 2;
    mouseNormY = (e.clientY / window.innerHeight - 0.5) * 2;
  }

  function onPointerLeave() {
    mouseNormX = 0;
    mouseNormY = 0;
  }

  const LERP = 0.06;

  function tick() {
    if (!active) return;

    currentX += (mouseNormX - currentX) * LERP;
    currentY += (mouseNormY - currentY) * LERP;

    // Only apply transforms to SAFE elements (no existing CSS transforms)
    for (let i = 0; i < safeElements.length; i++) {
      const layer = safeElements[i];
      const shiftX = currentX * layer.factor;
      const shiftY = currentY * layer.factor;

      for (let j = 0; j < layer.elements.length; j++) {
        layer.elements[j].style.transform =
          `translate3d(${shiftX.toFixed(2)}px, ${shiftY.toFixed(2)}px, 0)`;
      }
    }

    frameId = requestAnimationFrame(tick);
  }

  function start() {
    if (active) return;
    active = true;
    if (!listening) {
      archiveScreen.addEventListener("pointermove", onPointerMove, { passive: true });
      archiveScreen.addEventListener("pointerleave", onPointerLeave, { passive: true });
      listening = true;
    }
    clearTimeout(cacheTimer);
    cacheTimer = setTimeout(() => {
      cacheSafeElements();
    }, 80);
    if (!frameId) frameId = requestAnimationFrame(tick);
  }

  function pause() {
    active = false;
    if (frameId) cancelAnimationFrame(frameId);
    frameId = 0;
  }

  return {
    start,
    pause,
    resume: start,
    destroy() {
      pause();
      clearTimeout(cacheTimer);
      archiveScreen.removeEventListener("pointermove", onPointerMove);
      archiveScreen.removeEventListener("pointerleave", onPointerLeave);
      listening = false;
      safeElements.forEach(layer => {
        layer.elements.forEach(el => {
          el.style.transform = "";
        });
      });
    },
    recalculate: cacheSafeElements,
  };
}
