export function createRuntimeLifecycle({ phaseDirector } = {}) {
  const entries = new Map();
  let suspended = false;
  let suspendReason = null;
  let currentPhase = phaseDirector?.current?.() || "boot";
  let revision = 0;
  const errors = [];
  let unsubscribePhase = null;

  function call(entry, method) {
    const fn = entry.controller?.[method];
    if (typeof fn !== "function") return true;
    try {
      fn.call(entry.controller);
      entry.lastMethod = method;
      entry.lastTransitionAt = performance.now();
      revision += 1;
      return true;
    } catch (error) {
      const detail = {
        controller: entry.name,
        message: error instanceof Error ? error.message : String(error),
        method,
        phase: currentPhase,
        timestamp: Date.now(),
      };
      errors.push(detail);
      if (errors.length > 12) errors.shift();
      document.dispatchEvent(new CustomEvent("kpr-runtime-controller-error", { detail }));
      console.error(`[KPR runtime] ${entry.name}.${method} failed`, error);
      return false;
    }
  }

  function activate(entry) {
    if (!entry.started) {
      if (call(entry, "start")) {
        entry.started = true;
        entry.active = true;
        entry.activations += 1;
      }
      return;
    }
    if (!entry.active) {
      const method = typeof entry.controller?.resume === "function" ? "resume" : "start";
      if (call(entry, method)) {
        entry.active = true;
        entry.activations += 1;
      }
    }
  }

  function deactivate(entry) {
    if (!entry.active) return;
    const method = typeof entry.controller?.pause === "function" ? "pause" : "stop";
    if (call(entry, method)) {
      entry.active = false;
      entry.deactivations += 1;
    }
  }

  function reconcile(phase = phaseDirector?.current?.() || "boot") {
    currentPhase = phase;
    entries.forEach((entry) => {
      const phaseAllowed = !entry.phases || entry.phases.has(phase);
      if (!suspended && phaseAllowed) activate(entry);
      else deactivate(entry);
    });
  }

  function register(name, controller, { phases = null } = {}) {
    if (!name || !controller || entries.has(name)) throw new Error(`Lifecycle entry already registered: ${name}`);
    const entry = {
      activations: 0,
      active: false,
      controller,
      deactivations: 0,
      lastMethod: null,
      lastTransitionAt: null,
      name,
      phases: phases ? new Set(phases) : null,
      started: false,
    };
    entries.set(name, entry);
    reconcile();
    return () => unregister(name);
  }

  function unregister(name) {
    const entry = entries.get(name);
    if (!entry) return false;
    deactivate(entry);
    call(entry, "destroy");
    entries.delete(name);
    return true;
  }

  function suspend(reason = "manual") {
    if (suspended && suspendReason === reason) return;
    suspended = true;
    suspendReason = reason;
    reconcile();
  }

  function resume() {
    if (!suspended) return;
    suspended = false;
    suspendReason = null;
    reconcile();
  }

  function snapshot() {
    return {
      controllers: [...entries.values()].map((entry) => ({
        activations: entry.activations,
        active: entry.active,
        deactivations: entry.deactivations,
        lastMethod: entry.lastMethod,
        name: entry.name,
        phases: entry.phases ? [...entry.phases] : null,
        started: entry.started,
      })),
      errors: errors.map((error) => ({ ...error })),
      phase: currentPhase,
      revision,
      suspendReason,
      suspended,
    };
  }

  function destroy() {
    unsubscribePhase?.();
    unsubscribePhase = null;
    [...entries.keys()].forEach(unregister);
  }

  if (phaseDirector?.subscribe) {
    unsubscribePhase = phaseDirector.subscribe(({ phase }) => reconcile(phase), { immediate: false });
  }

  return Object.freeze({ destroy, register, resume, snapshot, suspend, unregister });
}
