// High-performance Magnetic UI module (v226)
// Attracts selected interactive elements towards the cursor when within range.
// Uses cached coordinates and RAM bounds representation to completely avoid layout thrashing (FCP/Layout reflow).

export function initMagneticUI() {
  const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches || false;
  if (prefersReducedMotion) return;

  const ELEMENTS_SELECTOR = ".ambient-toggle, .folder-button, .lore-tab-btn, .citizen-passport, .details-modal-close, .panel-card.is-unlocked";
  const TRIGGER_DIST = 80; // Distance threshold in pixels
  const MAX_PULL = 8;     // Maximum offset in pixels
  const LERP_FACTOR = 0.12;

  let targets = [];
  let mouseX = -9999;
  let mouseY = -9999;

  // Cache targets bounds in RAM to avoid calling getBoundingClientRect during mousemove
  function cacheTargetBounds() {
    const elList = document.querySelectorAll(ELEMENTS_SELECTOR);
    targets = Array.from(elList).map(el => {
      const rect = el.getBoundingClientRect();
      const scrollX = window.scrollX || window.pageXOffset;
      const scrollY = window.scrollY || window.pageYOffset;
      
      // Ensure will-change is applied for hardware acceleration
      el.style.willChange = "transform";
      if (!el.style.transition) {
        el.style.transition = "transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)";
      }

      return {
        element: el,
        width: rect.width,
        height: rect.height,
        centerX: rect.left + rect.width / 2 + scrollX,
        centerY: rect.top + rect.height / 2 + scrollY,
        currentX: 0,
        currentY: 0,
        targetX: 0,
        targetY: 0
      };
    });
    wake();
  }

  // Handle cursor positioning updates
  function onMouseMove(e) {
    mouseX = e.pageX;
    mouseY = e.pageY;
    wake();
  }

  // Animation ticks using RequestAnimationFrame
  let active = false;
  let listening = false;
  let frameId = 0;
  let cacheTimer = 0;

  function wake() {
    if (active && !frameId) frameId = requestAnimationFrame(updatePhysics);
  }

  function updatePhysics() {
    frameId = 0;
    if (!active) return;

    let moving = false;

    for (let i = 0; i < targets.length; i++) {
      const t = targets[i];
      const dx = mouseX - t.centerX;
      const dy = mouseY - t.centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < TRIGGER_DIST && dist > 0.1) {
        // Linear dropoff function
        const pct = 1.0 - (dist / TRIGGER_DIST);
        const force = pct * MAX_PULL;
        t.targetX = (dx / dist) * force;
        t.targetY = (dy / dist) * force;
        // Temporarily override transition to let JS lerp smoothly
        t.element.style.transition = "none";
      } else {
        t.targetX = 0;
        t.targetY = 0;
        // Re-enable smooth transition when returning to base state
        t.element.style.transition = "transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)";
      }

      // Lerp actual positions
      t.currentX += (t.targetX - t.currentX) * LERP_FACTOR;
      t.currentY += (t.targetY - t.currentY) * LERP_FACTOR;
      moving = moving
        || Math.abs(t.targetX - t.currentX) > 0.01
        || Math.abs(t.targetY - t.currentY) > 0.01;

      // Apply transforms
      if (Math.abs(t.currentX) > 0.05 || Math.abs(t.currentY) > 0.05) {
        t.element.style.transform = `translate3d(${t.currentX.toFixed(2)}px, ${t.currentY.toFixed(2)}px, 0)`;
      } else {
        t.element.style.transform = "";
      }
    }

    if (moving) frameId = requestAnimationFrame(updatePhysics);
  }

  function start() {
    if (active) return;
    active = true;
    if (!listening) {
      window.addEventListener("mousemove", onMouseMove, { passive: true });
      window.addEventListener("resize", cacheTargetBounds, { passive: true });
      window.addEventListener("scroll", cacheTargetBounds, { passive: true });
      listening = true;
    }
    clearTimeout(cacheTimer);
    cacheTimer = setTimeout(cacheTargetBounds, 80);
    wake();
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
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", cacheTargetBounds);
      window.removeEventListener("scroll", cacheTargetBounds);
      listening = false;
      targets.forEach(t => {
        t.element.style.transform = "";
        t.element.style.willChange = "";
        t.element.style.transition = "";
      });
    },
    recalculate: cacheTargetBounds
  };
}
