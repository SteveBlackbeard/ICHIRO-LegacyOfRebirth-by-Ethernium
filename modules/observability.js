const MAX_EVENTS = 96;

function safeResourceLabel(value) {
  if (!value) return "unknown";
  try {
    const url = new URL(value, window.location.href);
    return url.origin === window.location.origin ? url.pathname : "external-origin";
  } catch {
    return "invalid-resource";
  }
}

function rounded(value) {
  return Math.round(Number(value) || 0);
}

export function createLocalObservability({
  phaseDirector,
  runtimeLifecycle,
  getVisualQualityState = () => ({}),
} = {}) {
  const startedAt = performance.now();
  const events = [];
  const resourceSummary = Object.create(null);
  let longTaskCount = 0;
  let longTaskTotalMs = 0;
  let contextLosses = 0;
  let assetFailures = 0;
  let performanceObserver = null;
  let unsubscribePhase = null;
  let running = false;

  function record(type, detail = {}) {
    events.push({
      atMs: rounded(performance.now() - startedAt),
      type,
      ...detail,
    });
    if (events.length > MAX_EVENTS) events.splice(0, events.length - MAX_EVENTS);
  }

  function onWindowError(event) {
    const target = event.target;
    if (target instanceof Element && target !== window) {
      const source = target.currentSrc || target.src || target.href || "";
      assetFailures += 1;
      record("asset-failure", {
        element: target.tagName.toLowerCase(),
        resource: safeResourceLabel(source),
      });
      return;
    }
    record("runtime-error", { message: String(event.message || "unknown runtime error").slice(0, 180) });
  }

  function onUnhandledRejection(event) {
    const message = event.reason instanceof Error ? event.reason.message : String(event.reason || "unhandled rejection");
    record("unhandled-rejection", { message: message.slice(0, 180) });
  }

  function onControllerError(event) {
    const detail = event.detail || {};
    record("controller-error", {
      controller: String(detail.controller || "unknown"),
      method: String(detail.method || "unknown"),
      phase: String(detail.phase || phaseDirector?.current?.() || "unknown"),
    });
  }

  function onContextLost(event) {
    if (!(event.target instanceof HTMLCanvasElement)) return;
    contextLosses += 1;
    record("webgl-context-lost", { canvas: event.target.id || event.target.className || "canvas" });
  }

  function onContextRestored(event) {
    if (!(event.target instanceof HTMLCanvasElement)) return;
    record("webgl-context-restored", { canvas: event.target.id || event.target.className || "canvas" });
  }

  function observePerformance() {
    if (!("PerformanceObserver" in window)) return;
    const supported = PerformanceObserver.supportedEntryTypes || [];
    const entryTypes = ["longtask", "resource"].filter((type) => supported.includes(type));
    if (!entryTypes.length) return;
    performanceObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === "longtask") {
          longTaskCount += 1;
          longTaskTotalMs += entry.duration;
          continue;
        }
        const type = entry.initiatorType || "other";
        const bucket = resourceSummary[type] || { count: 0, durationMs: 0, transferBytes: 0 };
        bucket.count += 1;
        bucket.durationMs += entry.duration;
        bucket.transferBytes += entry.transferSize || 0;
        resourceSummary[type] = bucket;
      }
    });
    performanceObserver.observe({ entryTypes });
  }

  function start() {
    if (running) return api;
    running = true;
    window.addEventListener("error", onWindowError, true);
    window.addEventListener("unhandledrejection", onUnhandledRejection);
    document.addEventListener("kpr-runtime-controller-error", onControllerError);
    document.addEventListener("webglcontextlost", onContextLost, true);
    document.addEventListener("webglcontextrestored", onContextRestored, true);
    unsubscribePhase = phaseDirector?.subscribe?.(({ phase, previous }) => {
      record("phase", { phase, previous });
    }) || null;
    observePerformance();
    window.__kprDiagnostics = api;
    return api;
  }

  function stop() {
    if (!running) return;
    running = false;
    window.removeEventListener("error", onWindowError, true);
    window.removeEventListener("unhandledrejection", onUnhandledRejection);
    document.removeEventListener("kpr-runtime-controller-error", onControllerError);
    document.removeEventListener("webglcontextlost", onContextLost, true);
    document.removeEventListener("webglcontextrestored", onContextRestored, true);
    unsubscribePhase?.();
    unsubscribePhase = null;
    performanceObserver?.disconnect();
    performanceObserver = null;
  }

  function snapshot() {
    const lifecycle = runtimeLifecycle?.snapshot?.() || {};
    const quality = getVisualQualityState?.() || {};
    const runtimeErrors = events.filter(({ type }) => (
      type === "runtime-error"
      || type === "unhandled-rejection"
      || type === "controller-error"
    )).length;
    return {
      schema: "kpr-local-diagnostics/v1",
      version: "v259",
      networkTransmission: false,
      session: {
        uptimeMs: rounded(performance.now() - startedAt),
        visibility: document.visibilityState,
      },
      runtime: {
        phase: phaseDirector?.current?.() || lifecycle.phase || "unknown",
        suspended: Boolean(lifecycle.suspended),
        controllerErrors: lifecycle.errors?.length || 0,
      },
      quality: {
        deviceClass: quality.deviceClass || "unknown",
        motionQuality: quality.motionQuality || "unknown",
        particleScale: Number(quality.particleScale || 0),
        renderScale: Number(quality.renderScale || 0),
      },
      health: {
        assetFailures,
        contextLosses,
        longTaskCount,
        longTaskTotalMs: rounded(longTaskTotalMs),
        runtimeErrors,
      },
      resources: Object.fromEntries(Object.entries(resourceSummary).map(([type, value]) => [
        type,
        {
          count: value.count,
          durationMs: rounded(value.durationMs),
          transferBytes: rounded(value.transferBytes),
        },
      ])),
      events: events.map((entry) => ({ ...entry })),
    };
  }

  function exportReport() {
    const blob = new Blob([`${JSON.stringify(snapshot(), null, 2)}\n`], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = `ichiro-kpr-diagnostics-${Date.now()}.json`;
    anchor.click();
    queueMicrotask(() => URL.revokeObjectURL(href));
  }

  function destroy() {
    stop();
    if (window.__kprDiagnostics === api) delete window.__kprDiagnostics;
  }

  const api = Object.freeze({ destroy, exportReport, snapshot, start, stop });
  return api;
}
