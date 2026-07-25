export function createCursorSystem({
  cursorBubble,
  pampCursor,
  isTouchMode = () => false,
}) {
  const PAMP_CURSOR_NORMAL = { size: 72, hotX: 14, hotY: 18 };
  const PAMP_CURSOR_HOVER = { size: 80, hotX: 15, hotY: 19 };

  let cursorBubbleTimer = null;
  let cursorBubbleToken = 0;
  let contextualBubbleLastKey = "";
  let contextualBubbleLastPlayed = 0;
  let lastCursorX = window.innerWidth * 0.55;
  let lastCursorY = window.innerHeight * 0.52;
  let pampCursorFrame = null;
  let pampCursorHover = false;

  document.documentElement.classList.remove("css-native-cursor");
  document.documentElement.classList.add("pamp-cursor-ready");
  document.body?.classList.add("pamp-cursor-ready");

  function isPampInteractiveTarget(target) {
    if (!target || target === document.documentElement || target === document.body) {
      return false;
    }
    return Boolean(target.closest?.([
      "button",
      "a",
      "input",
      "textarea",
      "select",
      "label",
      "[role='button']",
      "[tabindex]:not([tabindex='-1'])",
      ".activation-symbol",
      ".panel-card.is-unlocked",
      ".panel-card",
      ".media-panel",
      ".dossier-panel-browser",
      ".panel-ring",
      ".archive-status",
      ".archive-video-stage",
      ".archive-video-lore-tabs",
      ".hud-telemetry",
      ".hud-compass",
      ".hud-logo-slot",
      ".folder-button",
      ".lore-tab-btn",
      ".audio-placeholder",
      ".ambient-toggle",
      ".profile-character",
      ".profile-character__frame",
      ".profile-character__front",
      ".profile-character__label",
      ".profile-box",
      ".stat-row",
      ".case-file",
      ".archive-3d",
    ].join(",")));
  }

  function renderPampCursor() {
    pampCursorFrame = null;
    if (!pampCursor) {
      return;
    }
    if (isTouchMode()) {
      pampCursor.classList.remove("is-visible", "is-hover");
      return;
    }
    const metrics = pampCursorHover ? PAMP_CURSOR_HOVER : PAMP_CURSOR_NORMAL;
    const left = lastCursorX - metrics.hotX;
    const top = lastCursorY - metrics.hotY;
    pampCursor.style.setProperty("--pamp-left", `${left.toFixed(1)}px`);
    pampCursor.style.setProperty("--pamp-top", `${top.toFixed(1)}px`);
    pampCursor.classList.toggle("is-hover", pampCursorHover);
    pampCursor.classList.add("is-visible");
    document.documentElement.classList.add("pamp-cursor-ready");
    document.body.classList.add("pamp-cursor-ready");
  }

  function requestPampCursorFrame() {
    if (!pampCursor || pampCursorFrame) {
      return;
    }
    pampCursorFrame = window.requestAnimationFrame(renderPampCursor);
  }

  let cachedBubbleWidth = 260;

  function updatePampCursor(event) {
    if (isTouchMode()) {
      pampCursor?.classList.remove("is-visible", "is-hover");
      return;
    }
    if (!pampCursor || !event || typeof event.clientX !== "number" || typeof event.clientY !== "number") {
      return;
    }
    lastCursorX = event.clientX;
    lastCursorY = event.clientY;
    // Use target from mouse event directly to avoid layout thrashing via elementFromPoint
    const target = event.target;
    pampCursorHover = isPampInteractiveTarget(target);
    requestPampCursorFrame();
  }

  function updateCursorBubblePosition(x = lastCursorX, y = lastCursorY) {
    lastCursorX = x;
    lastCursorY = y;
    if (!cursorBubble) {
      return;
    }

    const offsetX = 70;
    const offsetY = -12;
    const viewportPadding = 12;
    const bubbleWidth = Math.min(cachedBubbleWidth, window.innerWidth - viewportPadding * 2);
    const maxX = Math.max(viewportPadding, window.innerWidth - bubbleWidth - viewportPadding);
    let nextX = x + offsetX;
    let isLeftSide = false;

    if (nextX > maxX) {
      nextX = Math.max(viewportPadding, Math.min(maxX, x - bubbleWidth - 18));
      isLeftSide = true;
    } else {
      nextX = Math.max(viewportPadding, nextX);
    }

    const nextY = Math.max(viewportPadding, Math.min(window.innerHeight - 54, y + offsetY));
    cursorBubble.classList.toggle("is-left", isLeftSide);
    cursorBubble.style.setProperty("--cursor-bubble-x", `${nextX.toFixed(1)}px`);
    cursorBubble.style.setProperty("--cursor-bubble-y", `${nextY.toFixed(1)}px`);
  }

  function showCursorBubble(message, duration = 1900, event = null) {
    if (!cursorBubble) {
      return;
    }

    cursorBubble.textContent = message;
    // Cache the measured width here once, when content changes, avoiding DOM query on mousemove
    cachedBubbleWidth = cursorBubble.getBoundingClientRect().width || 260;

    if (event && typeof event.clientX === "number" && typeof event.clientY === "number") {
      updateCursorBubblePosition(event.clientX, event.clientY);
    } else {
      updateCursorBubblePosition();
    }

    cursorBubble.classList.add("is-visible");
    cursorBubbleToken += 1;
    const activeBubbleToken = cursorBubbleToken;
    window.clearTimeout(cursorBubbleTimer);
    cursorBubbleTimer = window.setTimeout(() => {
      if (activeBubbleToken !== cursorBubbleToken) {
        return;
      }
      cursorBubble.classList.remove("is-visible");
    }, duration);
  }

  function showContextualBubble(key, message, duration = 2400, event = null, cooldown = 3600) {
    const now = performance.now();
    if (key === contextualBubbleLastKey && now - contextualBubbleLastPlayed < cooldown) {
      return;
    }
    contextualBubbleLastKey = key;
    contextualBubbleLastPlayed = now;
    showCursorBubble(message, duration, event);
  }

  function clearHover() {
    pampCursor?.classList.remove("is-hover");
  }

  return {
    clearHover,
    isPampInteractiveTarget,
    showContextualBubble,
    showCursorBubble,
    updateCursorBubblePosition,
    updatePampCursor,
  };
}
