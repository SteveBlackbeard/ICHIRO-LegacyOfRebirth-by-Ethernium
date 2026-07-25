import { readRuntimePhase } from "./runtime-phase.js?v=kpr-lifecycle-core-230";

function classifyDevice() {
  const memory = navigator.deviceMemory || 8;
  const cores = navigator.hardwareConcurrency || 8;
  const saveData = Boolean(navigator.connection?.saveData);
  const dpr = window.devicePixelRatio || 1;

  if (saveData || memory <= 4 || cores <= 4) {
    return "frugal";
  }
  if (memory >= 12 && cores >= 12 && dpr <= 1.5) {
    return "headroom";
  }
  return "standard";
}

function chooseBudget({ mode, phase, motionQuality, deviceClass, pageVisible }) {
  if (mode !== "adaptive") {
    return {
      render: "approved",
      particles: "approved",
      webgl: "approved",
      cadence: "approved",
      reason: "baseline-no-visual-change",
    };
  }

  if (!pageVisible) {
    return {
      render: "dormant",
      particles: "offscreen",
      webgl: "sleep",
      cadence: "pause",
      reason: "tab-hidden",
    };
  }

  const constrained = motionQuality !== "high" || deviceClass === "frugal";

  if (phase === "prelaunch") {
    return {
      render: constrained ? "balanced" : "high",
      particles: "off",
      webgl: "activation",
      cadence: constrained ? "30-45fps" : "60fps",
      reason: "activation-focus",
    };
  }

  if (phase === "hack-intro") {
    return {
      render: "balanced",
      particles: "off",
      webgl: "idle",
      cadence: constrained ? "30fps" : "45fps",
      reason: "terminal-text-priority",
    };
  }

  if (phase === "access-terminal") {
    return {
      render: constrained ? "balanced" : "high",
      particles: constrained ? "medium" : "cinematic",
      webgl: "dormant",
      cadence: constrained ? "45fps" : "60fps",
      reason: "access-rain-priority",
    };
  }

  if (phase === "archive-video") {
    return {
      render: "balanced",
      particles: "off",
      webgl: constrained ? "event-driven" : "cinematic",
      cadence: constrained ? "30fps" : "45fps",
      reason: "video-and-lore-priority",
    };
  }

  return {
    render: constrained ? "balanced" : "high",
    particles: "off",
    webgl: constrained ? "event-driven" : "interactive",
    cadence: constrained ? "30-45fps" : "60fps",
    reason: "character-profile-priority",
  };
}

export function createVisualQualityController({
  getMotionQuality = () => "high",
  getPageVisible = () => document.visibilityState !== "hidden",
  phaseDirector = null,
} = {}) {
  const params = new URLSearchParams(window.location.search);
  const mode = params.get("visual") === "adaptive" ? "adaptive" : "baseline";
  const root = document.documentElement;
  const archiveScreen = document.querySelector("#archive-screen");
  const observers = [];
  let unsubscribePhase = null;
  let raf = null;
  let state = {
    mode,
    phase: "boot",
    deviceClass: classifyDevice(),
    motionQuality: getMotionQuality(),
    render: "approved",
    particles: "approved",
    webgl: "approved",
    cadence: "approved",
    reason: "not-started",
  };

  function publish(nextState) {
    state = nextState;
    root.dataset.kprVisualQuality = state.mode;
    root.dataset.kprVisualPhase = state.phase;
    root.dataset.kprVisualDevice = state.deviceClass;
    root.dataset.kprVisualRender = state.render;
    root.dataset.kprVisualParticles = state.particles;
    root.dataset.kprVisualWebgl = state.webgl;
    root.dataset.kprVisualCadence = state.cadence;
    root.dataset.kprVisualReason = state.reason;
    window.__kprVisualQualityController = api;
    document.dispatchEvent(new CustomEvent("kpr-visual-quality", { detail: { ...state } }));
  }

  function update() {
    raf = null;
    const phase = phaseDirector?.current?.() || readRuntimePhase();
    const motionQuality = getMotionQuality();
    const deviceClass = classifyDevice();
    const budget = chooseBudget({
      mode,
      phase,
      motionQuality,
      deviceClass,
      pageVisible: getPageVisible(),
    });

    publish({
      mode,
      phase,
      deviceClass,
      motionQuality,
      ...budget,
    });
  }

  function schedule() {
    if (!raf) {
      raf = window.requestAnimationFrame(update);
    }
  }

  function start() {
    publish(state);
    schedule();

    if (phaseDirector?.subscribe) {
      unsubscribePhase = phaseDirector.subscribe(schedule, { immediate: false });
    } else {
      const bodyObserver = new MutationObserver(schedule);
      bodyObserver.observe(document.body, { attributes: true, attributeFilter: ["class"] });
      observers.push(bodyObserver);

      if (archiveScreen) {
        const archiveObserver = new MutationObserver(schedule);
        archiveObserver.observe(archiveScreen, { attributes: true, attributeFilter: ["class"] });
        observers.push(archiveObserver);
      }
    }

    document.addEventListener("visibilitychange", schedule);
    window.addEventListener("resize", schedule, { passive: true });
    document.addEventListener("kpr-archive-fold-progress", schedule);

    return api;
  }

  function stop() {
    if (raf) {
      window.cancelAnimationFrame(raf);
      raf = null;
    }
    observers.forEach((observer) => observer.disconnect());
    observers.length = 0;
    unsubscribePhase?.();
    unsubscribePhase = null;
    document.removeEventListener("visibilitychange", schedule);
    window.removeEventListener("resize", schedule);
    document.removeEventListener("kpr-archive-fold-progress", schedule);
  }

  const api = {
    getState: () => ({ ...state }),
    mode,
    start,
    stop,
  };

  return api;
}
