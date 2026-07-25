// Audio-Reactive Energy & Lava Lamp Engine (v226)
// Connects to the ambient music via Web Audio AnalyserNode and drives
// CSS custom properties --kpr-audio-brightness and --kpr-audio-energy on documentElement.
// Drives organic lava lamp fluid light bars and GPU glow effects in sync with music rhythm.

export function initAudioReactivity() {
  const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches || false;
  if (prefersReducedMotion) return;

  let active = false;
  let frameId = 0;
  let analyser = null;
  let dataArray = null;
  let audioCtx = null;
  let sourceNode = null;
  let connected = false;
  let smoothedEnergy = 0;

  const root = document.documentElement;

  function connectToAmbient() {
    if (connected) return;

    const ambientEl = document.getElementById("ambient-music");
    if (!ambientEl) return;

    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;

      audioCtx = new Ctx();
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64; // small FFT = fast broadband energy
      analyser.smoothingTimeConstant = 0.82;
      dataArray = new Uint8Array(analyser.frequencyBinCount);

      sourceNode = audioCtx.createMediaElementSource(ambientEl);
      sourceNode.connect(analyser);
      analyser.connect(audioCtx.destination);

      connected = true;
    } catch (e) {
      // MediaElementSource can only be created once per element
      console.warn("KPR audio-reactivity: could not connect", e);
      active = false;
    }
  }

  function tick() {
    if (!active) return;

    if (!connected) {
      // Keep trying until ambient music is playing
      const ambientEl = document.getElementById("ambient-music");
      if (ambientEl && !ambientEl.paused && ambientEl.currentTime > 0) {
        connectToAmbient();
      }
    }

    if (connected && analyser && dataArray) {
      analyser.getByteFrequencyData(dataArray);

      // Compute RMS energy from frequency bins
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const avg = sum / dataArray.length; // 0-255
      const targetEnergy = avg / 255; // 0-1

      // Smooth energy with easing
      smoothedEnergy += (targetEnergy - smoothedEnergy) * 0.15;

      // Map to brightness range: 1.0 (silent) to 1.14 (loud)
      const brightness = 1.0 + smoothedEnergy * 0.14;
      root.style.setProperty("--kpr-audio-brightness", brightness.toFixed(3));
      root.style.setProperty("--kpr-audio-energy", smoothedEnergy.toFixed(3));
    } else {
      // Fallback pulse if audio node not connected yet
      const fallbackPulse = 0.2 + Math.sin(Date.now() * 0.002) * 0.15;
      root.style.setProperty("--kpr-audio-energy", fallbackPulse.toFixed(3));
    }

    frameId = requestAnimationFrame(tick);
  }

  function start() {
    if (active) return;
    active = true;
    if (!frameId) frameId = requestAnimationFrame(tick);
  }

  function pause() {
    active = false;
    if (frameId) cancelAnimationFrame(frameId);
    frameId = 0;
  }

  return {
    start,
    pause,
    resume: start,
    destroy() {
      pause();
      root.style.removeProperty("--kpr-audio-brightness");
      root.style.removeProperty("--kpr-audio-energy");
      if (audioCtx) {
        audioCtx.close().catch(() => {});
      }
    },
  };
}