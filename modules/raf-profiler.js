const params = new URLSearchParams(window.location.search);

if (params.get("debug") === "perf" && !window.__kprRafProfilerInstalled) {
  window.__kprRafProfilerInstalled = true;
  const nativeRequestAnimationFrame = window.requestAnimationFrame.bind(window);
  const samples = new Map();
  let lastPublishedAt = performance.now();

  window.requestAnimationFrame = (callback) => nativeRequestAnimationFrame((timestamp) => {
    const startedAt = performance.now();
    try {
      callback(timestamp);
    } finally {
      const duration = performance.now() - startedAt;
      const name = callback.name || "anonymous";
      const sample = samples.get(name) || { calls: 0, max: 0, total: 0 };
      sample.calls += 1;
      sample.max = Math.max(sample.max, duration);
      sample.total += duration;
      samples.set(name, sample);

      if (timestamp - lastPublishedAt >= 1000) {
        lastPublishedAt = timestamp;
        const report = [...samples.entries()]
          .map(([key, value]) => ({
            name: key,
            calls: value.calls,
            averageMs: Number((value.total / value.calls).toFixed(2)),
            maxMs: Number(value.max.toFixed(2)),
            totalMs: Number(value.total.toFixed(2)),
          }))
          .sort((left, right) => right.totalMs - left.totalMs)
          .slice(0, 8);
        document.documentElement.dataset.kprRafProfile = JSON.stringify(report);
        samples.clear();
      }
    }
  });
}
