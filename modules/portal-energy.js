const TAU = Math.PI * 2;
const BASE_ENERGY = 0.72;

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}

function decay(value, elapsedMs, halfLifeMs) {
  if (value <= 0 || elapsedMs <= 0) return Math.max(0, value);
  return value * Math.pow(0.5, elapsedMs / halfLifeMs);
}

export function resolvePortalMode(search = window.location.search) {
  return new URLSearchParams(search).get("portal") === "coherent" ? "coherent" : "baseline";
}

export function samplePortalEnergy({
  nowMs = 0,
  mapProgress = 0,
  pointerStrength = 0,
  impulseStrength = 0,
  audioPulse = 0,
  pointerX = 0.5,
  pointerY = 0.5,
  phase = "hidden",
  quality = 1,
} = {}) {
  const time = Math.max(0, nowMs) * 0.001;
  const cyclePhase = time * (TAU / 7.5);
  const breathe = Math.sin(cyclePhase);
  const surgeTime = time % 9;
  const surge = Math.max(0, 1 - Math.abs(surgeTime - 4.5) / 0.72);
  const aperture = clamp(mapProgress);
  const pointer = clamp(pointerStrength);
  const impulse = clamp(impulseStrength, 0, 2);
  const audio = clamp(audioPulse, 0, 0.2);
  const energy = clamp(
    BASE_ENERGY + surge * 0.22 + pointer * 0.28 + impulse * 0.34 + audio * 3,
    0,
    1.6,
  );

  return Object.freeze({
    mode: "coherent",
    time,
    phase,
    aperture,
    breathe,
    surge,
    energy,
    pointer: Object.freeze({
      x: clamp(pointerX),
      y: clamp(pointerY),
      strength: pointer,
    }),
    impulse,
    quality: clamp(quality, 0.25, 1),
  });
}

export function createPortalEnergyDirector({
  mode = resolvePortalMode(),
  root = document.documentElement,
  archiveScreen = document.getElementById("archive-screen"),
  viewport = document.querySelector(".eden-map-viewport"),
} = {}) {
  const active = mode === "coherent";
  let bound = false;
  let mapProgress = 0;
  let pointerX = 0.5;
  let pointerY = 0.5;
  let pointerStrength = 0;
  let pointerUpdatedAt = 0;
  let impulseStrength = 0;
  let impulseUpdatedAt = 0;
  let quality = 1;
  let cachedReadAt = -1;
  const liveState = {
    mode: "coherent",
    time: 0,
    phase: "hidden",
    aperture: 0,
    breathe: 0,
    surge: 0,
    energy: BASE_ENERGY,
    pointer: { x: 0.5, y: 0.5, strength: 0 },
    impulse: 0,
    quality: 1,
  };

  const now = () => window.performance?.now?.() ?? Date.now();

  function currentPhase() {
    if (document.hidden) return "hidden";
    if (root?.classList.contains("kpr-warp-active")) return "warp";
    if (root?.classList.contains("kpr-portal-entering")) return "threshold";
    if (mapProgress > 0.01) return "map";
    return "idle";
  }

  function sample(at = now()) {
    const pointer = decay(pointerStrength, at - pointerUpdatedAt, 520);
    const impulse = decay(impulseStrength, at - impulseUpdatedAt, 760);
    return samplePortalEnergy({
      nowMs: at,
      mapProgress,
      pointerStrength: pointer,
      impulseStrength: impulse,
      pointerX,
      pointerY,
      phase: currentPhase(),
      quality,
    });
  }

  // Hot-path reader shared by the 2D field and WebGL renderer. It mutates one
  // stable object and caches each millisecond, avoiding per-frame garbage while
  // keeping both renderers on the same clock and energy field.
  function read(at = now()) {
    const tick = Math.floor(at);
    if (tick === cachedReadAt) return liveState;
    cachedReadAt = tick;
    const time = Math.max(0, at) * 0.001;
    const pointer = decay(pointerStrength, at - pointerUpdatedAt, 520);
    const impulse = decay(impulseStrength, at - impulseUpdatedAt, 760);
    const cyclePhase = time * (TAU / 7.5);
    const surgeTime = time % 9;
    const surge = Math.max(0, 1 - Math.abs(surgeTime - 4.5) / 0.72);

    liveState.time = time;
    liveState.phase = currentPhase();
    liveState.aperture = clamp(mapProgress);
    liveState.breathe = Math.sin(cyclePhase);
    liveState.surge = surge;
    liveState.energy = clamp(BASE_ENERGY + surge * 0.22 + pointer * 0.28 + impulse * 0.34, 0, 1.6);
    liveState.pointer.x = pointerX;
    liveState.pointer.y = pointerY;
    liveState.pointer.strength = pointer;
    liveState.impulse = impulse;
    liveState.quality = clamp(quality, 0.25, 1);
    return liveState;
  }

  function publish(reason) {
    if (!active) return;
    cachedReadAt = -1;
    const state = read();
    if (root) {
      root.dataset.kprPortalPhase = state.phase;
      root.dataset.kprPortalAperture = state.aperture.toFixed(3);
      root.dataset.kprPortalEnergy = state.energy.toFixed(3);
    }
    document.dispatchEvent(new CustomEvent("kpr-portal-energy-state", {
      detail: { ...state, pointer: { ...state.pointer }, reason },
    }));
  }

  function setImpulse(value = 1, reason = "impulse") {
    if (!active) return;
    const at = now();
    impulseStrength = Math.max(decay(impulseStrength, at - impulseUpdatedAt, 760), clamp(value, 0, 2));
    impulseUpdatedAt = at;
    publish(reason);
  }

  function handleFold(event) {
    mapProgress = clamp(event?.detail?.map);
    publish("phase");
  }

  function handlePointerMove(event) {
    const rect = viewport?.getBoundingClientRect();
    if (!rect?.width || !rect?.height) return;
    pointerX = clamp((event.clientX - rect.left) / rect.width);
    pointerY = clamp((event.clientY - rect.top) / rect.height);
    const at = now();
    pointerStrength = Math.max(decay(pointerStrength, at - pointerUpdatedAt, 520), 0.9);
    pointerUpdatedAt = at;
    publish("pointer");
  }

  function handlePointerLeave() {
    pointerStrength = 0;
    pointerUpdatedAt = now();
    publish("pointer-leave");
  }

  function handlePointerDown() {
    setImpulse(1, "pointer-down");
  }

  function handleNodeSelected() {
    setImpulse(1.35, "node-selected");
  }

  function handleVisibility() {
    publish(document.hidden ? "hidden" : "visible");
  }

  function bind() {
    if (!active || bound) return;
    bound = true;
    const publishedMap = Number(window.__kprArchiveFold?.map);
    if (Number.isFinite(publishedMap)) mapProgress = clamp(publishedMap);
    document.addEventListener("kpr-archive-fold-progress", handleFold);
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("kpr-map-node-selected", handleNodeSelected);
    viewport?.addEventListener("pointermove", handlePointerMove, { passive: true });
    viewport?.addEventListener("pointerleave", handlePointerLeave, { passive: true });
    viewport?.addEventListener("pointerdown", handlePointerDown, { passive: true });
    publish("bind");
  }

  function destroy() {
    if (!bound) return;
    bound = false;
    document.removeEventListener("kpr-archive-fold-progress", handleFold);
    document.removeEventListener("visibilitychange", handleVisibility);
    window.removeEventListener("kpr-map-node-selected", handleNodeSelected);
    viewport?.removeEventListener("pointermove", handlePointerMove);
    viewport?.removeEventListener("pointerleave", handlePointerLeave);
    viewport?.removeEventListener("pointerdown", handlePointerDown);
  }

  function setQuality(value) {
    quality = clamp(value, 0.25, 1);
    publish("quality");
  }

  const api = Object.freeze({
    mode,
    active,
    bind,
    destroy,
    sample,
    read,
    impulse: setImpulse,
    setQuality,
  });

  if (root) root.dataset.kprPortalMode = mode;

  if (archiveScreen && typeof window !== "undefined") {
    window.__kprPortalEnergy = Object.freeze({
      mode,
      sample,
      read,
    });
  }

  return api;
}
