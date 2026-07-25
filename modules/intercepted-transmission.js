// High-performance Intercepted Transmissions Salvapantallas module (v226)
// Automatically triggers subtle full-screen cyberpunk anomalies with 3D levitating drones and interactive dialogue during periods of idle time.
// Synthesizes dynamic digital noise via Web Audio API to prevent asset overhead.

import { createIdleDirector } from "./idle-director.js?v=kpr-domain-core-229";

export function initInterceptedTransmissions({ showCursorBubble } = {}) {
  const LORE_MESSAGES = [
    "// SECTOR 7G — ICHIRO SIGHTING CONFIRMED",
    "// CLASSIFIED: OPERATION NEW EDEN PHASE 3 ACTIVE",
    "// WARNING: KPR INTELLIGENCE CORE BREACH DETECTED",
    "// SUBJECT ICHIRO — LAST KNOWN COORDINATES: CLASSIFIED",
    "// TRANSMISSION FROM: UNKNOWN — ORIGIN MASKED",
    "// NEW EDEN PORTAL STABILITY: 94.2% — PREPARE FOR CROSSING"
  ];

  let transmissionActive = false;
  let idleDirector = null;
  let container = null;
  let audioCtx = null;

  // Create overlay container with levitating drones and speech bubbles
  function createContainer() {
    container = document.createElement("div");
    container.className = "intercepted-transmission-overlay";
    container.setAttribute("aria-hidden", "true");
    container.innerHTML = `
      <div class="screensaver-drone screensaver-drone--left" aria-hidden="true">
        <div class="drone-dialogue-bubble drone-dialogue-bubble--left">
          <span>"What is happening?"</span>
        </div>
        <img src="assets/characters/drone-blue-shield.png" alt="Blue Shield Drone">
      </div>
      <div class="transmission-glitch-box">
        <div class="transmission-header">// WARNING: INTERCEPTING SIGNAL...</div>
        <div class="transmission-body"></div>
        <button id="activate-firewall-btn" class="activate-firewall-btn" type="button" aria-label="Activate Firewall to exit screensaver">
          <span class="firewall-btn-text">ACTIVATE FIREWALL</span>
        </button>
      </div>
      <div class="screensaver-drone screensaver-drone--right" aria-hidden="true">
        <div class="drone-dialogue-bubble drone-dialogue-bubble--right">
          <span>"I think someone is trying to hack us!!"</span>
        </div>
        <img src="assets/characters/drone-purple-audio.png" alt="Purple Audio Drone">
      </div>
    `;

    // Clicking ACTIVATE FIREWALL button or container dismisses the screensaver
    const firewallBtn = container.querySelector("#activate-firewall-btn");
    if (firewallBtn) {
      firewallBtn.addEventListener("pointerenter", (e) => {
        if (typeof showCursorBubble === "function") {
          showCursorBubble("Lets block them", 2400, e);
        } else if (typeof window.showCursorBubble === "function") {
          window.showCursorBubble("Lets block them", 2400, e);
        }
      });
      firewallBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault();
        idleDirector?.markActivity();
        endTransmission();
      });
    }

    document.body.appendChild(container);
  }

  // Synthesize digital white noise/hiss using Web Audio API
  function playGlitchSound() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      audioCtx = new AudioContext();

      const bufferSize = audioCtx.sampleRate * 0.4; // 0.4 seconds of static
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      
      // Generate white noise
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noiseNode = audioCtx.createBufferSource();
      noiseNode.buffer = buffer;

      // Filter to make it sound like static radio interference
      const filter = audioCtx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(1200, audioCtx.currentTime);
      filter.Q.setValueAtTime(3.0, audioCtx.currentTime);

      const gainNode = audioCtx.createGain();
      gainNode.gain.setValueAtTime(0.04, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.38);

      noiseNode.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      noiseNode.start();
    } catch (e) {
      console.warn("Audio synthesis blocked or unsupported", e);
    }
  }

  function startTransmission() {
    if (
      transmissionActive ||
      !document.body.classList.contains("authenticated") ||
      document.hidden ||
      isExperienceBusy()
    ) return;
    transmissionActive = true;

    if (!container) createContainer();
    
    // Choose random message
    const msg = LORE_MESSAGES[Math.floor(Math.random() * LORE_MESSAGES.length)];
    const bodyEl = container.querySelector(".transmission-body");
    if (bodyEl) bodyEl.textContent = msg;

    container.classList.add("is-active");
    container.setAttribute("aria-hidden", "false");
    document.body.classList.add("transmission-glitch");
    document.body.classList.add("screensaver-active");
    
    playGlitchSound();
  }

  function endTransmission() {
    if (!transmissionActive) return;
    transmissionActive = false;
    
    if (container) {
      container.classList.remove("is-active");
      container.setAttribute("aria-hidden", "true");
    }
    document.body.classList.remove("transmission-glitch");
    document.body.classList.remove("screensaver-active");

    if (audioCtx) {
      audioCtx.close().catch(() => {});
      audioCtx = null;
    }
  }

  function isExperienceBusy() {
    const activeElement = document.activeElement;
    const isEditing = activeElement?.matches?.("input, textarea, select, [contenteditable='true']") || false;
    const hasOpenSurface = ["#case-viewer", "#details-modal", "#story-stage"]
      .some((selector) => {
        const element = document.querySelector(selector);
        return element && !element.classList.contains("hidden");
      });
    const archiveVideo = document.querySelector("#archive-video");
    const archiveScreen = document.querySelector("#archive-screen");
    const videoProgress = Number.parseFloat(archiveScreen?.style.getPropertyValue("--archive-video") || "0");
    const mediaPlaying = archiveVideo && videoProgress > 0.28 && !archiveVideo.paused && !archiveVideo.ended;
    return isEditing || hasOpenSurface || mediaPlaying;
  }

  idleDirector = createIdleDirector({
    thresholdMs: 30_000,
    isEligible: () => (
      !transmissionActive &&
      !document.hidden &&
      !isExperienceBusy()
    ),
    onIdle: startTransmission,
    onEscape: () => {
      if (transmissionActive) endTransmission();
    },
    onSuspend: () => {
      if (transmissionActive) endTransmission();
    },
  });
  idleDirector.start();

  window.triggerScreensaver = startTransmission;
  window.dismissScreensaver = endTransmission;

  return {
    destroy() {
      idleDirector?.destroy();
      if (container) container.remove();
      endTransmission();
    }
  };
}
