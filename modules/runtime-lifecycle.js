export function createRuntimeLifecycle({ phaseDirector } = {}) {
  const entries = new Map();
  let suspended = false;
  let unsubscribePhase = null;

  function call(entry, method) {
    const fn = entry.controller?.[method];
    if (typeof fn === "function") fn.call(entry.controller);
  }

  function activate(entry) {
    if (!entry.started) {
      call(entry, "start");
      entry.started = true;
      entry.active = true;
      return;
    }
    if (!entry.active) {
      if (typeof entry.controller?.resume === "function") call(entry, "resume");
      else call(entry, "start");
      entry.active = true;
    }
  }

  function deactivate(entry) {
    if (!entry.active) return;
    if (typeof entry.controller?.pause === "function") call(entry, "pause");
    else call(entry, "stop");
    entry.active = false;
  }

  function reconcile(phase = phaseDirector?.current?.() || "boot") {
    entries.forEach((entry) => {
      const phaseAllowed = !entry.phases || entry.phases.has(phase);
      if (!suspended && phaseAllowed) activate(entry);
      else deactivate(entry);
    });
  }

  function register(name, controller, { phases = null } = {}) {
    if (!name || !controller || entries.has(name)) throw new Error(`Lifecycle entry already registered: ${name}`);
    const entry = { controller, phases: phases ? new Set(phases) : null, started: false, active: false };
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

  function suspend() {
    suspended = true;
    reconcile();
  }

  function resume() {
    suspended = false;
    reconcile();
  }

  function destroy() {
    unsubscribePhase?.();
    unsubscribePhase = null;
    [...entries.keys()].forEach(unregister);
  }

  if (phaseDirector?.subscribe) {
    unsubscribePhase = phaseDirector.subscribe(({ phase }) => reconcile(phase), { immediate: false });
  }

  return Object.freeze({ destroy, register, resume, suspend, unregister });
}
