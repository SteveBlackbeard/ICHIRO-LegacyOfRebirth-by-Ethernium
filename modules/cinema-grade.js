// Cinema grade gate (v207): toggles the chromatic-aberration edge pass only while
// the archive fold/video/map transition is actually moving. The visual layers are
// pure static CSS; this module only adds/removes one class with a short debounce,
// so idle cost is zero and no new RAF loop or canvas is created.
export function startCinemaGrade() {
  const root = document.documentElement;
  let lastRaw = -1;
  let lastMap = -1;
  let clearId = 0;
  let active = false;

  const deactivate = () => {
    root.classList.remove("kpr-cinema-move");
    active = false;
  };

  document.addEventListener("kpr-archive-fold-progress", (event) => {
    const detail = event?.detail || {};
    const raw = Number(detail.raw || 0);
    const map = Number(detail.map || 0);
    const moving = Math.abs(raw - lastRaw) > 0.0008 || Math.abs(map - lastMap) > 0.0008;
    lastRaw = raw;
    lastMap = map;
    if (!moving) {
      return;
    }
    if (!active) {
      root.classList.add("kpr-cinema-move");
      active = true;
    }
    window.clearTimeout(clearId);
    clearId = window.setTimeout(deactivate, 460);
  });
}
