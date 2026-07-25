export function createNarrativeController({
  narrativeButton,
  narrativeGlobal,
  openNextFile,
}) {
  let timer = null;

  function openNext() {
    openNextFile?.();
  }

  function setLabel(label) {
    if (narrativeButton) {
      narrativeButton.textContent = label;
    }
    if (narrativeGlobal) {
      narrativeGlobal.textContent = label;
    }
  }

  function toggle() {
    if (timer) {
      stop();
      return;
    }
    setLabel("Stop Narrative");
    openNext();
    timer = window.setInterval(openNext, 5200);
  }

  function stop() {
    if (timer) {
      window.clearInterval(timer);
      timer = null;
    }
    setLabel("Play Narrative");
  }

  return {
    openNext,
    stop,
    toggle,
  };
}
