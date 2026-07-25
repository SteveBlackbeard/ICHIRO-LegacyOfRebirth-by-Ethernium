import { readRuntimePhase } from "./runtime-phase.js?v=kpr-lifecycle-core-230";

function bool(value) {
  return value ? "on" : "off";
}

function isElementVisible(element) {
  if (!element) {
    return false;
  }
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  return rect.width > 0
    && rect.height > 0
    && rect.bottom >= 0
    && rect.right >= 0
    && rect.top <= window.innerHeight
    && rect.left <= window.innerWidth
    && style.display !== "none"
    && style.visibility !== "hidden"
    && Number(style.opacity || 1) > 0.01;
}

function canvasState(selector) {
  const canvas = document.querySelector(selector);
  if (!canvas) {
    return "missing";
  }
  return `${canvas.width || 0}x${canvas.height || 0}/${bool(isElementVisible(canvas))}`;
}

function createFpsSampler() {
  const sampleWindow = 90;
  const frames = [];
  let raf = null;
  let lastFrameAt = 0;
  let startedAt = 0;
  let running = false;
  const state = {
    fps: 0,
    fpsMin: 0,
    fpsMax: 0,
    frameMs: 0,
    samples: 0,
  };

  function publish(now) {
    if (frames.length < 2) {
      return;
    }

    const deltas = [];
    for (let index = 1; index < frames.length; index += 1) {
      deltas.push(frames[index] - frames[index - 1]);
    }

    const avgMs = deltas.reduce((total, value) => total + value, 0) / deltas.length;
    const minMs = Math.min(...deltas);
    const maxMs = Math.max(...deltas);
    state.fps = avgMs > 0 ? Math.round(1000 / avgMs) : 0;
    state.fpsMax = minMs > 0 ? Math.round(1000 / minMs) : 0;
    state.fpsMin = maxMs > 0 ? Math.round(1000 / maxMs) : 0;
    state.frameMs = Math.round(avgMs * 10) / 10;
    state.samples = frames.length;
    document.documentElement.dataset.kprDebugFps = String(state.fps);
    document.documentElement.dataset.kprDebugFpsMin = String(state.fpsMin);
    document.documentElement.dataset.kprDebugFpsMax = String(state.fpsMax);
    document.documentElement.dataset.kprDebugFrameMs = String(state.frameMs);
    document.documentElement.dataset.kprDebugFpsSamples = String(state.samples);
    document.documentElement.dataset.kprDebugFpsAge = String(Math.round(now - startedAt));
    window.__kprFpsSampler = api;
  }

  function tick(now) {
    if (!running) {
      return;
    }

    if (!startedAt) {
      startedAt = now;
    }
    frames.push(now);
    if (frames.length > sampleWindow) {
      frames.shift();
    }
    if (lastFrameAt) {
      publish(now);
    }
    lastFrameAt = now;
    raf = window.requestAnimationFrame(tick);
  }

  function start() {
    if (running) {
      return api;
    }
    running = true;
    raf = window.requestAnimationFrame(tick);
    return api;
  }

  function stop() {
    running = false;
    if (raf) {
      window.cancelAnimationFrame(raf);
      raf = null;
    }
  }

  const api = {
    getState: () => ({ ...state }),
    start,
    stop,
  };

  return api;
}

function createArchiveVideoFrameProbe() {
  const sampleWindow = 90;
  const frames = [];
  let running = false;
  let timer = null;
  let videoRequest = null;
  let raf = null;
  let activeVideo = null;
  let lastMediaTime = -1;
  let startedAt = 0;
  const state = {
    status: "idle",
    method: "none",
    fps: 0,
    frameMs: 0,
    samples: 0,
    ageMs: 0,
    width: 0,
    height: 0,
    paused: true,
  };

  function targets() {
    return {
      archive: document.querySelector("#archive-screen"),
      video: document.querySelector("#archive-video"),
    };
  }

  function isActive(archive, video) {
    return Boolean(
      archive
      && video
      && archive.classList.contains("archive-video-active")
      && !archive.classList.contains("hidden"),
    );
  }

  function publish(now = performance.now()) {
    const root = document.documentElement;
    state.ageMs = startedAt ? Math.round(now - startedAt) : 0;
    root.dataset.kprArchiveVideoFps = String(state.fps);
    root.dataset.kprArchiveVideoFrameMs = String(state.frameMs);
    root.dataset.kprArchiveVideoFpsSamples = String(state.samples);
    root.dataset.kprArchiveVideoFpsAge = String(state.ageMs);
    root.dataset.kprArchiveVideoFpsMethod = state.method;
    root.dataset.kprArchiveVideoFpsStatus = state.status;
    root.dataset.kprArchiveVideoSize = `${state.width || 0}x${state.height || 0}`;
    window.__kprArchiveVideoFpsProbe = api;
  }

  function compute(now) {
    if (frames.length < 2) {
      publish(now);
      return;
    }

    const deltas = [];
    for (let index = 1; index < frames.length; index += 1) {
      const delta = frames[index] - frames[index - 1];
      if (delta > 0) {
        deltas.push(delta);
      }
    }
    if (!deltas.length) {
      publish(now);
      return;
    }

    const avgMs = deltas.reduce((total, value) => total + value, 0) / deltas.length;
    state.fps = avgMs > 0 ? Math.round(1000 / avgMs) : 0;
    state.frameMs = Math.round(avgMs * 10) / 10;
    state.samples = frames.length;
    publish(now);
  }

  function cancelSampling() {
    if (activeVideo && videoRequest && typeof activeVideo.cancelVideoFrameCallback === "function") {
      activeVideo.cancelVideoFrameCallback(videoRequest);
    }
    if (raf) {
      window.cancelAnimationFrame(raf);
    }
    videoRequest = null;
    raf = null;
  }

  function reset(status = "idle") {
    cancelSampling();
    frames.length = 0;
    startedAt = 0;
    lastMediaTime = -1;
    state.status = status;
    state.method = "none";
    state.fps = 0;
    state.frameMs = 0;
    state.samples = 0;
    state.ageMs = 0;
    state.width = 0;
    state.height = 0;
    state.paused = true;
    publish();
  }

  function pushFrame(now, video, width = 0, height = 0) {
    state.status = video.paused || video.ended ? "paused" : "sampling";
    state.width = width || video.videoWidth || 0;
    state.height = height || video.videoHeight || 0;
    state.paused = video.paused;

    if (state.status !== "sampling") {
      publish(now);
      return;
    }

    if (!startedAt) {
      startedAt = now;
    }
    frames.push(now);
    if (frames.length > sampleWindow) {
      frames.shift();
    }
    compute(now);
  }

  function tickVideo(now, metadata = {}) {
    videoRequest = null;
    const { archive, video } = targets();
    activeVideo = video;
    if (!running) {
      return;
    }
    if (!isActive(archive, video)) {
      reset("idle");
      return;
    }

    state.method = "requestVideoFrameCallback";
    pushFrame(now, video, metadata.width, metadata.height);
    if (running && typeof video.requestVideoFrameCallback === "function") {
      videoRequest = video.requestVideoFrameCallback(tickVideo);
    }
  }

  function tickRaf(now) {
    raf = null;
    const { archive, video } = targets();
    activeVideo = video;
    if (!running) {
      return;
    }
    if (!isActive(archive, video)) {
      reset("idle");
      return;
    }

    state.method = "raf-currentTime";
    const mediaTime = Math.round((video.currentTime || 0) * 1000);
    if (mediaTime !== lastMediaTime) {
      lastMediaTime = mediaTime;
      pushFrame(now, video);
    } else {
      publish(now);
    }
    if (running) {
      raf = window.requestAnimationFrame(tickRaf);
    }
  }

  function ensureSampling() {
    const { archive, video } = targets();
    activeVideo = video;
    if (!isActive(archive, video)) {
      reset("idle");
      return;
    }

    state.paused = video.paused;
    state.width = video.videoWidth || state.width || 0;
    state.height = video.videoHeight || state.height || 0;
    if (video.paused || video.ended) {
      state.status = video.ended ? "ended" : "paused";
      state.method = "waiting";
      publish();
      return;
    }
    if (videoRequest || raf) {
      return;
    }

    if (typeof video.requestVideoFrameCallback === "function") {
      state.status = "sampling";
      state.method = "requestVideoFrameCallback";
      videoRequest = video.requestVideoFrameCallback(tickVideo);
      publish();
      return;
    }
    if (typeof window.requestAnimationFrame === "function") {
      state.status = "sampling";
      state.method = "raf-currentTime";
      raf = window.requestAnimationFrame(tickRaf);
      publish();
      return;
    }
    reset("unsupported");
  }

  function start() {
    if (running) {
      return api;
    }
    running = true;
    window.__kprArchiveVideoFpsProbe = api;
    timer = window.setInterval(ensureSampling, 250);
    ensureSampling();
    return api;
  }

  function stop() {
    running = false;
    if (timer) {
      window.clearInterval(timer);
      timer = null;
    }
    reset("stopped");
  }

  const api = {
    getState: () => ({ ...state }),
    start,
    stop,
  };

  return api;
}

function readDebugState(getMotionQuality, getVisualQualityState) {
  const root = document.documentElement;
  const body = document.body;
  const archiveScreen = document.querySelector("#archive-screen");
  const archiveVideo = document.querySelector("#archive-video");
  const kpcoLogoVideo = document.querySelector("#kpco-logo-video");
  const archiveCanvas = document.querySelector("#archive-3d");
  const preload = window.__kprPreloadDirector || {};
  const phase = readRuntimePhase();
  const visual = getVisualQualityState?.() || window.__kprVisualQualityController?.getState?.() || {};
  const fps = window.__kprFpsSampler?.getState?.() || {};
  const archiveVideoFps = window.__kprArchiveVideoFpsProbe?.getState?.() || {};
  const accessParticles = document.visibilityState !== "hidden"
    && !body.classList.contains("prelaunch")
    && !body.classList.contains("intro-active")
    && !body.classList.contains("authenticated");

  return {
    phase,
    perf: root.dataset.kprPerf || "unknown",
    motion: getMotionQuality?.() || "unknown",
    visual: visual.mode || root.dataset.kprVisualQuality || "baseline",
    visualBudget: [
      visual.render || root.dataset.kprVisualRender || "approved",
      visual.particles || root.dataset.kprVisualParticles || "approved",
      visual.webgl || root.dataset.kprVisualWebgl || "approved",
    ].join("/"),
    visualCadence: visual.cadence || root.dataset.kprVisualCadence || "approved",
    visualReason: visual.reason || root.dataset.kprVisualReason || "baseline",
    preload: root.dataset.kprPreload || "baseline",
    preloadStage: preload.lastStage || root.dataset.kprPreloadStage || "idle",
    preloadWarm: preload.warmed?.length ?? Number(root.dataset.kprPreloadWarm || 0),
    preloadPending: preload.pending?.length ?? Number(root.dataset.kprPreloadPending || 0),
    video: root.dataset.kprVideo || "unknown",
    yatagarasu: root.dataset.kprYatagarasu || "unknown",
    visibility: document.visibilityState,
    fps: fps.fps || 0,
    fpsRange: `${fps.fpsMin || 0}-${fps.fpsMax || 0}`,
    frameMs: fps.frameMs || 0,
    fpsSamples: fps.samples || 0,
    archiveVideoFps: archiveVideoFps.fps || Number(root.dataset.kprArchiveVideoFps || 0),
    archiveVideoFrameMs: archiveVideoFps.frameMs || Number(root.dataset.kprArchiveVideoFrameMs || 0),
    archiveVideoFpsSamples: archiveVideoFps.samples || Number(root.dataset.kprArchiveVideoFpsSamples || 0),
    archiveVideoFpsStatus: archiveVideoFps.status || root.dataset.kprArchiveVideoFpsStatus || "idle",
    archiveVideoFpsMethod: archiveVideoFps.method || root.dataset.kprArchiveVideoFpsMethod || "none",
    archiveVideoFpsAge: archiveVideoFps.ageMs || Number(root.dataset.kprArchiveVideoFpsAge || 0),
    archiveVideoSize: root.dataset.kprArchiveVideoSize || `${archiveVideoFps.width || 0}x${archiveVideoFps.height || 0}`,
    viewport: `${window.innerWidth}x${window.innerHeight}@${Math.round((window.devicePixelRatio || 1) * 100) / 100}`,
    hardware: `${navigator.hardwareConcurrency || "?"}c/${navigator.deviceMemory || "?"}gb`,
    saveData: bool(navigator.connection?.saveData),
    body: [
      body.classList.contains("prelaunch") ? "prelaunch" : "",
      body.classList.contains("intro-active") ? "intro" : "",
      body.classList.contains("authenticated") ? "auth" : "",
      body.classList.contains("low-power") ? "low" : "",
    ].filter(Boolean).join(" ") || "none",
    archive: archiveScreen?.classList.contains("hidden") ? "hidden" : "visible",
    archiveVideoStage: archiveScreen?.classList.contains("archive-video-active") ? "active" : "idle",
    archiveVideo: archiveVideo
      ? `${archiveVideo.dataset.videoVariant || "?"}/${archiveVideo.paused ? "paused" : "play"}/${archiveVideo.muted ? "muted" : "audible"}`
      : "missing",
    externalAudio: archiveVideo?.dataset.externalAudio || "false",
    archiveSource: archiveVideo?.getAttribute("src") || "missing",
    kpcoSource: kpcoLogoVideo
      ? `${kpcoLogoVideo.readyState}/w${kpcoLogoVideo.videoWidth || 0}`
      : "missing",
    particles: accessParticles ? "access-active" : "idle",
    kpcoAccess: canvasState("#kpco-logo-canvas"),
    kpcoHack: canvasState("#kpco-hack-logo-canvas"),
    kpcoArchive: canvasState("#kpco-archive-logo-canvas"),
    archive3d: archiveCanvas
      ? `${archiveCanvas.width || 0}x${archiveCanvas.height || 0}/${bool(isElementVisible(archiveCanvas))}`
      : "missing",
  };
}

function renderRows(state) {
  return [
    ["phase", state.phase],
    ["perf", `${state.perf} / ${state.motion}`],
    ["visual", `${state.visual} / ${state.visualCadence}`],
    ["visual-budget", state.visualBudget],
    ["visual-reason", state.visualReason],
    ["preload", `${state.preload} / ${state.preloadStage}`],
    ["preload-warm", state.preloadWarm],
    ["preload-pending", state.preloadPending],
    ["video", state.video],
    ["yatagarasu", state.yatagarasu],
    ["visibility", state.visibility],
    ["fps", `${state.fps} (${state.fpsRange})`],
    ["frame-ms", state.frameMs],
    ["fps-samples", state.fpsSamples],
    ["video-fps", `${state.archiveVideoFps} / ${state.archiveVideoFrameMs}ms`],
    ["video-fps-state", `${state.archiveVideoFpsStatus} / ${state.archiveVideoFpsMethod}`],
    ["video-fps-samples", `${state.archiveVideoFpsSamples} / ${state.archiveVideoFpsAge}ms`],
    ["video-size", state.archiveVideoSize],
    ["viewport", state.viewport],
    ["hardware", state.hardware],
    ["save-data", state.saveData],
    ["body", state.body],
    ["archive", state.archive],
    ["video-stage", state.archiveVideoStage],
    ["video-state", state.archiveVideo],
    ["external-audio", state.externalAudio],
    ["video-src", state.archiveSource],
    ["kpco-src", state.kpcoSource],
    ["particles", state.particles],
    ["kpco-access", state.kpcoAccess],
    ["kpco-hack", state.kpcoHack],
    ["kpco-archive", state.kpcoArchive],
    ["archive-3d", state.archive3d],
  ].map(([label, value]) => `<div><span>${label}</span><b>${value}</b></div>`).join("");
}

export function startPerformanceDebugPanel({ getMotionQuality, getVisualQualityState } = {}) {
  const params = new URLSearchParams(window.location.search);
  if (params.get("debug") !== "perf") {
    return null;
  }

  if (!document.querySelector("#kpr-perf-debug-style")) {
    const style = document.createElement("style");
    style.id = "kpr-perf-debug-style";
    style.textContent = `
      .kpr-perf-debug {
        position: fixed;
        right: 12px;
        top: 12px;
        z-index: 100000;
        width: min(360px, calc(100vw - 24px));
        max-height: calc(100vh - 24px);
        overflow: auto;
        padding: 10px 12px;
        border: 1px solid rgba(255,255,255,.45);
        border-radius: 8px;
        background: rgba(0,0,0,.82);
        color: #f4f4f4;
        font: 10px/1.35 Consolas, "Courier New", monospace;
        letter-spacing: 0;
        box-shadow: 0 0 24px rgba(255,255,255,.12);
        pointer-events: none;
      }
      .kpr-perf-debug h2 {
        margin: 0 0 8px;
        font-size: 11px;
        font-weight: 700;
        color: #fff;
        text-transform: uppercase;
      }
      .kpr-perf-debug div {
        display: grid;
        grid-template-columns: 92px 1fr;
        gap: 8px;
        padding: 2px 0;
        border-top: 1px solid rgba(255,255,255,.08);
      }
      .kpr-perf-debug span {
        color: rgba(183,255,247,.82);
        text-transform: uppercase;
      }
      .kpr-perf-debug b {
        color: rgba(255,255,255,.92);
        font-weight: 400;
        word-break: break-word;
      }
    `;
    document.head.append(style);
  }

  const panel = document.createElement("aside");
  panel.className = "kpr-perf-debug";
  panel.setAttribute("aria-label", "KPR performance debug");
  panel.innerHTML = `
    <h2>KPR PERF DEBUG</h2>
    <section></section>
  `;
  document.body.append(panel);

  const content = panel.querySelector("section");
  const fpsSampler = createFpsSampler().start();
  const archiveVideoProbe = createArchiveVideoFrameProbe().start();
  let timer = null;
  const update = () => {
    content.innerHTML = renderRows(readDebugState(getMotionQuality, getVisualQualityState));
  };
  update();
  timer = window.setInterval(update, 500);

  return {
    stop() {
      if (timer) {
        window.clearInterval(timer);
        timer = null;
      }
      fpsSampler.stop();
      archiveVideoProbe.stop();
      panel.remove();
    },
  };
}
