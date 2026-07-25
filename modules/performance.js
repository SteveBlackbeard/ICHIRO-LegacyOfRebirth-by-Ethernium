export function createPerformanceController({
  archiveVideo,
  getPageVisible = () => document.visibilityState !== "hidden",
} = {}) {
  const params = new URLSearchParams(window.location.search);
  const perfParam = params.get("perf");
  const videoParam = params.get("video");
  const yatagarasuParam = params.get("yatagarasu");
  const perfMode = perfParam === "baseline" ? "baseline" : "adaptive";
  const videoVariant = videoParam === "baseline" ? "baseline" : "budget";
  const yatagarasuVariant = yatagarasuParam === "baseline"
    ? "baseline"
    : yatagarasuParam === "budget"
      ? "budget"
      : "quant";
  const baselineVideoUrl = "assets/video/designation-silent-sentinel.mp4";
  const budgetVideoUrl = "assets/video/designation-silent-sentinel-budget.mp4";

  const baseMotionQuality = (() => {
    const memory = navigator.deviceMemory || 8;
    const cores = navigator.hardwareConcurrency || 8;
    const saveData = navigator.connection?.saveData || false;
    if (saveData || memory <= 4 || cores <= 4) {
      return "balanced";
    }
    return "high";
  })();

  function getMotionQuality() {
    if (perfMode !== "adaptive") {
      return baseMotionQuality;
    }
    if (!getPageVisible()) {
      return "balanced";
    }
    return baseMotionQuality;
  }

  async function assetExists(url) {
    try {
      const response = await fetch(url, { method: "HEAD", cache: "no-store" });
      return response.ok;
    } catch {
      return false;
    }
  }

  async function applyVideoVariant() {
    if (!archiveVideo) {
      return "none";
    }

    if (videoVariant === "baseline") {
      archiveVideo.dataset.videoVariant = "baseline";
      if (!archiveVideo.currentSrc.endsWith(baselineVideoUrl) && archiveVideo.getAttribute("src") !== baselineVideoUrl) {
        archiveVideo.src = baselineVideoUrl;
        archiveVideo.load();
      }
      return "baseline";
    }

    const exists = await assetExists(budgetVideoUrl);
    if (!exists) {
      archiveVideo.dataset.videoVariant = "budget-missing-fallback-baseline";
      if (!archiveVideo.currentSrc.endsWith(baselineVideoUrl) && archiveVideo.getAttribute("src") !== baselineVideoUrl) {
        archiveVideo.src = baselineVideoUrl;
        archiveVideo.load();
      }
      return "baseline";
    }

    archiveVideo.dataset.videoVariant = "budget";
    if (!archiveVideo.currentSrc.endsWith(budgetVideoUrl) && archiveVideo.getAttribute("src") !== budgetVideoUrl) {
      archiveVideo.src = budgetVideoUrl;
      archiveVideo.load();
    }
    return "budget";
  }

  function start() {
    document.documentElement.dataset.kprPerf = perfMode;
    document.documentElement.dataset.kprVideo = videoVariant;
    document.documentElement.dataset.kprYatagarasu = yatagarasuVariant;
    applyVideoVariant();
  }

  return {
    getMotionQuality,
    start,
    variants: {
      perf: perfMode,
      video: videoVariant,
      yatagarasu: yatagarasuVariant,
    },
  };
}
