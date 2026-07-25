// KPR v247 — one timeline for the authored quantum-vortex layers.
// It consumes the archive's existing progress event and creates no render loop.

const clamp = (value, min = 0, max = 1) =>
  Math.min(max, Math.max(min, Number(value) || 0));

function initialTier() {
  const cores = Number(navigator.hardwareConcurrency || 4);
  const memory = Number(navigator.deviceMemory || 4);
  if (cores >= 10 && memory >= 8) return "ultra";
  if (cores >= 6 && memory >= 4) return "high";
  return "balanced";
}

export function createQuantumVortexDirector() {
  const aperture = document.querySelector(".quantum-iris-aperture");
  const telemetry = aperture?.querySelector(".quantum-vortex-telemetry");
  const telemetryValues = telemetry?.querySelectorAll("b") || [];
  if (!aperture) {
    return Object.freeze({ bind() {}, destroy() {}, read: () => null });
  }

  let bound = false;
  let progress = 0;
  let phase = "dormant";
  let quality = initialTier();
  let lastEventAt = 0;
  let frameEma = 8.33;
  let recoveryFrames = 0;

  function phaseFor(value) {
    if (value <= 0.015) return "dormant";
    if (value < 0.28) return "compression";
    if (value < 0.56) return "singularity";
    if (value < 0.84) return "rupture";
    return "locked";
  }

  function updateTelemetry() {
    if (telemetryValues.length < 2) return;
    const labels = {
      dormant: ["STANDBY", "UNSTABLE"],
      compression: ["COMPRESSING", "ACQUIRING"],
      singularity: ["CRITICAL", "FORMING"],
      rupture: ["BREACH", "LOCKING"],
      locked: ["STABLE", "LOCKED"],
    };
    const next = labels[phase];
    if (telemetryValues[0].textContent !== next[0]) {
      telemetryValues[0].textContent = next[0];
      telemetryValues[1].textContent = next[1];
    }
  }

  function updateQuality(now) {
    if (!lastEventAt) {
      lastEventAt = now;
      return;
    }
    const delta = Math.min(50, Math.max(4, now - lastEventAt));
    lastEventAt = now;
    frameEma = frameEma * 0.9 + delta * 0.1;

    if (frameEma > 18 && quality !== "balanced") {
      quality = quality === "ultra" ? "high" : "balanced";
      recoveryFrames = 0;
    } else if (frameEma > 11 && quality === "ultra") {
      quality = "high";
      recoveryFrames = 0;
    } else if (frameEma < 9.2) {
      recoveryFrames += 1;
      if (recoveryFrames > 180 && quality !== "ultra") {
        quality = quality === "balanced" ? "high" : "ultra";
        recoveryFrames = 0;
      }
    } else {
      recoveryFrames = Math.max(0, recoveryFrames - 2);
    }
  }

  function publish() {
    const nextPhase = phaseFor(progress);
    phase = nextPhase;
    aperture.dataset.qvPhase = phase;
    aperture.dataset.qvQuality = quality;
    aperture.style.setProperty("--qv-progress", progress.toFixed(4));
    aperture.style.setProperty("--qv-compression", clamp(progress / 0.28).toFixed(4));
    aperture.style.setProperty("--qv-singularity", clamp((progress - 0.2) / 0.36).toFixed(4));
    aperture.style.setProperty("--qv-rupture", clamp((progress - 0.52) / 0.32).toFixed(4));
    aperture.style.setProperty("--qv-lock", clamp((progress - 0.8) / 0.2).toFixed(4));
    updateTelemetry();
  }

  function handleFold(event) {
    progress = clamp(event?.detail?.map);
    if (progress > 0.01 && !document.hidden) {
      updateQuality(performance.now());
    } else {
      lastEventAt = 0;
      recoveryFrames = 0;
    }
    publish();
  }

  function handleVisibility() {
    lastEventAt = 0;
    publish();
  }

  function bind() {
    if (bound) return;
    bound = true;
    const initial = Number(window.__kprArchiveFold?.map);
    if (Number.isFinite(initial)) progress = clamp(initial);
    document.addEventListener("kpr-archive-fold-progress", handleFold);
    document.addEventListener("visibilitychange", handleVisibility);
    publish();
  }

  function destroy() {
    if (!bound) return;
    bound = false;
    document.removeEventListener("kpr-archive-fold-progress", handleFold);
    document.removeEventListener("visibilitychange", handleVisibility);
  }

  return Object.freeze({
    bind,
    destroy,
    read: () => Object.freeze({ progress, phase, quality, frameEma }),
  });
}
