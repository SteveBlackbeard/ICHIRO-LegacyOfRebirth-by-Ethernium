function isOpen(element) {
  return Boolean(element && !element.classList.contains("hidden"));
}

export function readRuntimePhase({
  body = document.body,
  archiveScreen = document.querySelector("#archive-screen"),
  caseViewer = document.querySelector("#case-viewer"),
  storyStage = document.querySelector("#story-stage"),
} = {}) {
  if (isOpen(storyStage)) return "story";
  if (body.classList.contains("prelaunch")) return "prelaunch";
  if (body.classList.contains("intro-active")) return "hack-intro";
  if (!body.classList.contains("authenticated")) return "access-terminal";
  if (isOpen(caseViewer)) return "dossier";
  if (archiveScreen?.classList.contains("archive-map-active")) return "map";
  if (archiveScreen?.classList.contains("archive-video-active")) return "archive-video";
  return "character-profile";
}

export function createRuntimePhaseDirector(options = {}) {
  const root = document.documentElement;
  const subscribers = new Set();
  const observers = [];
  let phase = "boot";
  let scheduled = false;
  let started = false;

  function publish(force = false) {
    scheduled = false;
    const next = readRuntimePhase(options);
    if (!force && next === phase) return;
    const previous = phase;
    phase = next;
    root.dataset.kprPhase = phase;
    const detail = Object.freeze({ phase, previous });
    document.dispatchEvent(new CustomEvent("kpr-runtime-phase", { detail }));
    subscribers.forEach((subscriber) => subscriber(detail));
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(publish);
  }

  function observe(element) {
    if (!element) return;
    const observer = new MutationObserver(schedule);
    observer.observe(element, { attributes: true, attributeFilter: ["class", "style"] });
    observers.push(observer);
  }

  function start() {
    if (started) return api;
    started = true;
    observe(options.body || document.body);
    observe(options.archiveScreen || document.querySelector("#archive-screen"));
    observe(options.caseViewer || document.querySelector("#case-viewer"));
    observe(options.storyStage || document.querySelector("#story-stage"));
    document.addEventListener("visibilitychange", schedule);
    publish(true);
    return api;
  }

  function stop() {
    if (!started) return;
    started = false;
    observers.forEach((observer) => observer.disconnect());
    observers.length = 0;
    document.removeEventListener("visibilitychange", schedule);
  }

  function subscribe(subscriber, { immediate = true } = {}) {
    subscribers.add(subscriber);
    if (immediate) subscriber(Object.freeze({ phase, previous: phase }));
    return () => subscribers.delete(subscriber);
  }

  const api = Object.freeze({
    current: () => phase,
    refresh: () => publish(true),
    start,
    stop,
    subscribe,
  });
  return api;
}
