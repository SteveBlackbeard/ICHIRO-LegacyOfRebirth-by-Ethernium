export function createPreloadDirector({
  archiveVideo,
  variants = {},
  getPageVisible = () => document.visibilityState !== "hidden",
} = {}) {
  const params = new URLSearchParams(window.location.search);
  const mode = params.get("preload") === "baseline" ? "baseline" : "smart";
  const enabled = mode === "smart";
  const warmed = new Set();
  const pending = new Map();
  const stats = {
    enabled,
    mode,
    stages: [],
    warmed: [],
    videoPreload: archiveVideo?.preload || "none",
    lastStage: "boot",
  };

  const yatagarasuUrl = variants.yatagarasu === "baseline"
    ? "assets/models/YATAGARASU BASE LOW.glb"
    : variants.yatagarasu === "budget"
      ? "assets/models/yatagarasu-blueprint-budget.glb"
      : "assets/models/yatagarasu-blueprint-studio.glb?v=kpr-media-271";
  const videoUrl = variants.video === "baseline"
    ? "assets/video/designation-silent-sentinel.mp4"
    : "assets/video/designation-silent-sentinel-budget.mp4?v=kpr-media-270";

  const stages = {
    prelaunch: [
      ["image", "assets/ui/community-cursor-small.png"],
      ["image", "assets/ui/community-cursor-holo.png"],
      ["image", "assets/brand/hack-activation-logo.png"],
      ["image", "assets/brand/kpr-logo-symbol.png"],
    ],
    hack: [
      ["video", "assets/video/kpco-logo-transparent.webm?v=kpr-media-270"],
      ["image", "assets/characters/ichiro-login-left.png"],
      ["image", "assets/brand/ichiro-logo.png"],
      ["audio", "assets/audio/hack-sound.mp3"],
      ["audio", "assets/audio/under-the-water.mp3"],
    ],
    access: [
      ["image", "assets/characters/ichiro-center.png"],
      ["image", "assets/brand/kpco-lockup-cropped.png"],
      ["image", "assets/brand/kpr-logo-white-mark.png"],
      ["image", "assets/brand/logo-wanderer.png"],
      ["image", "assets/brand/logo-a-mark.png"],
      ["image", "assets/brand/logo-badge.png"],
    ],
    archive: [
      ["fetch", "assets/models/blade-low-source.glb"],
      ["fetch", yatagarasuUrl],
      ["image", "assets/dossiers/dossier-00.png"],
      ["image", "assets/dossiers/dossier-01.jpg"],
      ["image", "assets/dossiers/dossier-02.png"],
      ["image", "assets/dossiers/dossier-00-content.png"],
      ["image", "assets/dossiers/dossier-01-content-1.gif"],
      ["image", "assets/dossiers/dossier-01-content-2.png"],
      ["image", "assets/dossiers/dossier-02-content.png"],
      ["image", "assets/dossiers/dossier-03.svg"],
      ["image", "assets/dossiers/dossier-04.svg"],
      ["image", "assets/dossiers/dossier-05.svg"],
    ],
    video: [
      ["video", videoUrl],
      ["text", "assets/lore/theoria_nulla.txt"],
      ["text", "assets/lore/the_existence.txt"],
      ["text", "assets/lore/message_from_the_existence.txt"],
      ["image", "assets/lore/everything3.png"],
      ["image", "assets/lore/message_second.png"],
      ["image", "assets/lore/message_third.png"],
      ["image", "assets/lore/the_existence_eyes.png"],
    ],
  };

  function publish() {
    const root = document.documentElement;
    root.dataset.kprPreload = mode;
    root.dataset.kprPreloadStage = stats.lastStage;
    root.dataset.kprPreloadWarm = String(warmed.size);
    root.dataset.kprPreloadPending = String(pending.size);
    window.__kprPreloadDirector = {
      ...stats,
      warmed: [...warmed],
      pending: [...pending.keys()],
    };
  }

  function schedule(task, timeout = 900) {
    if (!getPageVisible()) {
      window.setTimeout(task, Math.min(1200, timeout));
      return;
    }
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(task, { timeout });
      return;
    }
    window.setTimeout(task, 32);
  }

  function mark(key, stage) {
    warmed.add(key);
    pending.delete(key);
    stats.lastStage = stage;
    if (!stats.stages.includes(stage)) {
      stats.stages.push(stage);
    }
    stats.warmed = [...warmed];
    publish();
  }

  function warmImage(url, stage) {
    const key = `image:${url}`;
    if (warmed.has(key) || pending.has(key)) {
      return;
    }
    pending.set(key, true);
    schedule(() => {
      const image = new Image();
      image.decoding = "async";
      image.onload = () => mark(key, stage);
      image.onerror = () => mark(`${key}:error`, stage);
      image.src = url;
      image.decode?.().then(() => mark(key, stage)).catch(() => {});
    }, 650);
  }

  function warmAudioOrVideo(kind, url, stage) {
    const key = `${kind}:${url}`;
    if (warmed.has(key) || pending.has(key)) {
      return;
    }
    pending.set(key, true);
    schedule(() => {
      const media = document.createElement(kind === "audio" ? "audio" : "video");
      media.preload = "metadata";
      media.muted = true;
      media.playsInline = true;
      media.src = url;
      media.addEventListener("loadedmetadata", () => mark(key, stage), { once: true });
      media.addEventListener("error", () => mark(`${key}:error`, stage), { once: true });
      media.load();
    }, 1200);
  }

  function hintFetch(url, stage) {
    const key = `fetch:${url}`;
    if (warmed.has(key) || pending.has(key)) {
      return;
    }
    pending.set(key, true);
    schedule(() => {
      const selector = `link[data-kpr-preload="${CSS.escape(url)}"]`;
      if (!document.head.querySelector(selector)) {
        const link = document.createElement("link");
        link.rel = "prefetch";
        link.as = "fetch";
        link.href = url;
        link.dataset.kprPreload = url;
        link.crossOrigin = "anonymous";
        document.head.append(link);
      }
      mark(key, stage);
    }, 1400);
  }

  function hintText(url, stage) {
    const key = `text:${url}`;
    if (warmed.has(key) || pending.has(key)) {
      return;
    }
    pending.set(key, true);
    schedule(() => {
      fetch(url, { cache: "force-cache" })
        .then(() => mark(key, stage))
        .catch(() => mark(`${key}:error`, stage));
    }, 1400);
  }

  function warmStage(stage) {
    if (!enabled || !stages[stage]) {
      return;
    }
    stats.lastStage = stage;
    for (const [kind, url] of stages[stage]) {
      if (kind === "image") {
        warmImage(url, stage);
      } else if (kind === "audio" || kind === "video") {
        warmAudioOrVideo(kind, url, stage);
      } else if (kind === "fetch") {
        hintFetch(url, stage);
      } else if (kind === "text") {
        hintText(url, stage);
      }
    }
    publish();
  }

  function prepareVideoPreload() {
    if (!enabled || !archiveVideo || archiveVideo.preload === "auto") {
      return;
    }
    archiveVideo.preload = "auto";
    stats.videoPreload = "auto";
    archiveVideo.load?.();
    publish();
  }

  function inspectBodyPhase() {
    if (!enabled) {
      return;
    }
    if (!document.body.classList.contains("prelaunch")) {
      warmStage("hack");
    }
    if (document.body.classList.contains("terminal-revealing") || document.body.classList.contains("authenticated")) {
      warmStage("access");
    }
    if (document.body.classList.contains("authenticated")) {
      warmStage("archive");
    }
  }

  function handleArchiveFold(event) {
    if (!enabled) {
      return;
    }
    const detail = event.detail || {};
    const raw = Number(detail.raw || 0);
    const video = Number(detail.video || 0);
    if (raw > 0.04) {
      warmStage("archive");
    }
    if (video > 0.18) {
      prepareVideoPreload();
      warmStage("video");
    }
  }

  function start() {
    document.documentElement.dataset.kprPreload = mode;
    publish();
    if (!enabled) {
      return stats;
    }

    warmStage("prelaunch");
    inspectBodyPhase();

    const observer = new MutationObserver(inspectBodyPhase);
    observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    document.addEventListener("pointerdown", () => warmStage("hack"), { once: true, capture: true });
    window.addEventListener("ichiro:auth", () => {
      warmStage("access");
      warmStage("archive");
    });
    document.addEventListener("kpr-archive-fold-progress", handleArchiveFold);
    document.addEventListener("visibilitychange", publish);
    return stats;
  }

  return {
    start,
    warmStage,
    prepareVideoPreload,
    stats,
  };
}
