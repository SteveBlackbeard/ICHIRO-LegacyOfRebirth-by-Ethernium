export function bindAppEvents({
  activationFlow,
  activationScreen,
  loginForm,
  ambientToggle,
  narrativeButton,
  narrativeGlobal,
  ichiroMemory,
  audioPlaceholder,
  archiveVideo,
  archiveVideoStage,
  archiveScreen,
  ambientMusic,
  dossierSizeToggle,
  dossierMediaExpandBtn,
  dossierPanelBrowser,
  loginScreen,
  loginFigure,
  profileHotzones,
  hudTelemetry,
  hudTelemetrySystem,
  hudCompass,
  statRows,
  profileBoxes,
  caseViewer,
  focusManager,
  cursorSystem,
  isTouchMode = () => false,
  archiveUi,
  updatePampCursor,
  updateCursorBubblePosition,
  isPointerInArchiveSwordZone,
  showContextualBubble,
  primeActivationCodecAudio,
  enableDeviceCompass,
  playUiClick,
  authenticate,
  primeArchiveVideoAudioFromGesture,
  resumeAudioContextFromGesture,
  resumeAmbientMusic,
  toggleAmbientMusic,
  toggleNarrative,
  openMemoryInterface,
  tone,
  handleMediaPlay,
  handleMediaStop,
  stopArchiveVideoExternalAudio,
  toggleArchiveVideoPlayback,
  pauseAmbientForMedia,
  forceArchiveVideoAudible,
  sustainArchiveVideoAudio,
  playArchiveVideoWithAudio,
  updateAmbientToggle,
  primeAmbientMusic,
  wantsAmbientMusic,
  handleActivationWheel,
  handleArchiveWheel,
  rotate,
  launchHackProgram,
  finishIntro,
  closeCase,
  resizeCanvases,
  setPageVisible,
  startCanvasLoop,
}) {
  let loginPointerFrame = null;
  let pendingLoginPointer = null;
  let touchStartY = null;
  let touchLastY = null;
  let wasInSwordZone = false;

  let colorLoopId = null;
  const sampleCanvas = document.createElement("canvas");
  sampleCanvas.width = 1;
  sampleCanvas.height = 1;
  const sampleCtx = sampleCanvas.getContext("2d", { willReadFrequently: true });
  
  let curR = 255, curG = 68, curB = 0; // Colores iniciales por defecto
  let targetR = 255, targetG = 68, targetB = 0; // Objetivos para la interpolación
  let colorSampleTick = 0; // Contador de frames para muestreo de color

  // Caché de elementos del DOM para evitar querySelector en cada frame
  let cachedTopPath = null;
  let cachedBottomPath = null;
  let cachedVideoFrame = null;
  let cachedPathLength = 0;
  let lastVideoFrameWidth = 0;
  const rootStyle = document.documentElement.style;

  function updateVideoProgressBarGeometry() {
    if (!cachedVideoFrame) {
      cachedVideoFrame = document.querySelector(".archive-video-frame");
      if (!cachedVideoFrame) return;
    }
    const width = cachedVideoFrame.clientWidth;
    if (width === 0 || width === lastVideoFrameWidth) return;
    lastVideoFrameWidth = width;

    if (!cachedTopPath) {
      cachedTopPath = document.querySelector(".liquid-light-bar--top .liquid-light-bar__path");
    }
    if (!cachedBottomPath) {
      cachedBottomPath = document.querySelector(".liquid-light-bar--bottom .liquid-light-bar__path");
    }

    // Top path (corta por arriba siguiendo la esquina redondeada de 16px)
    // El trazado empieza a la izquierda en y=16 (borde exterior total de la curva de 16px de radio)
    // A rx ry x-axis-rotation large-arc-flag sweep-flag x y
    const dTop = `M 2 16 A 14 14 0 0 1 16 2 L ${width - 16} 2 A 14 14 0 0 1 ${width - 2} 16`;
    // Bottom path (corta por abajo)
    const dBottom = `M 2 0 A 14 14 0 0 0 16 14 L ${width - 16} 14 A 14 14 0 0 0 ${width - 2} 0`;

    if (cachedTopPath) {
      cachedTopPath.setAttribute("d", dTop);
    }
    if (cachedBottomPath) {
      cachedBottomPath.setAttribute("d", dBottom);
    }

    // Longitud teórica del path = pi * R + (width - 2 * R) = pi * 14 + width - 32 = width + 11.98
    cachedPathLength = width + 11.98;

    if (cachedTopPath) {
      cachedTopPath.style.strokeDasharray = `${cachedPathLength.toFixed(2)}`;
    }
    if (cachedBottomPath) {
      cachedBottomPath.style.strokeDasharray = `${cachedPathLength.toFixed(2)}`;
    }
  }

  function updateVideoProgressBar() {
    if (!archiveVideo) return;
    const progress = archiveVideo.duration ? (archiveVideo.currentTime / archiveVideo.duration) : 0;
    
    updateVideoProgressBarGeometry();
    
    if (cachedPathLength <= 0) return;

    if (!cachedTopPath) {
      cachedTopPath = document.querySelector(".liquid-light-bar--top .liquid-light-bar__path");
    }
    if (!cachedBottomPath) {
      cachedBottomPath = document.querySelector(".liquid-light-bar--bottom .liquid-light-bar__path");
    }

    const offset = cachedPathLength * (1 - progress);
    
    if (cachedTopPath) {
      cachedTopPath.style.strokeDashoffset = `${offset.toFixed(2)}`;
    }
    if (cachedBottomPath) {
      cachedBottomPath.style.strokeDashoffset = `${offset.toFixed(2)}`;
    }
  }

  function updateVideoColorLoop() {
    if (!archiveVideo || archiveVideo.paused || archiveVideo.ended || !archiveScreen.classList.contains("archive-video-active")) {
      colorLoopId = null;
      return;
    }

    // Actualización de la barra de progreso en cada frame
    updateVideoProgressBar();
    
    // Simulación matemática de color ultra-eficiente para evitar bloqueos del pipeline (GPU readback stalls)
    // causados por drawImage + getImageData en cada frame, reduciendo el consumo de CPU/GPU a 0.
    const time = archiveVideo.currentTime;
    
    // Oscilación matemática entre los tonos característicos del vídeo (naranja, cian, ámbar)
    const wave1 = Math.sin(time * 0.4);
    const wave2 = Math.cos(time * 0.22);
    
    const mixMain = (wave1 + 1) / 2;
    const mixGlow = (wave2 + 1) / 2;
    
    // Colores base característicos:
    // Naranja/Rojo (#ff4400) -> 255, 68, 0
    // Cian/Azul (#62e4dc) -> 98, 228, 220
    let r = Math.round(255 * (1 - mixMain) + 98 * mixMain);
    let g = Math.round(68 * (1 - mixMain) + 228 * mixMain);
    let b = Math.round(0 * (1 - mixMain) + 220 * mixMain);
    
    // Mezclar con ámbar (#ffaa00 -> 255, 170, 0)
    r = Math.round(r * (1 - mixGlow * 0.25) + 255 * (mixGlow * 0.25));
    g = Math.round(g * (1 - mixGlow * 0.25) + 170 * (mixGlow * 0.25));
    b = Math.round(b * (1 - mixGlow * 0.25) + 0 * (mixGlow * 0.25));

    const lightR = Math.min(255, Math.round(r * 1.3));
    const lightG = Math.min(255, Math.round(g * 1.3));
    const lightB = Math.min(255, Math.round(b * 1.3));
    
    const darkR = Math.max(0, Math.round(r * 0.5));
    const darkG = Math.max(0, Math.round(g * 0.5));
    const darkB = Math.max(0, Math.round(b * 0.5));
    
    rootStyle.setProperty("--video-color-r", r);
    rootStyle.setProperty("--video-color-g", g);
    rootStyle.setProperty("--video-color-b", b);
    rootStyle.setProperty("--video-color-light", `rgb(${lightR}, ${lightG}, ${lightB})`);
    rootStyle.setProperty("--video-color-dark", `rgb(${darkR}, ${darkG}, ${darkB})`);
    rootStyle.setProperty("--video-color-main", `rgb(${r}, ${g}, ${b})`);
    rootStyle.setProperty("--video-color-glow", `rgba(${r}, ${g}, ${b}, 0.85)`);
    rootStyle.setProperty("--video-color-dim", `rgba(${r}, ${g}, ${b}, 0.2)`);
    
    colorLoopId = requestAnimationFrame(updateVideoColorLoop);
  }


  document.addEventListener("pointermove", (event) => {
    updatePampCursor(event);
    updateCursorBubblePosition(event.clientX, event.clientY);
    const inSwordZone = isPointerInArchiveSwordZone(event);
    if (inSwordZone) {
      if (!wasInSwordZone) {
        showContextualBubble(
          "energy-blade-hover",
          "Oooh, they say this was the sword of a legend. It was found on the eastern outskirts of Prisma City.",
          4000,
          event,
          3000,
        );
      }
    }
    wasInSwordZone = inSwordZone;
  }, { passive: false });

  document.addEventListener("mousemove", updatePampCursor, { passive: true });
  window.addEventListener("pointermove", updatePampCursor, { passive: true, capture: true });
  window.addEventListener("mousemove", updatePampCursor, { passive: true, capture: true });
  window.addEventListener("pointerover", updatePampCursor, { passive: true, capture: true });
  document.addEventListener("pointerenter", updatePampCursor, { passive: true });
  document.addEventListener("pointerleave", () => {
    cursorSystem.clearHover();
  }, { passive: false });

  document.addEventListener("pointerdown", (event) => {
    updatePampCursor(event);
    updateCursorBubblePosition(event.clientX, event.clientY);
    primeActivationCodecAudio();
    enableDeviceCompass();
    if (event.target.closest("#activation-button") && !event.target.closest(".activation-symbol")) {
      return;
    }
    if (event.target.closest("#activation-button")) {
      return;
    }
    if (event.target.closest("#ichiro-memory") && !profileHotzones.isHotZone(event)) {
      return;
    }
    if (event.target.closest("button")) {
      playUiClick();
    }
  }, true);

  document.addEventListener("keydown", (event) => {
    primeActivationCodecAudio();
    resumeAudioContextFromGesture();
    if ((event.key === "Enter" || event.key === " ") && event.target.closest?.("button")) {
      playUiClick();
    }
  }, true);

  activationFlow.bindActivationControls();
  loginForm.addEventListener("submit", authenticate);
  loginForm.addEventListener("pointerdown", () => {
    primeArchiveVideoAudioFromGesture();
    resumeAmbientMusic();
  });
  ambientToggle?.addEventListener("click", toggleAmbientMusic);
  narrativeButton?.addEventListener("click", toggleNarrative);
  narrativeGlobal?.addEventListener("click", toggleNarrative);
  ichiroMemory.addEventListener("click", (event) => {
    if (event.detail > 0 && !profileHotzones.isHotZone(event)) {
      return;
    }
    openMemoryInterface();
  });
  audioPlaceholder.addEventListener("click", () => tone("unlock"));

  document.addEventListener("play", handleMediaPlay, true);
  document.addEventListener("pause", handleMediaStop, true);
  document.addEventListener("ended", handleMediaStop, true);
  archiveVideo?.addEventListener("ended", () => {
    stopArchiveVideoExternalAudio();
    archiveScreen.classList.add("archive-video-ended");
  });
  archiveVideo?.addEventListener("timeupdate", () => {
    updateVideoProgressBar();
    if (!archiveVideo.paused && !colorLoopId && archiveScreen.classList.contains("archive-video-active")) {
      colorLoopId = requestAnimationFrame(updateVideoColorLoop);
    }
  });
  archiveVideo?.addEventListener("play", () => {
    if (!colorLoopId && archiveScreen.classList.contains("archive-video-active")) {
      colorLoopId = requestAnimationFrame(updateVideoColorLoop);
    }
    if (archiveVideo.dataset.priming === "true") {
      return;
    }
    if (archiveVideo.dataset.externalAudio === "true") {
      pauseAmbientForMedia();
      return;
    }
    archiveVideo.dataset.userRequestedAudio = "true";
    archiveVideo.dataset.forceAudio = "true";
    forceArchiveVideoAudible();
    sustainArchiveVideoAudio(2600);
    pauseAmbientForMedia();
  });
  archiveVideo?.addEventListener("loadedmetadata", () => {
    if (archiveVideo.dataset.forceAudio === "true") {
      forceArchiveVideoAudible();
    }
  });
  archiveVideo?.addEventListener("volumechange", () => {
    if (archiveVideo.dataset.forceAudio === "true" && (archiveVideo.muted || archiveVideo.volume < 0.98)) {
      window.setTimeout(forceArchiveVideoAudible, 0);
    }
  });

  // Restrict play/pause click target to the left video window frame (.archive-video-frame)
  const archiveVideoFrame = archiveVideoStage?.querySelector(".archive-video-frame");
  archiveVideoFrame?.addEventListener("click", (event) => {
    if (
      archiveScreen.classList.contains("archive-video-active")
      && archiveVideo
    ) {
      event.preventDefault();
      event.stopPropagation();
      if (archiveVideo.paused || archiveScreen.classList.contains("archive-video-audio-blocked")) {
        playArchiveVideoWithAudio();
      } else {
        toggleArchiveVideoPlayback();
      }
    }
  });
  ambientMusic?.addEventListener("play", updateAmbientToggle);
  ambientMusic?.addEventListener("pause", updateAmbientToggle);
  ambientMusic?.addEventListener("volumechange", updateAmbientToggle);
  document.addEventListener("pointerdown", () => {
    resumeAudioContextFromGesture();
    primeAmbientMusic();
    if (wantsAmbientMusic()) {
      resumeAmbientMusic();
    }
  }, true);

  const toggleDossierSize = () => {
    if (!dossierPanelBrowser) return;
    const isMax = dossierPanelBrowser.classList.toggle("is-maximized");
    
    // Dynamically expand parent grid columns to accommodate size change
    const coreStage = dossierPanelBrowser.parentElement;
    if (coreStage && coreStage.classList.contains("core-stage")) {
      coreStage.classList.toggle("dossier-maximized", isMax);
    }

    if (dossierSizeToggle) {
      dossierSizeToggle.setAttribute("aria-expanded", String(isMax));
      const icon = dossierSizeToggle.querySelector(".size-toggle-icon");
      if (icon) icon.textContent = isMax ? "[-]" : "[+]";
    }
    if (dossierMediaExpandBtn) {
      const btnIcon = dossierMediaExpandBtn.querySelector(".media-expand-icon");
      if (btnIcon) btnIcon.textContent = isMax ? "[⤭]" : "[⤢]";
      const labelNode = Array.from(dossierMediaExpandBtn.childNodes).find(n => n.nodeType === Node.TEXT_NODE);
      if (labelNode) labelNode.textContent = isMax ? " Collapse" : " Expand";
    }
    tone(isMax ? "open" : "move");
  };

  if (dossierSizeToggle) {
    dossierSizeToggle.addEventListener("click", toggleDossierSize);
  }
  if (dossierMediaExpandBtn) {
    dossierMediaExpandBtn.addEventListener("click", toggleDossierSize);
  }

  // --- DETAILS HUB & LEVITATING MODAL EVENT HANDLERS ---
  const detailsBtn = document.getElementById("dossier-details-btn");
  const detailsPanel = document.getElementById("dossier-details-panel");
  const panelRing = document.getElementById("panel-ring");
  const mediaPanel = document.getElementById("media-panel");
  const lockedHint = document.getElementById("locked-hint");

  if (detailsBtn && dossierPanelBrowser && detailsPanel) {
    detailsBtn.addEventListener("click", () => {
      const active = dossierPanelBrowser.classList.toggle("details-active");
      detailsBtn.setAttribute("aria-expanded", String(active));
      detailsBtn.classList.toggle("is-active", active);
      
      if (active) {
        detailsPanel.classList.remove("hidden");
        if (panelRing) panelRing.classList.add("hidden");
        if (mediaPanel) mediaPanel.classList.add("hidden");
        if (lockedHint) lockedHint.classList.add("hidden");
      } else {
        detailsPanel.classList.add("hidden");
        if (panelRing) panelRing.classList.remove("hidden");
        if (mediaPanel && dossierPanelBrowser.classList.contains("is-open")) {
          mediaPanel.classList.remove("hidden");
        }
        if (lockedHint) lockedHint.classList.remove("hidden");
      }
      tone("click");
    });
  }

  const modal = document.getElementById("details-modal");
  const modalImg = document.getElementById("details-modal-img");
  const modalTitle = document.getElementById("details-modal-title");
  const modalText = document.getElementById("details-modal-text");
  const modalClose = document.getElementById("details-modal-close");
  const modalOverlay = document.getElementById("details-modal-overlay");

  const loreData = {
    "lumen-ichiro": {
      title: "LUMEN & Ichiro // The Existence",
      img: "assets/dossiers/dossier-05.svg",
      text: "<p>LUMEN, a specialized autonomous drone prototype of Nemeth Corp, recovered Hangyaku-sha near the core reactor ruins.</p><p>Through advanced neural synchrony, Hangyaku-sha projected Blackbeard as his mentor to survive the trauma.</p><p>Reborn as Ichiro, the Silent Sentinel, his existence is tied to Solis, Yatagarasu, and the eternal balance between order and chaos.</p>"
    },
    "yatagarasu": {
      title: "Yatagarasu Crew // Members & Registry",
      img: "assets/dossiers/dossier-06.svg",
      text: "<p>Yatagarasu is a free-roaming resistance cell operating in the lower districts of New Eden.</p><p>Composed of Wanderers, Bladewalkers, and outcast tech hackers, they protect the remaining human sanctuaries from Corporate reclamation.</p><p>Core members include Brinx (Tactical Decryption), Unmei (Biomechanical Engineering), and Ichiro (Frontline Ronin Guardian).</p>"
    }
  };

  document.querySelectorAll(".details-card[data-detail]").forEach(card => {
    card.addEventListener("click", () => {
      const topic = card.dataset.detail;
      const data = loreData[topic];
      if (data && modal) {
        if (modalImg) modalImg.src = data.img;
        if (modalTitle) modalTitle.textContent = data.title;
        if (modalText) modalText.innerHTML = data.text;
        modal.classList.remove("hidden");
        modal.setAttribute("aria-hidden", "false");
        focusManager?.activate(modal, {
          initialFocus: modalClose,
          onRequestClose: closeModal,
          returnFocus: card,
        });
        tone("open");
      }
    });
  });

  const closeModal = () => {
    if (modal) {
      modal.classList.add("hidden");
      modal.setAttribute("aria-hidden", "true");
      focusManager?.deactivate(modal);
      tone("close");
    }
  };

  if (modalClose) modalClose.addEventListener("click", closeModal);
  if (modalOverlay) modalOverlay.addEventListener("click", closeModal);

  const addCard = document.querySelector(".details-card.add-card");
  if (addCard) {
    addCard.addEventListener("click", () => {
      alert("System expansion pending... Additional archives will be unsealed in future revisions.");
      tone("error");
    });
  }

  loginScreen.addEventListener("pointermove", (event) => {
    if (
      !loginFigure ||
      loginScreen.classList.contains("hidden") ||
      document.body.classList.contains("prelaunch") ||
      document.body.classList.contains("intro-active") ||
      document.body.classList.contains("terminal-revealing")
    ) {
      return;
    }

    pendingLoginPointer = event;
    if (loginPointerFrame) {
      return;
    }
    loginPointerFrame = requestAnimationFrame(() => {
      loginPointerFrame = null;
      if (!pendingLoginPointer) {
        return;
      }
      const pointerEvent = pendingLoginPointer;
      pendingLoginPointer = null;
      if (
        !loginFigure ||
        loginScreen.classList.contains("hidden") ||
        document.body.classList.contains("prelaunch") ||
        document.body.classList.contains("intro-active") ||
        document.body.classList.contains("terminal-revealing")
      ) {
        return;
      }

      const rect = loginScreen.getBoundingClientRect();
      const x = (pointerEvent.clientX - rect.left) / rect.width - 0.5;
      const y = (pointerEvent.clientY - rect.top) / rect.height - 0.5;
      loginFigure.style.setProperty("--login-front-x", `${(x * 34).toFixed(2)}px`);
      loginFigure.style.setProperty("--login-front-y", `${(y * 18).toFixed(2)}px`);
      loginFigure.style.setProperty("--login-tilt-x", `${(-y * 5.5).toFixed(2)}deg`);
      loginFigure.style.setProperty("--login-tilt-y", `${(x * 8).toFixed(2)}deg`);
    });
  });

  loginScreen.addEventListener("pointerleave", () => {
    if (!loginFigure) {
      return;
    }

    loginFigure.style.setProperty("--login-front-x", "0px");
    loginFigure.style.setProperty("--login-front-y", "0px");
    loginFigure.style.setProperty("--login-tilt-x", "0deg");
    loginFigure.style.setProperty("--login-tilt-y", "0deg");
  });

  profileHotzones.bind();

  hudTelemetry?.addEventListener("pointerenter", (event) => {
    hudTelemetrySystem.showCoordinateBubble(event);
  });
  hudCompass?.addEventListener("pointerenter", (event) => {
    hudTelemetrySystem.showCompassBubble(event);
  });

  const statBubbleMessages = {
    Willpower: "Willpower measures Ichiro's resistance under pressure.",
    Command: "Command tracks tactical control and response clarity.",
    Routine: "Routine shows how stable his trained patterns remain.",
    Tremor: "Tremor marks instability when the archive pushes back.",
    Memory: "Memory indicates recovered identity coherence.",
  };

  statRows.forEach((row) => {
    const label = row.querySelector("span")?.textContent?.trim() || "Stat";
    row.addEventListener("pointerenter", (event) => {
      showContextualBubble(`stat-${label}`, statBubbleMessages[label] || "Character telemetry recovered from the archive.", 2600, event);
    });
  });

  profileBoxes.forEach((box) => {
    const title = box.querySelector("h4")?.textContent?.replace(/\//g, "").trim().toLowerCase() || "profile panel";
    const messages = {
      stats: "Live character metrics. They show what the system can still measure.",
      "evidence chain": "Evidence Chain links the recovered files that prove this identity.",
      "field assets": "Field Assets are tools, routes, and relays still connected to Ichiro.",
      "behavioral notes": "Behavioral Notes are small human patterns the archive could not erase.",
      "memory risk": "Memory Risk warns what may destabilize the recovered core.",
    };
    box.addEventListener("pointerenter", (event) => {
      showContextualBubble(`box-${title}`, messages[title] || "Recovered archive panel.", 2700, event);
    });
  });

  caseViewer.addEventListener("click", (event) => {
    if (event.target.matches("[data-close-case]")) {
      closeCase();
    }
  });

  window.addEventListener("wheel", (event) => {
    if (document.body.classList.contains("prelaunch")) {
      handleActivationWheel(event);
      return;
    }

    if (archiveScreen.classList.contains("hidden") || !caseViewer.classList.contains("hidden")) {
      return;
    }

    const path = event.composedPath();
    const isInsideDossiers = path.some(el => el && el.classList && el.classList.contains("panel-ring"));
    if (isInsideDossiers) {
      return;
    }

    if (archiveScreen.classList.contains("archive-video-active")) {
      const isInsideLorePanel = path.some(el => el && (el.id === "archive-video-lore-tabs" || (el.classList && (el.classList.contains("lore-tab-content") || el.classList.contains("archive-video-lore-tabs")))));
      if (isInsideLorePanel) {
        return;
      }
    }
    event.preventDefault();
    handleArchiveWheel(event);
  }, { passive: false });

  activationScreen?.addEventListener("wheel", handleActivationWheel, { passive: false, capture: true });
  document.addEventListener("wheel", handleActivationWheel, { passive: false, capture: true });

  function makeTouchWheelEvent(sourceEvent, deltaY) {
    return {
      deltaY,
      preventDefault() {},
      composedPath: () => sourceEvent.composedPath?.() || [],
    };
  }

  function handleTouchScroll(event, deltaY) {
    if (!isTouchMode() || Math.abs(deltaY) < 1.8) {
      return;
    }

    if (document.body.classList.contains("prelaunch")) {
      event.preventDefault();
      handleActivationWheel(makeTouchWheelEvent(event, deltaY * 7));
      return;
    }

    if (archiveScreen.classList.contains("hidden") || !caseViewer.classList.contains("hidden")) {
      return;
    }

    const path = event.composedPath?.() || [];
    const isInsideDossiers = path.some(el => el && el.classList && el.classList.contains("panel-ring"));
    if (isInsideDossiers) {
      return;
    }

    if (archiveScreen.classList.contains("archive-video-active")) {
      const isInsideLorePanel = path.some(el => el && (el.id === "archive-video-lore-tabs" || (el.classList && (el.classList.contains("lore-tab-content") || el.classList.contains("archive-video-lore-tabs")))));
      if (isInsideLorePanel) {
        return;
      }
    }

    event.preventDefault();
    handleArchiveWheel(makeTouchWheelEvent(event, deltaY * 7));
  }

  window.addEventListener("touchstart", (event) => {
    primeActivationCodecAudio();
    touchStartY = event.touches[0]?.clientY ?? null;
    touchLastY = touchStartY;
  }, { passive: true });

  window.addEventListener("touchmove", (event) => {
    const currentY = event.touches[0]?.clientY ?? null;
    if (touchLastY === null || currentY === null) {
      return;
    }
    const deltaY = touchLastY - currentY;
    touchLastY = currentY;
    handleTouchScroll(event, deltaY);
  }, { passive: false });

  window.addEventListener("touchend", (event) => {
    if (touchStartY === null || archiveScreen.classList.contains("hidden")) {
      touchStartY = null;
      touchLastY = null;
      return;
    }
    const endY = event.changedTouches[0]?.clientY ?? touchStartY;
    const delta = touchStartY - endY;
    touchStartY = null;
    touchLastY = null;
    if (Math.abs(delta) > 38) {
      handleTouchScroll(event, delta * 0.42);
    }
  }, { passive: false });

  document.addEventListener("keydown", (event) => {
    if (document.body.classList.contains("prelaunch") && (event.key === "Enter" || event.key === " ")) {
      launchHackProgram();
      return;
    }

    primeAmbientMusic();
    if (document.body.classList.contains("intro-active") && (event.key === "Enter" || event.key === "Escape" || event.key === " ")) {
      finishIntro();
      return;
    }

    if (event.key === "Escape") {
      if (modal && !modal.classList.contains("hidden")) {
        closeModal();
        return;
      }
      closeCase();
      return;
    }

    if (archiveScreen.classList.contains("hidden") || !caseViewer.classList.contains("hidden")) {
      return;
    }

    if (event.key === "ArrowDown") {
      rotate(1);
    }
    if (event.key === "ArrowUp") {
      rotate(-1);
    }
    if (event.key === "Enter") {
      archiveUi.openActiveFile();
    }
  });

  window.addEventListener("resize", () => {
    resizeCanvases();
    lastVideoFrameWidth = 0;
    updateVideoProgressBarGeometry();
  });
  document.addEventListener("visibilitychange", () => {
    const isVisible = document.visibilityState !== "hidden";
    setPageVisible(isVisible);
    if (isVisible) {
      startCanvasLoop();
    }
  });

  document.addEventListener("kpr-lumen-hover", (event) => {
    if (event.detail.hovered) {
      showContextualBubble(
        "lumen-hover",
        "That's my colleague Lumen, an ancient pre-flicker drone! Don't let their size fool you—these little ones safeguard the greatest secrets of New Eden.",
        4800,
        null,
        3000
      );
    }
  });

  // Map Node Interaction Logic
  const mapNodes = document.querySelectorAll(".map-node");
  const intelStatusLight = document.querySelector(".intel-status-light");
  
  const popover = document.getElementById("eden-map-popover");
  const popoverContent = document.getElementById("eden-popover-content");
  const popoverClose = popover?.querySelector(".eden-popover-close");
  
  if (popoverClose && popover) {
    popoverClose.addEventListener("click", (e) => {
      e.stopPropagation();
      popover.classList.add("hidden");
    });
  }

  // Click outside to close map popover
  const mapViewport = document.querySelector(".eden-map-viewport");
  const mapStage = document.getElementById("eden-map-stage");
  const mapPanel = document.getElementById("eden-map-panel");
  let mapParallaxFrame = 0;
  let pendingMapPointer = null;

  function updateMapParallax() {
    mapParallaxFrame = 0;
    if (!mapViewport || !pendingMapPointer) return;
    const rect = mapViewport.getBoundingClientRect();
    const nx = Math.max(-1, Math.min(1, ((pendingMapPointer.clientX - rect.left) / rect.width - 0.5) * 2));
    const ny = Math.max(-1, Math.min(1, ((pendingMapPointer.clientY - rect.top) / rect.height - 0.5) * 2));
    mapPanel?.style.setProperty("--map-parallax-x", nx.toFixed(3));
    mapPanel?.style.setProperty("--map-parallax-y", ny.toFixed(3));
  }

  mapViewport?.addEventListener("pointermove", (event) => {
    pendingMapPointer = event;
    if (!mapParallaxFrame) mapParallaxFrame = requestAnimationFrame(updateMapParallax);
  }, { passive: true });

  mapViewport?.addEventListener("pointerleave", () => {
    pendingMapPointer = null;
    mapPanel?.style.setProperty("--map-parallax-x", "0");
    mapPanel?.style.setProperty("--map-parallax-y", "0");
  }, { passive: true });

  if (mapViewport && popover) {
    mapViewport.addEventListener("click", (e) => {
      if (e.target.closest("#eden-map-popover") || e.target.closest(".map-node")) {
        return;
      }
      popover.classList.add("hidden");
    });
  }

  mapNodes.forEach((node) => {
    node.setAttribute("tabindex", "0");
    node.setAttribute("role", "button");
    node.addEventListener("pointerenter", () => node.classList.add("map-node--tracked"));
    node.addEventListener("pointerleave", () => node.classList.remove("map-node--tracked"));
    node.addEventListener("click", () => {
      const name = node.getAttribute("data-name");
      const data = zoneData[name];

      if (data) {
        mapNodes.forEach((candidate) => candidate.classList.toggle("map-node--selected", candidate === node));
        mapStage?.setAttribute("data-selected-node", name || "");
        const nodeRect = node.getBoundingClientRect();
        window.dispatchEvent(new CustomEvent("kpr-map-node-selected", {
          detail: {
            name,
            color: data.badgeBg,
            clientX: nodeRect.left + nodeRect.width / 2,
            clientY: nodeRect.top + nodeRect.height / 2,
          },
        }));
        // Play click sound
        tone("open");

        // Update status light color based on node color
        if (intelStatusLight) {
          intelStatusLight.style.backgroundColor = data.badgeBg;
          intelStatusLight.style.boxShadow = `0 0 8px ${data.badgeBg}`;
        }

        // Render data inside the popover
        if (popover && popoverContent) {
          popoverContent.innerHTML = `
            <div class="intel-details">
              <div class="intel-row-title">
                <h3>${data.name}</h3>
                <span class="intel-badge" style="background: ${data.badgeBg}; color: ${data.badgeFg}; text-shadow: none;">${data.numberLabel}</span>
              </div>
              
              <div class="intel-telemetry-grid">
                <div class="intel-telemetry-item">
                  <span class="intel-label">THREAT LEVEL</span>
                  <strong style="color: ${data.badgeBg}">${data.telemetry.threat}</strong>
                </div>
                <div class="intel-telemetry-item">
                  <span class="intel-label">SYNC SIGNAL</span>
                  <strong>${data.telemetry.sync}</strong>
                </div>
                <div class="intel-telemetry-item">
                  <span class="intel-label">RADIATION</span>
                  <strong>${data.telemetry.rad}</strong>
                </div>
                <div class="intel-telemetry-item">
                  <span class="intel-label">STATUS</span>
                  <strong style="color: ${data.statusColor}">${data.telemetry.status}</strong>
                </div>
              </div>

              <div class="intel-visual-feed">
                <div class="intel-scanline"></div>
                <span class="intel-feed-label" style="color: ${data.badgeBg}; font-size: 8px;">● LIVE FEED SENSOR_${data.number}</span>
                ${data.visual}
              </div>

              <p class="intel-desc">${data.lore}</p>
            </div>
          `;
          popover.classList.remove("hidden");
        }
      }
    });

    node.addEventListener("dblclick", () => {
      if (!mapStage || editorActive) return;
      mapStage.classList.remove("eden-map-stage--jump");
      void mapStage.offsetWidth;
      mapStage.classList.add("eden-map-stage--jump");
      window.setTimeout(() => mapStage.classList.remove("eden-map-stage--jump"), 1450);
    });

    node.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        node.click();
      }
    });
  });

  // Discardable Node Dragging & Positioning Tool (Map Editor Mode)
  // Double-clicking the map footer toggles this helper tool
  const mapFooter = document.querySelector(".eden-map-footer");
  let editorActive = false;
  let dragNode = null;
  let dragOffset = { x: 0, y: 0 };

  if (mapFooter) {
    mapFooter.style.cursor = "pointer";
    mapFooter.title = "Double-click to toggle Node Positioning Tool";
    mapFooter.addEventListener("dblclick", () => {
      editorActive = !editorActive;
      mapFooter.style.background = editorActive ? "rgba(255, 92, 52, 0.28)" : "";
      
      let editorPanel = document.getElementById("kpr-map-editor-panel");
      if (editorActive) {
        if (!editorPanel) {
          editorPanel = document.createElement("div");
          editorPanel.id = "kpr-map-editor-panel";
          editorPanel.style.cssText = "position: relative; margin: 12px 0 0; padding: 12px; background: rgba(0,0,0,0.92); border: 1px solid #ff7700; color: #fff; font-family: monospace; border-radius: 8px; z-index: 1000;";
          editorPanel.innerHTML = `
            <h4 style="margin: 0 0 6px; color: #ff7700; font-size: 12px; font-weight: bold;">MAP NODE EDITOR ACTIVE</h4>
            <p style="margin: 0 0 8px; font-size: 10px; color: #bbb; line-height: 1.4;">Drag spheres on the map. Copy the updated node code:</p>
            <textarea id="kpr-map-nodes-code" readonly style="width: 100%; height: 110px; background: #111; color: #00ffaa; border: 1px solid #444; padding: 6px; font-family: monospace; font-size: 9px; resize: vertical; box-sizing: border-box;"></textarea>
          `;
          document.getElementById("eden-map-panel").appendChild(editorPanel);
        }
        editorPanel.style.display = "block";
        updateEditorCode();
      } else {
        if (editorPanel) editorPanel.style.display = "none";
      }
    });
  }

  function updateEditorCode() {
    const area = document.getElementById("kpr-map-nodes-code");
    if (!area) return;
    const nodes = document.querySelectorAll(".map-node");
    let codeLines = [];
    nodes.forEach(n => {
      const styleLeft = n.style.left;
      const styleTop = n.style.top;
      const name = n.getAttribute("data-name") || "";
      const num = n.getAttribute("data-number") || "";
      const cls = Array.from(n.classList).join(" ");
      
      if (num) {
        codeLines.push(`                  <div class="${cls}" style="left: ${styleLeft}; top: ${styleTop};" data-name="${name}" data-number="${num}"><span>${num}</span></div>`);
      } else {
        codeLines.push(`                  <div class="${cls}" style="left: ${styleLeft}; top: ${styleTop};" data-name="${name}"></div>`);
      }
    });
    area.value = codeLines.join("\n");
  }

  function updateSvgLines() {
    const svg = document.querySelector(".eden-map-network");
    if (!svg) return;
    
    const nodes = {};
    document.querySelectorAll(".map-node").forEach(n => {
      const name = n.getAttribute("data-name");
      if (name) {
        const left = parseFloat(n.style.left);
        const top = parseFloat(n.style.top);
        nodes[name] = {
          x: (left / 100) * 400,
          y: (top / 100) * 400
        };
      }
    });
    
    const lines = svg.querySelectorAll("line");
    if (lines.length >= 12) {
      setLine(lines[0], nodes["SOLIS"], nodes["FAR-RIGHT OUTPOST"]);
      setLine(lines[1], nodes["FAR-RIGHT OUTPOST"], nodes["TOP-LEFT OUTPOST"]);
      setLine(lines[2], nodes["TOP-LEFT OUTPOST"], nodes["SOLIS"]);
      
      setLine(lines[3], nodes["THE KEEP"], nodes["PRISMA CITY"]);
      setLine(lines[4], nodes["TOP-LEFT OUTPOST"], nodes["LEFT OUTPOST"]);
      
      if (nodes["TOP-LEFT OUTPOST"] && nodes["LEFT OUTPOST"]) {
        lines[5].setAttribute("x1", (nodes["TOP-LEFT OUTPOST"].x - 2).toFixed(1));
        lines[5].setAttribute("y1", (nodes["TOP-LEFT OUTPOST"].y + 2).toFixed(1));
        lines[5].setAttribute("x2", (nodes["LEFT OUTPOST"].x - 2).toFixed(1));
        lines[5].setAttribute("y2", (nodes["LEFT OUTPOST"].y + 2).toFixed(1));
      }
      
      setLine(lines[6], nodes["LEFT OUTPOST"], nodes["NODE ONE"]);
      setLine(lines[7], nodes["LEFT OUTPOST"], nodes["THE KEEP"]);
      setLine(lines[8], nodes["LEFT OUTPOST"], nodes["PRISMA CITY"]);
      setLine(lines[9], nodes["LEFT OUTPOST"], nodes["ANIMUS"]);
      setLine(lines[10], nodes["LEFT OUTPOST"], nodes["LAKE KAIROS"]);
      setLine(lines[11], nodes["LEFT OUTPOST"], nodes["FAR-LEFT OUTPOST"]);
    }
  }
  
  function setLine(el, p1, p2) {
    if (el && p1 && p2) {
      el.setAttribute("x1", p1.x.toFixed(1));
      el.setAttribute("y1", p1.y.toFixed(1));
      el.setAttribute("x2", p2.x.toFixed(1));
      el.setAttribute("y2", p2.y.toFixed(1));
    }
  }

  // Handle dragging events
  if (mapViewport) {
    mapViewport.addEventListener("mousedown", (e) => {
      if (!editorActive) return;
      const node = e.target.closest(".map-node");
      if (!node) return;
      e.preventDefault();
      dragNode = node;
      const rect = mapViewport.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;
      
      const leftPct = parseFloat(node.style.left);
      const topPct = parseFloat(node.style.top);
      
      const nodeX = (leftPct / 100) * rect.width;
      const nodeY = (topPct / 100) * rect.height;
      
      dragOffset.x = clientX - nodeX;
      dragOffset.y = clientY - nodeY;
    });

    window.addEventListener("mousemove", (e) => {
      if (!editorActive || !dragNode) return;
      const rect = mapViewport.getBoundingClientRect();
      let x = e.clientX - rect.left - dragOffset.x;
      let y = e.clientY - rect.top - dragOffset.y;
      
      x = Math.max(0, Math.min(rect.width, x));
      y = Math.max(0, Math.min(rect.height, y));
      
      const leftPct = ((x / rect.width) * 100).toFixed(1);
      const topPct = ((y / rect.height) * 100).toFixed(1);
      
      dragNode.style.left = `${leftPct}%`;
      dragNode.style.top = `${topPct}%`;
      updateEditorCode();
      updateSvgLines();
    });

    window.addEventListener("mouseup", () => {
      if (dragNode) {
        dragNode = null;
      }
    });
  }

  // === ORGANIC PORTAL VORTEX PARTICLE ANIMATION SYSTEM (AAA HIGH PERFORMANCE) ===
  const portalCanvas = document.getElementById("eden-portal-canvas");
  if (portalCanvas) {
    const pCtx = portalCanvas.getContext("2d");
    
    // Configuración del sistema de partículas
    // Perceptual density beats brute force: fewer bright streaks sustain 60 FPS.
    const maxPortalParticles = 360;
    const EVENT_HORIZON_SAMPLES = 20000;
    const STRIDE = 8;
    const PORTAL_TRIG_SIZE = 2048;
    const portalSin = new Float32Array(PORTAL_TRIG_SIZE);
    const portalCos = new Float32Array(PORTAL_TRIG_SIZE);
    for (let i = 0; i < PORTAL_TRIG_SIZE; i++) {
      const phase = i / PORTAL_TRIG_SIZE * Math.PI * 2;
      portalSin[i] = Math.sin(phase);
      portalCos[i] = Math.cos(phase);
    }
    const portalTrigIndex = (angle) => ((angle * (PORTAL_TRIG_SIZE / (Math.PI * 2))) | 0) & (PORTAL_TRIG_SIZE - 1);
    const fastPortalSin = (angle) => portalSin[portalTrigIndex(angle)];
    const fastPortalCos = (angle) => portalCos[portalTrigIndex(angle)];
    
    // Offsets de propiedades en el Flat Array
    const OFF_ANGLE = 0;
    const OFF_RADIUS = 1;
    const OFF_SPEED = 2;
    const OFF_ANG_SPEED = 3;
    const OFF_SIZE = 4;
    const OFF_LIFE = 5;
    const OFF_MAX_LIFE = 6;
    const OFF_COLOR = 7;
    
    const particleData = new Float32Array(maxPortalParticles * STRIDE);
    let particlesInitialized = false;

    // Cacheado de strings de color para eliminar la concatenación de strings y Garbage Collection en caliente (Hot Path)
    const colorBases = [
      "rgba(180, 80, 255, ", // 0: Púrpura KPR brillante
      "rgba(255, 80, 200, ",  // 1: Magenta KPR
      "rgba(100, 30, 220, ",  // 2: Morado oscuro (was cian)
      "rgba(255, 255, 255, "   // 3: Blanco energía pura
    ];
    const colorCache = [];
    for (let c = 0; c < 4; c++) {
      colorCache[c] = [];
      const base = colorBases[c];
      for (let a = 0; a <= 100; a++) {
        colorCache[c][a] = `${base}${(a / 100).toFixed(2)})`;
      }
    }

    const EVENT_HORIZON_BANDS = 4;
    const eventHorizonTextures = Array.from({ length: EVENT_HORIZON_BANDS }, () => {
      const canvas = document.createElement("canvas");
      canvas.width = 1024;
      canvas.height = 1024;
      return canvas;
    });
    const eventHorizonBloomTexture = document.createElement("canvas");
    eventHorizonBloomTexture.width = 256;
    eventHorizonBloomTexture.height = 256;
    const eventHorizonRadius = 430;
    let eventHorizonReady = false;

    function buildEventHorizonTexture() {
      const contexts = eventHorizonTextures.map((canvas) => canvas.getContext("2d", { alpha: true }));
      if (contexts.some((ctx) => !ctx)) return;
      const bloomCtx = eventHorizonBloomTexture.getContext("2d", { alpha: true });
      if (!bloomCtx) return;
      bloomCtx.clearRect(0, 0, 256, 256);
      bloomCtx.globalCompositeOperation = "lighter";
      for (const ctx of contexts) {
        ctx.clearRect(0, 0, 1024, 1024);
        ctx.globalCompositeOperation = "lighter";
      }

      let seed = 0x4b505231;
      const random = () => {
        seed ^= seed << 13;
        seed ^= seed >>> 17;
        seed ^= seed << 5;
        return (seed >>> 0) / 4294967296;
      };
      const palette = [
        "rgba(244,239,255,0.74)",
        "rgba(206,176,255,0.58)",
        "rgba(169,91,255,0.52)",
        "rgba(238,83,218,0.44)",
        "rgba(120,61,226,0.38)",
        "rgba(255,255,255,0.66)",
      ];

      for (let i = 0; i < EVENT_HORIZON_SAMPLES; i++) {
        const angle = random() * Math.PI * 2;
        const gaussian = (random() + random() + random() + random() + random() + random() - 3) / 3;
        const harmonic =
          Math.sin(angle * 3 + 0.7) * 5.5 +
          Math.sin(angle * 7 - 1.2) * 3.2 +
          Math.cos(angle * 13 + 0.4) * 1.8;
        const radius = eventHorizonRadius + gaussian * 38 + harmonic;
        const x = 512 + Math.cos(angle) * radius;
        const y = 512 + Math.sin(angle) * radius;
        const depth = Math.max(0, 1 - Math.abs(radius - eventHorizonRadius) / 58);
        const rare = random() > 0.982;
        const size = rare ? 1.8 + random() * 1.4 : 0.35 + random() * (0.75 + depth * 0.45);
        const radialPosition = Math.max(0, Math.min(0.999, (radius - (eventHorizonRadius - 62)) / 124));
        const band = Math.min(EVENT_HORIZON_BANDS - 1, Math.floor(radialPosition * EVENT_HORIZON_BANDS));
        const ctx = contexts[band];
        const frontFacing = Math.sin(angle) > 0;
        const paletteIndex = rare ? 5 : Math.min(4, Math.floor(random() * 5));
        ctx.globalAlpha = frontFacing ? 1 : 0.46;
        ctx.fillStyle = palette[paletteIndex];
        ctx.fillRect(x - size * 0.5, y - size * 0.5, size, size);
        if (rare) {
          bloomCtx.fillStyle = frontFacing ? "rgba(235,218,255,0.52)" : "rgba(135,76,230,0.18)";
          const bloomSize = 1.2 + size * 0.65;
          bloomCtx.fillRect(x * 0.25 - bloomSize * 0.5, y * 0.25 - bloomSize * 0.5, bloomSize, bloomSize);
        }

        if (i % 9 === 0) {
          const tangentX = -Math.sin(angle) * (1.2 + random() * 2.4);
          const tangentY = Math.cos(angle) * (1.2 + random() * 2.4);
          ctx.globalAlpha = frontFacing ? 0.34 : 0.16;
          ctx.fillRect(x + tangentX, y + tangentY, Math.max(0.4, size * 0.7), Math.max(0.4, size * 0.7));
        }
      }
      for (const ctx of contexts) {
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
      }
      bloomCtx.globalCompositeOperation = "source-over";
      eventHorizonReady = true;
    }

    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(buildEventHorizonTexture, { timeout: 2200 });
    } else {
      window.setTimeout(buildEventHorizonTexture, 900);
    }

    function getPortalDirector(time, cursorInfluence = 0, audioPulse = 0) {
      const sharedDirector = window.__kprPortalEnergy;
      if (sharedDirector?.mode === "coherent" && typeof sharedDirector.read === "function") {
        return sharedDirector.read(time * 1000);
      }
      const phase = time * (2 * Math.PI / 7.5);
      const breathe = Math.sin(phase);
      const surgeTime = time % 9;
      const surge = Math.max(0, 1 - Math.abs(surgeTime - 4.5) / 0.72);
      const energy = Math.min(1.35, 0.72 + surge * 0.22 + cursorInfluence * 0.28 + audioPulse * 3);
      return { phase, breathe, surge, energy };
    }

    function getPortalFieldRadius(maxR, progress, time, audioPulse = 0) {
      const open = Math.max(0.05, Math.min(1, progress));
      const settled = Math.max(0, Math.min(1, (open - 0.82) / 0.18));
      const gap = Math.min(19, maxR * 0.055);
      const breathe = getPortalDirector(time, 0, audioPulse).breathe * Math.min(4, maxR * 0.012);
      return maxR * open + settled * (gap + breathe) + maxR * audioPulse;
    }

    function resetParticle(idx, w, h, progress, initial = false) {
      const offset = idx * STRIDE;
      const maxR = Math.min(w, h) * 0.50;
      const time = performance.now() * 0.001;
      const audioPulse = ambientMusic && !ambientMusic.paused
        ? Math.max(0, Math.sin(ambientMusic.currentTime * 2.35)) * 0.012
        : 0;
      const currentMaxR = getPortalFieldRadius(maxR, progress, time, audioPulse);
      
      particleData[offset + OFF_ANGLE] = Math.random() * Math.PI * 2;
      
      const isRingParticle = (idx % 3 === 0);
      
      if (isRingParticle) {
        // Partículas del anillo: nacen exactamente en la frontera actual del portal y giran
        particleData[offset + OFF_RADIUS] = currentMaxR * (0.92 + Math.random() * 0.08);
        particleData[offset + OFF_SPEED] = 0.0;
        // Rotación muy enérgica cuando se está abriendo (Doctor Strange effect)
        const rotationSpeedMultiplier = progress < 0.98 ? (3.5 - progress * 2.0) : 1.0;
        particleData[offset + OFF_ANG_SPEED] = (0.022 + Math.random() * 0.035) * rotationSpeedMultiplier;
      } else {
        // Partículas del vórtice: nacen en el centro (o en la frontera del iris si se está abriendo) y viajan hacia el límite actual de la apertura
        const stopOpen = progress > 0.72 ? (progress - 0.72) / 0.28 : 0;
        const spawnMinR = currentMaxR * stopOpen;
        particleData[offset + OFF_RADIUS] = initial ? (spawnMinR + Math.random() * (currentMaxR - spawnMinR)) : spawnMinR;
        particleData[offset + OFF_SPEED] = 0.5 + Math.random() * 1.5;
        particleData[offset + OFF_ANG_SPEED] = 0.025 + Math.random() * 0.045;
      }
      
      // Chispas de diferente tamaño para efecto cinematográfico
      particleData[offset + OFF_SIZE] = 0.8 + Math.random() * 2.8;
      particleData[offset + OFF_LIFE] = initial ? Math.random() * 140 : 0;
      particleData[offset + OFF_MAX_LIFE] = 120 + Math.random() * 160;
      particleData[offset + OFF_COLOR] = Math.floor(Math.random() * 4);
    }

    let canvasMargin = 60;

    function resizePortalCanvas() {
      if (!portalCanvas || !mapViewport) return;
      const rect = mapViewport.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const portalWidth = mapViewport.offsetWidth || mapViewport.clientWidth || rect.width;
      const portalHeight = mapViewport.offsetHeight || mapViewport.clientHeight || rect.height;
      canvasMargin = Math.max(28, Math.min(82, Math.min(portalWidth, portalHeight) * 0.12));
      
      const w = portalWidth + canvasMargin * 2;
      const h = portalHeight + canvasMargin * 2;
      
      portalCanvas.width = w * dpr;
      portalCanvas.height = h * dpr;
      pCtx.scale(dpr, dpr);
      
      portalCanvas.style.position = 'absolute';
      portalCanvas.style.width = w + 'px';
      portalCanvas.style.height = h + 'px';
      
      let left = -canvasMargin;
      let top = -canvasMargin;
      let layoutNode = mapViewport;
      while (layoutNode && layoutNode !== mapPanel) {
        left += layoutNode.offsetLeft || 0;
        top += layoutNode.offsetTop || 0;
        layoutNode = layoutNode.offsetParent;
      }
      
      portalCanvas.style.left = left + 'px';
      portalCanvas.style.top = top + 'px';
    }

    const veilCanvas = document.getElementById("veil-grid-canvas");
    const vCtx = veilCanvas ? veilCanvas.getContext("2d", { alpha: false, desynchronized: true }) : null;
    // Native DPR is part of the approved VEIL signature. Performance gains
    // come from viewport correctness, state gating and cached work—not blurrier output.
    const getVeilDpr = () => window.devicePixelRatio || 1;

    function resizeVeilCanvas() {
      if (!veilCanvas) return;
      const stage = document.getElementById("eden-map-stage");
      if (!stage) return;
      const dpr = getVeilDpr();
      const w = stage.clientWidth || window.innerWidth;
      const h = stage.clientHeight || window.innerHeight;
      
      veilCanvas.width = w * dpr;
      veilCanvas.height = h * dpr;
      if (vCtx) {
        vCtx.setTransform(1, 0, 0, 1, 0, 0);
        vCtx.scale(dpr, dpr);
      }
      
      veilCanvas.style.position = 'absolute';
      veilCanvas.style.width = w + 'px';
      veilCanvas.style.height = h + 'px';
      veilCanvas.style.left = '0px';
      veilCanvas.style.top = '0px';
      updateMapCenter();
    }

    window.addEventListener("resize", () => {
      resizePortalCanvas();
      resizeVeilCanvas();
      mapCenterX = 0; 
      mapViewportW = 0; // Trigger dimension recalculation on next frame
    });
    setTimeout(() => {
      resizePortalCanvas();
      resizeVeilCanvas();
    }, 150);

    const portalResizeObserver = typeof ResizeObserver === "function"
      ? new ResizeObserver(() => {
          resizePortalCanvas();
          mapViewportW = 0;
        })
      : null;
    portalResizeObserver?.observe(mapViewport);

    // --- Perlin-like Noise for Grid Background ---
    const NZ = 256, nzT = new Float32Array(NZ * NZ);
    for (let i = 0; i < nzT.length; i++) nzT[i] = Math.random();
    function nz2(x, y) {
      x += 1e4; y += 1e4;
      const fx = (x | 0), fy = (y | 0), xf = x - fx, yf = y - fy;
      const x0 = fx & 255, y0 = fy & 255, x1 = (x0 + 1) & 255, y1 = (y0 + 1) & 255;
      const a = nzT[y0 * NZ + x0], b = nzT[y0 * NZ + x1], c = nzT[y1 * NZ + x0], d = nzT[y1 * NZ + x1];
      const sx = xf * xf * (3 - 2 * xf), sy = yf * yf * (3 - 2 * yf);
      return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
    }
    function fbm(x, y) {
      // Match the independent VEIL field: its third octave is what gives the
      // mesh the fine liquid tremor that was missing in the embedded version.
      return nz2(x, y) * 0.6 + nz2(x * 2.1, y * 2.1) * 0.3 + nz2(x * 4.3, y * 4.3) * 0.1;
    }

    // --- Veil Grid Background Constants & Buffers (Ultra-quality) ---
    // Match the reference VEIL lattice exactly. The previous 22 px spacing added
    // ~62% more simulated nodes and changed both its motion signature and cadence.
    const SP = 28;
    const MAX_N = 6000; // Node count clamp
    const FOV = 900;
    const EMBER_N = 90; 
    const MAX_SPK = 250; 
    const MAX_CSPK = 80; 
    const TRAIL_N = 14; 
    const MAX_ARCS = 30; 
    const MAX_CONSTELLATIONS = 15; 
    const MAX_PULSES = 8; 
    const DUST_N = 200; 
    const SPHERE_R = 120; // Repulsion sphere radius

    // Node Buffers
    const gx = new Float32Array(MAX_N);
    const gy = new Float32Array(MAX_N);
    const gvx = new Float32Array(MAX_N);
    const gvy = new Float32Array(MAX_N);
    const ghx = new Float32Array(MAX_N);
    const ghy = new Float32Array(MAX_N);
    const pz = new Float32Array(MAX_N);
    const sx_ = new Float32Array(MAX_N);
    const sy_ = new Float32Array(MAX_N);
    const ss_ = new Float32Array(MAX_N);
    const energy = new Float32Array(MAX_N);
    const eTmp = new Float32Array(MAX_N);
    const flare = new Float32Array(MAX_N);
    const fracture = new Float32Array(MAX_N);
    let totalGridNodes = 0;
    const gDist = new Float32Array(MAX_N);
    const pProgress = new Float32Array(MAX_N);
    let lastActivationProgress = -1;
    const nearLines = [];
    const farLines = [];
    const electricLowLines = [];
    const electricMidLines = [];
    const electricHighLines = [];
    // Canvas2D analogue of instancing: dynamic circles are collected into four
    // opacity buckets and submitted in a handful of fills instead of thousands
    // of per-node drawImage calls.
    const nodeRenderBuckets = [[], [], [], []];
    const brightNodeGlows = [];
    let fpsFrames = 0;
    let fpsLast = 0;
    let curFps = 60;
    let peakFps = 60;

    // Embers
    const emX = new Float32Array(EMBER_N);
    const emY = new Float32Array(EMBER_N);
    const emVx = new Float32Array(EMBER_N);
    const emVy = new Float32Array(EMBER_N);
    const emLife = new Float32Array(EMBER_N);
    const emMax = new Float32Array(EMBER_N);
    const emSz = new Float32Array(EMBER_N);

    // Sparks
    const spkX = new Float32Array(MAX_SPK);
    const spkY = new Float32Array(MAX_SPK);
    const spkVx = new Float32Array(MAX_SPK);
    const spkVy = new Float32Array(MAX_SPK);
    const spkLife = new Float32Array(MAX_SPK);
    const spkMax = new Float32Array(MAX_SPK);
    let spkLen = 0;

    // Connection sparks
    const cspX = new Float32Array(MAX_CSPK);
    const cspY = new Float32Array(MAX_CSPK);
    const cspLife = new Float32Array(MAX_CSPK);
    let cspLen = 0;
    let cspTimer = 0;

    // Mouse / Touch trails
    const trX = new Float32Array(TRAIL_N);
    const trY = new Float32Array(TRAIL_N);
    let trHead = 0, trCount = 0, trTimer = 0;

    // Ambient Dust
    const dustX = new Float32Array(DUST_N);
    const dustY = new Float32Array(DUST_N);
    const dustZ = new Float32Array(DUST_N);
    const dustVx = new Float32Array(DUST_N);
    const dustVy = new Float32Array(DUST_N);
    const dustSz = new Float32Array(DUST_N);
    const dustAl = new Float32Array(DUST_N);

    // Black Hole orbit particles
    const BH_ORB_N = 40;
    const orbA = new Float32Array(BH_ORB_N);
    const orbR = new Float32Array(BH_ORB_N);
    const orbSpd = new Float32Array(BH_ORB_N);
    const orbSz = new Float32Array(BH_ORB_N);
    const orbAl = new Float32Array(BH_ORB_N);

    for (let i = 0; i < BH_ORB_N; i++) {
      orbA[i] = Math.random() * 6.283;
      orbR[i] = 20 + Math.random() * 60;
      orbSpd[i] = (0.5 + Math.random() * 1.5) * (Math.random() > 0.5 ? 1 : -1);
      orbSz[i] = 0.3 + Math.random() * 0.6;
      orbAl[i] = 0.15 + Math.random() * 0.25;
    }

    const waves = [];
    const pulses = [];
    const arcs = [];
    const constellations = [];

    function getArchiveMapProgress() {
      const published = Number(window.__kprArchiveFold?.map);
      if (Number.isFinite(published)) return published;
      const archiveRoot = document.querySelector(".archive-screen") || document.documentElement;
      const cssValue = Number.parseFloat(
        getComputedStyle(archiveRoot).getPropertyValue("--archive-map"),
      );
      return Number.isFinite(cssValue) ? cssValue : 0;
    }

    // State Variables
    let veilInitialized = false;
    let gridCols = 0;
    let gridRows = 0;
    let bhX = undefined, bhY = undefined;
    let lastInteract = -10, lastBeat = -10, lastWaterRipple = -10;
    let nextFlareT = 2, nextFractT = 5, nextArcT = 1, nextConstT = 3, nextPulseT = 2;
    let shakeI = 0, shakeX = 0, shakeY = 0;
    let stormX = -1, stormSpd = 0, stormHue = 0, nextStormT = 14;
    let qMult = 1;
    let metaPulse = 0;
    let bhSize = 0;
    let colorTemp = 0;
    let timeDilation = 1.0;
    let selectedNodeX = 0;
    let selectedNodeY = 0;
    let selectedNodeEnergy = 0;
    let cursorCharge = 0;
    let lastCursorSpark = -10;

    window.addEventListener("kpr-map-node-selected", (event) => {
      if (!veilCanvas || !event.detail) return;
      const rect = veilCanvas.getBoundingClientRect();
      selectedNodeX = event.detail.clientX - rect.left;
      selectedNodeY = event.detail.clientY - rect.top;
      selectedNodeEnergy = 1;
      // The bubbling click is handled by the exact same Veil reaction pipeline.
    });

    let mapCenterX = 0;
    let mapCenterY = 0;
    let mapViewportW = 0;
    let mapViewportH = 0;
    const metaVertices = Array.from({ length: 13 }, () => ({ x: 0, y: 0 }));

    function updateMapCenter() {
      if (!mapViewport || !veilCanvas) return;
      const rect = mapViewport.getBoundingClientRect();
      const parentRect = veilCanvas.getBoundingClientRect();
      if (rect.width > 0 && parentRect.width > 0) {
        mapCenterX = rect.left - parentRect.left + rect.width / 2;
        mapCenterY = rect.top - parentRect.top + rect.height / 2;
        mapViewportW = mapViewport.offsetWidth || mapViewport.clientWidth || rect.width;
        mapViewportH = mapViewport.offsetHeight || mapViewport.clientHeight || rect.height;
      }
    }

    const M = { x: -9999, y: -9999, px: -9999, py: -9999, vx: 0, vy: 0 };
    const SM = { x: -9999, y: -9999 };
    const touchPts = [];

    let vigC = null, glowC = null, sdfDot = null, sdfRound = null, bhC = null, nebC = null, lensC = null, grainC = null, bloomC = null, bloomX = null;
    let sgA = 0, sgR = 0;
    let grainTmr = 0;

    function resetEmber(i, scat) {
      if (!veilCanvas) return;
      const W = veilCanvas.width / getVeilDpr();
      const H = veilCanvas.height / getVeilDpr();
      emX[i] = Math.random() * W;
      emY[i] = scat ? Math.random() * H : H + 10;
      emVx[i] = (Math.random() - 0.5) * 6;
      emVy[i] = -(Math.random() * 10 + 4);
      emLife[i] = 0;
      emMax[i] = 3 + Math.random() * 5;
      emSz[i] = 0.4 + Math.random() * 1.3;
    }

    function resetDust(i, scatter) {
      if (!veilCanvas) return;
      const W = veilCanvas.width / getVeilDpr();
      const H = veilCanvas.height / getVeilDpr();
      dustX[i] = Math.random() * W;
      dustY[i] = scatter ? Math.random() * H : (Math.random() > 0.5 ? -5 : H + 5);
      dustZ[i] = (Math.random() - 0.5) * 80;
      dustVx[i] = (Math.random() - 0.5) * 8;
      dustVy[i] = (Math.random() - 0.5) * 6 - 2;
      dustSz[i] = 0.3 + Math.random() * 0.8;
      dustAl[i] = 0.08 + Math.random() * 0.18;
    }

    function buildVig(W, H) {
      vigC = document.createElement('canvas');
      const dpr = getVeilDpr();
      vigC.width = W * dpr;
      vigC.height = H * dpr;
      const vc = vigC.getContext('2d');
      vc.scale(dpr, dpr);
      const r = Math.max(W, H) * 0.72;
      const g = vc.createRadialGradient(W / 2, H / 2, r * 0.18, W / 2, H / 2, r);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(0.5, 'rgba(0,0,0,0)');
      g.addColorStop(0.78, 'rgba(0,0,0,0.45)');
      g.addColorStop(1, 'rgba(0,0,0,0.92)');
      vc.fillStyle = g;
      vc.fillRect(0, 0, W, H);
    }

    function buildGlow() {
      const s = 340;
      glowC = document.createElement('canvas');
      const dpr = getVeilDpr();
      glowC.width = s * dpr;
      glowC.height = s * dpr;
      const gc = glowC.getContext('2d');
      gc.scale(dpr, dpr);
      const g = gc.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      g.addColorStop(0, 'rgba(139,92,246,0.08)');
      g.addColorStop(0.3, 'rgba(99,102,241,0.045)');
      g.addColorStop(0.65, 'rgba(79,70,229,0.015)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      gc.fillStyle = g;
      gc.fillRect(0, 0, s, s);
    }

    function buildSdf() {
      const s = 32;
      sdfDot = document.createElement('canvas');
      sdfDot.width = s;
      sdfDot.height = s;
      const sc = sdfDot.getContext('2d');
      const g = sc.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      g.addColorStop(0, 'rgba(220,200,255,1)');
      g.addColorStop(0.15, 'rgba(180,150,255,0.6)');
      g.addColorStop(0.35, 'rgba(139,92,246,0.2)');
      g.addColorStop(0.6, 'rgba(99,60,200,0.05)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      sc.fillStyle = g;
      sc.fillRect(0, 0, s, s);
    }

    function buildSdfRound() {
      const s = 16;
      sdfRound = document.createElement('canvas');
      sdfRound.width = s;
      sdfRound.height = s;
      const rc = sdfRound.getContext('2d');
      const rg = rc.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      rg.addColorStop(0, 'rgba(255,255,255,1)');
      rg.addColorStop(0.2, 'rgba(210,195,255,0.8)');
      rg.addColorStop(0.45, 'rgba(167,139,250,0.3)');
      rg.addColorStop(0.7, 'rgba(139,92,246,0.08)');
      rg.addColorStop(1, 'rgba(0,0,0,0)');
      rc.fillStyle = rg;
      rc.fillRect(0, 0, s, s);
    }

    function buildBlackHole() {
      if (!veilCanvas) return;
      const W = veilCanvas.width / getVeilDpr();
      const H = veilCanvas.height / getVeilDpr();
      const dpr = getVeilDpr();
      bhSize = Math.min(W, H) * 0.7;
      bhC = document.createElement('canvas');
      bhC.width = bhSize * dpr;
      bhC.height = bhSize * dpr;
      const bc = bhC.getContext('2d');
      bc.scale(dpr, dpr);
      const cx = bhSize / 2, cy = bhSize / 2;

      const g1 = bc.createRadialGradient(cx, cy, bhSize * 0.06, cx, cy, bhSize * 0.5);
      g1.addColorStop(0, 'rgba(0,0,0,0)');
      g1.addColorStop(0.15, 'rgba(50,15,90,0.05)');
      g1.addColorStop(0.3, 'rgba(35,8,65,0.04)');
      g1.addColorStop(0.5, 'rgba(20,4,45,0.03)');
      g1.addColorStop(0.75, 'rgba(10,2,25,0.015)');
      g1.addColorStop(1, 'rgba(0,0,0,0)');
      bc.fillStyle = g1;
      bc.fillRect(0, 0, bhSize, bhSize);

      const g2 = bc.createRadialGradient(cx, cy, bhSize * 0.035, cx, cy, bhSize * 0.28);
      g2.addColorStop(0, 'rgba(0,0,0,0)');
      g2.addColorStop(0.15, 'rgba(200,100,0,0.06)');
      g2.addColorStop(0.3, 'rgba(255,160,30,0.1)');
      g2.addColorStop(0.45, 'rgba(255,130,15,0.08)');
      g2.addColorStop(0.6, 'rgba(200,80,0,0.05)');
      g2.addColorStop(0.8, 'rgba(120,40,0,0.025)');
      g2.addColorStop(1, 'rgba(0,0,0,0)');
      bc.globalCompositeOperation = 'lighter';
      bc.fillStyle = g2;
      bc.fillRect(0, 0, bhSize, bhSize);

      const g3 = bc.createRadialGradient(cx, cy, 0, cx, cy, bhSize * 0.06);
      g3.addColorStop(0, 'rgba(255,240,150,1)');
      g3.addColorStop(0.2, 'rgba(255,215,60,0.75)');
      g3.addColorStop(0.45, 'rgba(255,170,25,0.35)');
      g3.addColorStop(0.7, 'rgba(220,110,0,0.12)');
      g3.addColorStop(1, 'rgba(0,0,0,0)');
      bc.fillStyle = g3;
      bc.fillRect(0, 0, bhSize, bhSize);

      const g4 = bc.createRadialGradient(cx, cy, bhSize * 0.025, cx, cy, bhSize * 0.1);
      g4.addColorStop(0, 'rgba(255,230,90,0.35)');
      g4.addColorStop(0.35, 'rgba(255,180,40,0.18)');
      g4.addColorStop(0.65, 'rgba(220,100,0,0.06)');
      g4.addColorStop(1, 'rgba(0,0,0,0)');
      bc.fillStyle = g4;
      bc.fillRect(0, 0, bhSize, bhSize);

      const g5 = bc.createRadialGradient(cx, cy, bhSize * 0.08, cx, cy, bhSize * 0.22);
      g5.addColorStop(0, 'rgba(139,92,246,0.06)');
      g5.addColorStop(0.4, 'rgba(99,60,200,0.03)');
      g5.addColorStop(1, 'rgba(0,0,0,0)');
      bc.fillStyle = g5;
      bc.fillRect(0, 0, bhSize, bhSize);
    }

    function buildNebula() {
      const s = 128;
      nebC = document.createElement('canvas');
      nebC.width = s;
      nebC.height = s;
      const nc = nebC.getContext('2d');
      const imgD = nc.createImageData(s, s);
      for (let y = 0; y < s; y++) {
        for (let x = 0; x < s; x++) {
          const nx = x / s * 3;
          const ny = y / s * 3;
          const v = fbm(nx, ny) * 0.5 + fbm(nx * 1.7 + 2.3, ny * 1.7 + 1.1) * 0.3 + fbm(nx * 3.1 + 5.7, ny * 3.1 + 3.3) * 0.15;
          const idx = (y * s + x) * 4;
          const bright = Math.pow(Math.max(0, v - 0.25) * 2, 1.5);
          imgD.data[idx] = Math.min(255, (60 + bright * 80) | 0);
          imgD.data[idx + 1] = Math.min(255, (20 + bright * 40) | 0);
          imgD.data[idx + 2] = Math.min(255, (80 + bright * 140) | 0);
          imgD.data[idx + 3] = Math.min(255, (bright * 25) | 0);
        }
      }
      nc.putImageData(imgD, 0, 0);
    }

    function buildLensFlare() {
      const s = 128;
      lensC = document.createElement('canvas');
      lensC.width = s;
      lensC.height = s;
      const lc = lensC.getContext('2d');
      const cx = s / 2, cy = s / 2;
      lc.globalCompositeOperation = 'lighter';
      for (let spike = 0; spike < 6; spike++) {
        const angle = (Math.PI / 3) * spike;
        const g = lc.createLinearGradient(cx, cy, cx + Math.cos(angle) * s * 0.45, cy + Math.sin(angle) * s * 0.45);
        g.addColorStop(0, 'rgba(255,240,180,0.6)');
        g.addColorStop(0.3, 'rgba(255,200,80,0.15)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        lc.strokeStyle = g;
        lc.lineWidth = 0.8;
        lc.beginPath();
        lc.moveTo(cx, cy);
        lc.lineTo(cx + Math.cos(angle) * s * 0.45, cy + Math.sin(angle) * s * 0.45);
        lc.stroke();

        const g2 = lc.createLinearGradient(cx, cy, cx - Math.cos(angle) * s * 0.45, cy - Math.sin(angle) * s * 0.45);
        g2.addColorStop(0, 'rgba(255,240,180,0.6)');
        g2.addColorStop(0.3, 'rgba(255,200,80,0.15)');
        g2.addColorStop(1, 'rgba(0,0,0,0)');
        lc.strokeStyle = g2;
        lc.beginPath();
        lc.moveTo(cx, cy);
        lc.lineTo(cx - Math.cos(angle) * s * 0.45, cy - Math.sin(angle) * s * 0.45);
        lc.stroke();
      }
      const cg = lc.createRadialGradient(cx, cy, 0, cx, cy, s * 0.12);
      cg.addColorStop(0, 'rgba(255,250,220,0.8)');
      cg.addColorStop(0.5, 'rgba(255,200,100,0.2)');
      cg.addColorStop(1, 'rgba(0,0,0,0)');
      lc.fillStyle = cg;
      lc.fillRect(0, 0, s, s);
    }

    function buildGrain() {
      grainC = document.createElement('canvas');
      grainC.width = 512;
      grainC.height = 512;
      refreshGrain();
    }
    function refreshGrain() {
      if (!grainC) return;
      const gc = grainC.getContext('2d');
      const d = gc.createImageData(512, 512);
      for (let i = 0; i < d.data.length; i += 4) {
        const v = (Math.random() * 255) | 0;
        d.data[i] = v;
        d.data[i + 1] = v;
        d.data[i + 2] = v;
        d.data[i + 3] = 255;
      }
      gc.putImageData(d, 0, 0);
    }
    function buildBloom(W, H) {
      const dpr = getVeilDpr();
      bloomC = document.createElement('canvas');
      bloomC.width = Math.ceil(W * dpr / 2);
      bloomC.height = Math.ceil(H * dpr / 2);
      bloomX = bloomC.getContext('2d');
    }

    function spawnWave(wx, wy, str, maxR, spd) {
      waves.push({ x: wx, y: wy, r: 0, maxR, str, life: 1, spd });
    }
    function spawnWaveBurst(wx, wy, str, maxR, spd, count = 6) {
      for (let i = 0; i < count; i++) {
        waves.push({
          x: wx,
          y: wy,
          r: -i * 24,
          maxR: maxR * (0.72 + i * 0.055),
          str: str * (1 - i * 0.075),
          life: 1,
          spd: spd * (0.88 + i * 0.035),
        });
      }
    }
    function spawnPulse(px, py, str) {
      if (pulses.length < MAX_PULSES && veilCanvas) {
        const W = veilCanvas.width / getVeilDpr();
        const H = veilCanvas.height / getVeilDpr();
        pulses.push({ x: px, y: py, r: 0, life: 1, str, spd: 200 + Math.random() * 150, maxR: Math.max(W, H) * 0.4 });
      }
    }
    function pushNodes(wx, wy, rad, force) {
      for (let i = 0; i < totalGridNodes; i++) {
        const dx = gx[i] - wx, dy = gy[i] - wy, d = Math.sqrt(dx * dx + dy * dy);
        if (d < rad) {
          const f = (1 - d / rad) * force;
          gvx[i] += dx / (d + 1) * f;
          gvy[i] += dy / (d + 1) * f;
        }
      }
    }
    function spawnSparks(x, y, n) {
      for (let i = 0; i < n && spkLen < MAX_SPK; i++) {
        const a = Math.random() * 6.283, s = 80 + Math.random() * 280;
        spkX[spkLen] = x; spkY[spkLen] = y; spkVx[spkLen] = Math.cos(a) * s; spkVy[spkLen] = Math.sin(a) * s;
        spkLife[spkLen] = 0; spkMax[spkLen] = 0.35 + Math.random() * 0.7; spkLen++;
      }
    }

    function drawMeta(mx, my, rad, al, rot, pulse) {
      if (!vCtx || al < 0.003) return;
      const progress = getArchiveMapProgress();
      const progressGrid = Math.min(1.0, Math.max(0.0, (progress - 0.75) / 0.25));
      if (progressGrid <= 0.01) return;

      function drawQuantumLine(ctx, x1, y1, x2, y2, pls, tVal) {
        if (pls < 0.01) {
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          return;
        }
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.sqrt(dx * dx + dy * dy);
        const nx = -dy / (len + 0.01);
        const ny = dx / (len + 0.01);
        ctx.moveTo(x1, y1);
        for (let s = 1; s <= 4; s++) {
          const tRatio = s / 4;
          const px = x1 + dx * tRatio;
          const py = y1 + dy * tRatio;
          const wave = Math.sin(tRatio * Math.PI + tVal * 32 + len * 0.05) * 2.2 * pls;
          ctx.lineTo(px + nx * wave, py + ny * wave);
        }
      }

      vCtx.save();
      vCtx.translate(mx, my);
      vCtx.rotate(rot);
      vCtx.globalCompositeOperation = 'lighter';
      const pAl = (al + pulse * 0.4) * progressGrid;
      const pRad = rad * (1 + pulse * 0.08);
      
      // Populate static vertex pool in-place to avoid array/object garbage allocation
      metaVertices[0].x = 0;
      metaVertices[0].y = 0;
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 6;
        metaVertices[i + 1].x = Math.cos(a) * pRad;
        metaVertices[i + 1].y = Math.sin(a) * pRad;
      }
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i;
        metaVertices[i + 7].x = Math.cos(a) * pRad * 1.732;
        metaVertices[i + 7].y = Math.sin(a) * pRad * 1.732;
      }
      
      vCtx.lineWidth = 0.4;
      vCtx.strokeStyle = 'rgba(99,102,241,' + (pAl * 0.35) + ')';
      vCtx.beginPath();
      const timeVal = performance.now() * 0.001;
      for (let i = 0; i < 13; i++) {
        for (let j = i + 1; j < 13; j++) {
          drawQuantumLine(vCtx, metaVertices[i].x, metaVertices[i].y, metaVertices[j].x, metaVertices[j].y, pulse, timeVal);
        }
      }
      vCtx.stroke();
      
      vCtx.strokeStyle = 'rgba(139,92,246,' + (pAl * 0.5) + ')';
      vCtx.lineWidth = 0.6;
      vCtx.beginPath();
      for (const c of metaVertices) {
        vCtx.moveTo(c.x + pRad * 0.35, c.y);
        vCtx.arc(c.x, c.y, pRad * 0.35, 0, 6.283);
      }
      vCtx.stroke();
      
      vCtx.strokeStyle = 'rgba(167,139,250,' + (pAl * 0.2) + ')';
      vCtx.lineWidth = 0.35;
      vCtx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i;
        const cx2 = Math.cos(a) * pRad * 0.5;
        const cy2 = Math.sin(a) * pRad * 0.5;
        vCtx.moveTo(cx2 + pRad * 0.5, cy2);
        vCtx.arc(cx2, cy2, pRad * 0.5, 0, 6.283);
      }
      vCtx.stroke();
      
      vCtx.restore();
    }

    function spawnArc() {
      if (arcs.length >= MAX_ARCS) return;
      const candidates = [];
      for (let i = 0; i < totalGridNodes; i++) {
        if (energy[i] > 0.5) candidates.push(i);
      }
      if (candidates.length < 2) return;
      const a = candidates[Math.floor(Math.random() * candidates.length)];
      let b = a, bestD = 1e9;
      for (let j = 0; j < candidates.length; j++) {
        const c = candidates[j];
        if (c === a) continue;
        const dx = sx_[a] - sx_[c], dy = sy_[a] - sy_[c], d = dx * dx + dy * dy;
        if (d > 400 && d < 60000 && d < bestD) {
          bestD = d;
          b = c;
        }
      }
      if (b === a) return;
      arcs.push({ a, b, life: 0.15 + Math.random() * 0.25, maxLife: 0.15 + Math.random() * 0.25, segments: 3 + Math.floor(Math.random() * 4) });
    }

    function drawArc(arc) {
      if (!vCtx) return;
      const ax = sx_[arc.a], ay = sy_[arc.a], bx = sx_[arc.b], by = sy_[arc.b];
      const t = arc.life / arc.maxLife;
      const al = t * t * 0.6;
      vCtx.globalAlpha = al;
      vCtx.strokeStyle = 'rgba(200,170,255,0.8)';
      vCtx.lineWidth = 0.4 + t * 0.6;
      vCtx.beginPath();
      vCtx.moveTo(ax, ay);
      const segs = arc.segments;
      for (let s = 1; s < segs; s++) {
        const frac = s / segs;
        const mx = ax + (bx - ax) * frac + (Math.random() - 0.5) * 18 * t;
        const my = ay + (by - ay) * frac + (Math.random() - 0.5) * 18 * t;
        vCtx.lineTo(mx, my);
      }
      vCtx.lineTo(bx, by);
      vCtx.stroke();
      
      vCtx.globalAlpha = al * 0.5;
      vCtx.strokeStyle = 'rgba(255,240,255,0.9)';
      vCtx.lineWidth = 0.2;
      vCtx.beginPath();
      vCtx.moveTo(ax, ay);
      for (let s = 1; s < segs; s++) {
        const frac = s / segs;
        vCtx.lineTo(ax + (bx - ax) * frac + (Math.random() - 0.5) * 8 * t, ay + (by - ay) * frac + (Math.random() - 0.5) * 8 * t);
      }
      vCtx.lineTo(bx, by);
      vCtx.stroke();
    }

    function spawnConstellation() {
      if (constellations.length >= MAX_CONSTELLATIONS) return;
      const seed = Math.floor(Math.random() * totalGridNodes);
      const pts = [seed];
      let cur = seed;
      const n = 2 + Math.floor(Math.random() * 4);
      for (let i = 0; i < n; i++) {
        let best = -1, bestD = 1e9;
        for (let j = 0; j < 20; j++) {
          const cand = Math.floor(Math.random() * totalGridNodes);
          if (pts.includes(cand)) continue;
          const dx = sx_[cur] - sx_[cand], dy = sy_[cur] - sy_[cand], d = dx * dx + dy * dy;
          if (d > 2000 && d < 100000 && d < bestD) {
            bestD = d;
            best = cand;
          }
        }
        if (best >= 0) {
          pts.push(best);
          cur = best;
        }
      }
      if (pts.length >= 2) constellations.push({ pts, life: 2 + Math.random() * 3, maxLife: 2 + Math.random() * 3 });
    }

    function drawAccretionDisk(cx, cy, t) {
      if (!vCtx || !veilCanvas) return;
      const progress = getArchiveMapProgress();
      const progressGrid = Math.min(1.0, Math.max(0.0, (progress - 0.75) / 0.25));
      if (progressGrid <= 0.01) return;

      vCtx.save();
      vCtx.translate(cx, cy);
      const armCount = 3;
      const W = veilCanvas.width / getVeilDpr();
      const H = veilCanvas.height / getVeilDpr();
      const maxR = Math.min(W, H) * 0.22;
      vCtx.globalCompositeOperation = 'lighter';
      for (let arm = 0; arm < armCount; arm++) {
        const armOff = (6.283 / armCount) * arm;
        vCtx.beginPath();
        for (let a = 0; a < 6.283; a += 0.02) {
          const spiral = a * 1.2 + t * 0.3 + armOff;
          const r = maxR * 0.12 + a / (6.283) * maxR * 0.85;
          const wobble = Math.sin(a * 3 + t * 2) * r * 0.04 + Math.sin(a * 7 + t * 4.3) * r * 0.015;
          const xx = Math.cos(spiral) * (r + wobble);
          const yy = Math.sin(spiral) * (r + wobble) * 0.42;
          if (a < 0.02) vCtx.moveTo(xx, yy); else vCtx.lineTo(xx, yy);
        }
        const fade = (0.04 + Math.sin(t * 0.5 + arm) * 0.015) * progressGrid;
        vCtx.globalAlpha = fade;
        vCtx.strokeStyle = 'hsl(' + (35 + arm * 8) + ',85%,60%)';
        vCtx.lineWidth = 0.6 + Math.sin(t + arm) * 0.3;
        vCtx.stroke();
      }

      vCtx.beginPath();
      for (let a = 0; a < 6.3; a += 0.03) {
        const r = maxR * 0.12 + Math.sin(a * 5 + t * 3) * 2;
        const xx = Math.cos(a + t * 0.4) * r;
        const yy = Math.sin(a + t * 0.4) * r * 0.42;
        if (a < 0.03) vCtx.moveTo(xx, yy); else vCtx.lineTo(xx, yy);
      }
      vCtx.closePath();
      vCtx.globalAlpha = 0.08 * progressGrid;
      vCtx.strokeStyle = 'rgba(255,220,100,0.8)';
      vCtx.lineWidth = 1.2;
      vCtx.stroke();
      vCtx.restore();
    }

    window.addEventListener('mousemove', e => {
      const progress = getArchiveMapProgress();
      if (progress < 0.05) return;
      const rect = veilCanvas ? veilCanvas.getBoundingClientRect() : null;
      if (!rect) return;
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;
      if (M.x < -9000) {
        M.x = clientX; M.y = clientY;
        M.px = clientX; M.py = clientY;
        M.vx = 0; M.vy = 0;
      } else {
        M.px = M.x; M.py = M.y;
        M.x = clientX; M.y = clientY;
        M.vx = M.x - M.px; M.vy = M.y - M.py;
      }
      const pointerSpeed = Math.sqrt(M.vx * M.vx + M.vy * M.vy);
      const now = performance.now() * 0.001;
      const mapRect = mapViewport?.getBoundingClientRect();
      const insideMap = mapRect
        && e.clientX >= mapRect.left && e.clientX <= mapRect.right
        && e.clientY >= mapRect.top && e.clientY <= mapRect.bottom;
      if (insideMap && pointerSpeed > 1.6 && now - lastWaterRipple > 0.11 && waves.length < 18) {
        spawnWave(
          M.x,
          M.y,
          Math.min(2.8, 0.7 + pointerSpeed * 0.055),
          Math.min(190, 105 + pointerSpeed * 1.4),
          175 + Math.min(90, pointerSpeed * 1.2),
        );
        lastWaterRipple = now;
      }
      // Cursor suavizado para la aurora glow (evita saltos bruscos)
      if (SM.x <= -5000) { SM.x = M.x; SM.y = M.y; }
      lastInteract = now;
    });

    function triggerInteractionJuice() {
      // 1. Localized UI impact shake on the map panel
      const panel = document.getElementById("eden-map-panel");
      if (panel) {
        panel.classList.remove("ui-impact-shake");
        void panel.offsetWidth; // Force reflow to restart animation
        panel.classList.add("ui-impact-shake");
      }
      // 2. Reactive map dimming to highlight grid visual details
      const mapImg = document.querySelector(".eden-map-img");
      if (mapImg) {
        mapImg.classList.add("grid-interacting");
        if (window.__kprMapDimTimeout) clearTimeout(window.__kprMapDimTimeout);
        window.__kprMapDimTimeout = setTimeout(() => {
          mapImg.classList.remove("grid-interacting");
        }, 1200);
      }
      // 3. Trigger bullet-time slowly recovering dilation
      timeDilation = 0.45;
    }

    window.addEventListener('click', e => {
      const progress = getArchiveMapProgress();
      if (progress < 0.9) return;
      const rect = veilCanvas ? veilCanvas.getBoundingClientRect() : null;
      if (!rect) return;
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      spawnWaveBurst(clickX, clickY, 8, 460, 560, 7);
      pushNodes(clickX, clickY, 130, 10);
      spawnSparks(clickX, clickY, 22 + Math.floor(Math.random() * 10));
      spawnPulse(clickX, clickY, 0.7);
      metaPulse = Math.max(metaPulse, 0.6);
      shakeI = Math.max(shakeI, 3);
      lastInteract = performance.now() * 0.001;
      
      triggerInteractionJuice();
    });

    window.addEventListener('dblclick', e => {
      const progress = getArchiveMapProgress();
      if (progress < 0.9) return;
      const rect = veilCanvas ? veilCanvas.getBoundingClientRect() : null;
      if (!rect) return;
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      spawnWaveBurst(clickX, clickY, 14, 650, 720, 10);
      pushNodes(clickX, clickY, 200, 18);
      spawnSparks(clickX, clickY, 50 + Math.floor(Math.random() * 20));
      spawnPulse(clickX, clickY, 1.2);
      metaPulse = 1.0;
      shakeI = Math.max(shakeI, 6);
      lastInteract = performance.now() * 0.001;
      
      triggerInteractionJuice();
      timeDilation = 0.18; // Deeper bullet-time freeze on double-click
    });

    window.addEventListener('touchstart', e => {
      const progress = getArchiveMapProgress();
      if (progress < 0.9) return;
      const rect = veilCanvas ? veilCanvas.getBoundingClientRect() : null;
      if (!rect) return;
      for (const t of e.changedTouches) {
        const tx = t.clientX - rect.left;
        const ty = t.clientY - rect.top;
        spawnWave(tx, ty, 6, 350, 500);
        pushNodes(tx, ty, 110, 8);
        spawnSparks(tx, ty, 18);
        spawnPulse(tx, ty, 0.5);
      }
      syncT(e, rect);
      shakeI = Math.max(shakeI, 2);
      lastInteract = performance.now() * 0.001;
      
      triggerInteractionJuice();
    }, { passive: true });

    window.addEventListener('touchmove', e => {
      const progress = getArchiveMapProgress();
      if (progress < 0.9) return;
      const rect = veilCanvas ? veilCanvas.getBoundingClientRect() : null;
      if (!rect) return;
      syncT(e, rect);
      lastInteract = performance.now() * 0.001;
    }, { passive: true });

    window.addEventListener('touchend', e => {
      const rect = veilCanvas ? veilCanvas.getBoundingClientRect() : null;
      if (!rect) return;
      syncT(e, rect);
    }, { passive: true });
    window.addEventListener('touchcancel', e => {
      const rect = veilCanvas ? veilCanvas.getBoundingClientRect() : null;
      if (!rect) return;
      syncT(e, rect);
    });

    function syncT(e, rect) {
      touchPts.length = 0;
      for (const t of e.touches) {
        touchPts.push({ x: t.clientX - rect.left, y: t.clientY - rect.top });
      }
    }

    function initVeilGrid(W, H) {
      const CX = W / 2;
      const CY = H / 2;
      gridCols = Math.ceil(W / SP) + 2;
      gridRows = Math.ceil(H / SP) + 2;
      const ox = -(gridCols * SP) * 0.5;
      const oy = -(gridRows * SP) * 0.5;
      totalGridNodes = 0;
      
      energy.fill(0);
      flare.fill(0);
      fracture.fill(0);
      pz.fill(0);
      
      for (let r = 0; r < gridRows; r++) {
        for (let c = 0; c < gridCols; c++) {
          if (totalGridNodes >= MAX_N) break;
          const nodeX = CX + ox + c * SP;
          const nodeY = CY + oy + r * SP;
          gx[totalGridNodes] = nodeX;
          gy[totalGridNodes] = nodeY;
          gvx[totalGridNodes] = 0;
          gvy[totalGridNodes] = 0;
          ghx[totalGridNodes] = nodeX;
          ghy[totalGridNodes] = nodeY;
          pz[totalGridNodes] = 0;
          
          // Precalculate static distance to grid center for sweep optimization
          const dx = nodeX - CX;
          const dy = nodeY - CY;
          gDist[totalGridNodes] = Math.sqrt(dx * dx + dy * dy);
          
          totalGridNodes++;
        }
      }
      
      for (let i = 0; i < EMBER_N; i++) resetEmber(i, true);
      for (let i = 0; i < DUST_N; i++) resetDust(i, true);
      
      buildVig(W, H);
      buildGlow();
      buildSdf();
      buildSdfRound();
      buildBlackHole();
      buildNebula();
      buildLensFlare();
      buildGrain();
      buildBloom(W, H);
      
      veilInitialized = true;
      lastActivationProgress = -1;
    }

    let portalLoopActive = true;
    let lastPortalTime = 0;
    let portalFrameParity = 0;
    const portraitGuardQuery = window.matchMedia?.(
      "(max-width: 960px) and (orientation: portrait) and (hover: none) and (pointer: coarse)"
    );
    function animatePortal() {
      if (!portalLoopActive) return;
      requestAnimationFrame(animatePortal);

      const portraitGuardBlocking = portraitGuardQuery?.matches;
      if (portraitGuardBlocking) {
        lastPortalTime = 0;
        return;
      }

      const progress = getArchiveMapProgress();
      if (progress < 0.005 || document.hidden) {
        lastPortalTime = 0;
        return;
      }

      if (mapViewportW === 0) {
        updateMapCenter();
      }

      const viewportW = mapViewportW;
      const viewportH = mapViewportH;
      selectedNodeEnergy *= 0.965;

      if (viewportW === 0 || viewportH === 0) return;

      const stage = document.getElementById("eden-map-stage");
      const layoutW = stage ? stage.clientWidth : window.innerWidth;
      const layoutH = stage ? stage.clientHeight : window.innerHeight;

      const dpr = getVeilDpr();
      const canvasW = viewportW + canvasMargin * 2;
      const canvasH = viewportH + canvasMargin * 2;
      
      if (portalCanvas.width !== Math.floor(canvasW * dpr)) {
        resizePortalCanvas();
      }

      if (veilCanvas && (veilCanvas.width !== Math.floor(layoutW * dpr) || !veilInitialized)) {
        resizeVeilCanvas();
        initVeilGrid(layoutW, layoutH);
      }

      // The portal is crisp, while VEIL deliberately keeps the independent
      // reference's short optical persistence. A hard black copy made the
      // embedded field look dry and noticeably less fluid.
      pCtx.clearRect(0, 0, canvasW, canvasH);
      const isScreensaverActive = document.body.classList.contains("prelaunch") ||
                                  document.body.classList.contains("intro-active") ||
                                  document.body.classList.contains("screensaver-active") ||
                                  document.querySelector(".screensaver-overlay") !== null;
      if (vCtx) {
        vCtx.globalCompositeOperation = 'source-over';
        vCtx.globalAlpha = 0.32;
        vCtx.fillStyle = '#000';
        vCtx.fillRect(-5, -5, layoutW + 10, layoutH + 10);
        vCtx.globalAlpha = 1;
        if (isScreensaverActive) return;
      }

      const time = performance.now() * 0.001;
      portalFrameParity ^= 1;
      if (lastPortalTime === 0) lastPortalTime = time;
      const dtReal = Math.min(time - lastPortalTime, 0.033);
      lastPortalTime = time;

      timeDilation += (1.0 - timeDilation) * dtReal * 3.2;
      const dt = dtReal * timeDilation;
      
      M.vx *= 0.82;
      M.vy *= 0.82;
      
      // Grain timer update
      grainTmr += dt;
      if (grainTmr > 0.09) {
        refreshGrain();
        grainTmr = 0;
      }

      // Actualizar cursor suavizado SM en cada frame (persigue M con inercia 10%)
      if (M.x > -5000) {
        if (SM.x <= -5000) { SM.x = M.x; SM.y = M.y; }
        SM.x += (M.x - SM.x) * 0.10;
        SM.y += (M.y - SM.y) * 0.10;
      }

      const maxRadius = Math.min(viewportW, viewportH) * 0.5;
      const maxR = maxRadius;
      
      // Keep the settled field just outside the portal with a subtle 7.5s breath.
      const currentMaxR = getPortalFieldRadius(maxR, progress, time);

      // Inicialización rápida de datos del Flat Array
      if (!particlesInitialized) {
        for (let i = 0; i < maxPortalParticles; i++) {
          resetParticle(i, viewportW, viewportH, progress, true);
        }
        particlesInitialized = true;
      }

      const centerX = canvasW / 2;
      const centerY = canvasH / 2;

      // --- A. VEIL GRID BACKGROUND RENDER (Sweep + Flash) ---
      if (vCtx && veilInitialized && totalGridNodes > 0) {
        const progressGrid = Math.min(1.0, Math.max(0.0, (progress - 0.75) / 0.25));
        const gridGlobalAlpha = progressGrid;

        if (mapCenterX === 0) {
          updateMapCenter();
        }
        const CX = mapCenterX || (layoutW / 2);
        const CY = mapCenterY || (layoutH / 2);

        if (gridGlobalAlpha > 0.001) {
          const maxDist = Math.max(
            Math.sqrt(CX * CX + CY * CY),
            Math.sqrt((layoutW - CX) * (layoutW - CX) + CY * CY),
            Math.sqrt(CX * CX + (layoutH - CY) * (layoutH - CY)),
            Math.sqrt((layoutW - CX) * (layoutW - CX) + (layoutH - CY) * (layoutH - CY))
          ) || 1;
          const d60 = dt * 60;
          const bhRadius = Math.min(layoutW, layoutH) * 0.28;
          // Trail force is meaningful only while the gesture is fresh. Sleeping
          // stale samples removes tens of thousands of square roots per frame at
          // rest without changing the visible pointer reaction.
          const activeTrailCount = time - lastInteract < 0.9 ? trCount : 0;
          // Agujero negro dinámico: sigue al cursor de forma instantánea
          bhX = M.x > -5000 ? M.x : CX;
          bhY = M.y > -5000 ? M.y : CY;

          {
            // Full reference cloth physics remains active at rest. This is the
            // signature fluidity of the standalone VEIL; adaptive secondary
            // density still protects slower GPUs through qMult.
            for (let i = 0; i < totalGridNodes; i++) {
              const nVal = fbm(ghx[i] * 0.005 + time * 0.28, ghy[i] * 0.005 + time * 0.18);
              const wave = Math.sin(ghx[i] * 0.012 + time * 1.2) * 4 + (nVal * 14 - 7) + Math.sin((ghx[i] + ghy[i]) * 0.006 + time * 0.45) * 1.5;
              const tgX = ghx[i];
              const tgY = ghy[i] + wave;
              
              gvx[i] += (tgX - gx[i]) * 0.065 * d60 - gvx[i] * 0.18 * d60;
              gvy[i] += (tgY - gy[i]) * 0.065 * d60 - gvy[i] * 0.18 * d60;

              // Black hole gravity - pull toward portal center (CX, CY)
              const gdx = gx[i] - bhX;
              const gdy = gy[i] - bhY;
              const gd = Math.sqrt(gdx * gdx + gdy * gdy);
              if (gd > 5 && gd < bhRadius) {
                const gStr = 0.35 * Math.pow(1 - gd / bhRadius, 1.5);
                gvx[i] -= (gdx / gd) * gStr * d60;
                gvy[i] -= (gdy / gd) * gStr * d60;
              }

              // Gravitational lensing
              if (gd > 10 && gd < bhRadius * 0.7) {
                const lensFactor = 0.12 * Math.pow(1 - gd / (bhRadius * 0.7), 2);
                const tx = -gdy / gd;
                const ty = gdx / gd;
                gvx[i] += tx * lensFactor * d60;
                gvy[i] += ty * lensFactor * d60;
              }

              // Mouse repulsion & Gravity well
              if (M.x > -5000) {
                const mdx = gx[i] - M.x;
                const mdy = gy[i] - M.y;
                const md = Math.sqrt(mdx * mdx + mdy * mdy);
                if (md < SPHERE_R) {
                  const normD = md / SPHERE_R;
                  const sphereZ = Math.sqrt(1 - normD * normD) * SPHERE_R * 0.8;
                  pz[i] -= sphereZ * 0.08;
                  const slope = normD / Math.sqrt(1 - normD * normD + 0.01);
                  const pushStr = slope * 0.8 * (1 - normD);
                  gvx[i] += mdx / (md + 1) * pushStr * d60;
                  gvy[i] += mdy / (md + 1) * pushStr * d60;
                  if (Math.abs(M.vx) > 0.5 || Math.abs(M.vy) > 0.5) {
                    gvx[i] += M.vx * (1 - normD) * 0.04 * d60;
                    gvy[i] += M.vy * (1 - normD) * 0.04 * d60;
                  }
                } else if (md < SPHERE_R * 3.5) {
                  // Cursor gravity well — subtle pull from far away
                  const pullStr = 0.015 * (1 - md / (SPHERE_R * 3.5));
                  gvx[i] -= mdx / (md + 1) * pullStr * d60;
                  gvy[i] -= mdy / (md + 1) * pullStr * d60;
                }
              }

              // Touch points repulsion
              for (let t = 0; t < touchPts.length; t++) {
                const tp = touchPts[t];
                const tdx = gx[i] - tp.x;
                const tdy = gy[i] - tp.y;
                const td = Math.sqrt(tdx * tdx + tdy * tdy);
                if (td < SPHERE_R) {
                  const tn = td / SPHERE_R;
                  const tsZ = Math.sqrt(1 - tn * tn) * SPHERE_R * 0.8;
                  pz[i] -= tsZ * 0.06;
                  const tsl = tn / Math.sqrt(1 - tn * tn + 0.01);
                  const tps = tsl * 0.7 * (1 - tn);
                  gvx[i] += tdx / (td + 1) * tps * d60;
                  gvy[i] += tdy / (td + 1) * tps * d60;
                }
              }

              // Cursor trail repulsion (gentle)
              for (let t = 0; t < activeTrailCount; t++) {
                const idx = ((trHead - 1 - t) + TRAIL_N) % TRAIL_N;
                const str = (1 - t / activeTrailCount) * 0.35;
                const tdx = gx[i] - trX[idx];
                const tdy = gy[i] - trY[idx];
                const td = Math.sqrt(tdx * tdx + tdy * tdy);
                if (td < 75) {
                  const tf = (1 - td / 75) * str;
                  gvx[i] += tdx / (td + 1) * tf * 0.6 * d60;
                  gvy[i] += tdy / (td + 1) * tf * 0.6 * d60;
                }
              }

              gx[i] += gvx[i] * d60;
              gy[i] += gvy[i] * d60;
            }

            // Cloth constraints
            const restSq = (SP * 1.35) * (SP * 1.35);
            for (let i = 0; i < totalGridNodes; i++) {
              if ((i + 1) % gridCols !== 0 && i + 1 < totalGridNodes) {
                const j = i + 1;
                const dx = gx[j] - gx[i];
                const dy = gy[j] - gy[i];
                const dSq = dx * dx + dy * dy;
                if (dSq > restSq) {
                  const d = Math.sqrt(dSq);
                  const c = (d - SP) * 0.012;
                  const nx = dx / d;
                  const ny = dy / d;
                  gx[i] += nx * c;
                  gy[i] += ny * c;
                  gx[j] -= nx * c;
                  gy[j] -= ny * c;
                }
              }
              if (i + gridCols < totalGridNodes) {
                const j = i + gridCols;
                const dx = gx[j] - gx[i];
                const dy = gy[j] - gy[i];
                const dSq = dx * dx + dy * dy;
                if (dSq > restSq) {
                  const d = Math.sqrt(dSq);
                  const c = (d - SP) * 0.012;
                  const nx = dx / d;
                  const ny = dy / d;
                  gx[i] += nx * c;
                  gy[i] += ny * c;
                  gx[j] -= nx * c;
                  gy[j] -= ny * c;
                }
              }
            }
          }

          // Cursor electricity belongs to the network: recurrent energy packets travel
          // through existing lattice nodes instead of being drawn as detached lines.
          let electroEdgeX = CX;
          let electroEdgeY = CY;
          let electroLength = 0;
          let electroDx = 0;
          let electroDy = 0;
          if (M.x > -5000) {
            const cursorDx = M.x - CX;
            const cursorDy = M.y - CY;
            const cursorDistance = Math.sqrt(cursorDx * cursorDx + cursorDy * cursorDy);
            const attractionBand = Math.max(92, currentMaxR * 0.52);
            const proximity = 1 - Math.min(1, Math.abs(cursorDistance - currentMaxR) / attractionBand);
            cursorCharge += (proximity - cursorCharge) * 0.14;
            if (cursorDistance > 0.001) {
              electroEdgeX = CX + cursorDx / cursorDistance * currentMaxR * 0.96;
              electroEdgeY = CY + cursorDy / cursorDistance * currentMaxR * 0.96;
              electroDx = M.x - electroEdgeX;
              electroDy = M.y - electroEdgeY;
              electroLength = Math.sqrt(electroDx * electroDx + electroDy * electroDy);
            }
          } else {
            cursorCharge *= 0.86;
          }

          const electroPulse = (time * 1.35) % 1;
          const electroWidth = SP * (1.35 + cursorCharge * 0.65);

          // Energy lattice
          eTmp.fill(0);
          for (let i = 0; i < totalGridNodes; i++) {
            const disp = Math.sqrt((gx[i] - ghx[i]) * (gx[i] - ghx[i]) + (gy[i] - ghy[i]) * (gy[i] - ghy[i]));
            energy[i] = Math.max(energy[i], disp * 0.04);
            // Every node belongs to one electrical field. Three incommensurate waves
            // create recurrent current over the full network without extra geometry.
            const fieldPhase =
              ghx[i] * 0.011 +
              ghy[i] * 0.008 -
              time * 2.35 +
              fastPortalSin(ghy[i] * 0.004 + time * 0.31) * 1.7;
            const carrier = 0.5 + 0.5 * fastPortalSin(fieldPhase);
            const secondary = 0.5 + 0.5 * fastPortalCos(ghx[i] * 0.005 - ghy[i] * 0.009 + time * 1.17);
            const ambientCurrent = 0.055 + Math.pow(carrier, 12) * (0.32 + secondary * 0.24);
            energy[i] = Math.max(energy[i], ambientCurrent);

            if (cursorCharge > 0.035 && electroLength > 1) {
              const relX = gx[i] - electroEdgeX;
              const relY = gy[i] - electroEdgeY;
              const along = (relX * electroDx + relY * electroDy) / (electroLength * electroLength);
              if (along >= -0.04 && along <= 1.04) {
                const cross = Math.abs(relX * electroDy - relY * electroDx) / electroLength;
                const pulseDistance = Math.abs(along - electroPulse);
                const wrappedDistance = Math.min(pulseDistance, 1 - pulseDistance);
                const packet = Math.max(0, 1 - wrappedDistance / 0.18);
                const lane = Math.max(0, 1 - cross / electroWidth);
                const cursorPacket = packet * packet * lane * cursorCharge;
                energy[i] = Math.max(energy[i], cursorPacket * 2.8);
              }
            }
            eTmp[i] += energy[i] * 0.82;
            const sp = energy[i] * 0.035;
            if ((i + 1) % gridCols !== 0 && i + 1 < totalGridNodes) eTmp[i + 1] += sp;
            if (i % gridCols !== 0 && i - 1 >= 0) eTmp[i - 1] += sp;
            if (i + gridCols < totalGridNodes) eTmp[i + gridCols] += sp;
            if (i - gridCols >= 0) eTmp[i - gridCols] += sp;
          }
          for (let i = 0; i < totalGridNodes; i++) {
            energy[i] = Math.min(eTmp[i], 3);
          }

          // Integrate reactive wave physics before rendering.
          for (let i = waves.length - 1; i >= 0; i--) {
            const wave = waves[i];
            wave.r += wave.spd * dt;
            if (wave.r <= 0) continue;
            wave.life = Math.max(0, 1 - wave.r / wave.maxR);
            if (wave.life <= 0) {
              waves.splice(i, 1);
              continue;
            }

            // The wave is the network itself: displace only nodes crossing its front.
            const band = 24;
            const inner = Math.max(0, wave.r - band);
            const outer = wave.r + band;
            const innerSq = inner * inner;
            const outerSq = outer * outer;
            for (let node = 0; node < totalGridNodes; node++) {
              const dx = gx[node] - wave.x;
              const dy = gy[node] - wave.y;
              const distanceSq = dx * dx + dy * dy;
              if (distanceSq <= innerSq || distanceSq >= outerSq) continue;
              const inverseDistance = 1 / Math.sqrt(distanceSq + 1);
              const impulse = wave.str * wave.life * 0.085;
              gvx[node] += dx * inverseDistance * impulse;
              gvy[node] += dy * inverseDistance * impulse;
              energy[node] = Math.max(energy[node], wave.life * 2.2);
            }
          }
          for (let i = pulses.length - 1; i >= 0; i--) {
            const pulse = pulses[i];
            pulse.r += pulse.spd * dt;
            pulse.life = Math.max(0, 1 - pulse.r / pulse.maxR);
            if (pulse.life <= 0) pulses.splice(i, 1);
          }

          // Auto heartbeat + stochastic
          if (time - lastInteract > 4.5 && time - lastBeat > 4.2) {
            const rx = Math.random() > 0.4 ? CX : Math.random() * layoutW;
            const ry = Math.random() > 0.4 ? CY : Math.random() * layoutH;
            spawnWave(rx, ry, 3 + Math.random() * 2, Math.max(layoutW, layoutH) * 0.5, 350 + Math.random() * 100);
            lastBeat = time;
          }

          // Auto black-hole pulses
          if (time > nextPulseT) {
            spawnPulse(bhX, bhY, 0.3 + Math.random() * 0.3);
            nextPulseT = time + 3 + Math.random() * 5;
          }

          // Auto arcs
          if (time > nextArcT) {
            spawnArc();
            nextArcT = time + 0.5 + Math.random() * 2;
          }

          // Auto constellations
          if (time > nextConstT) {
            spawnConstellation();
            nextConstT = time + 2 + Math.random() * 4;
          }

          // Flares & Fracture flashes & Color storm
          if (time > nextFlareT) {
            const n = 1 + Math.floor(Math.random() * 2);
            for (let f = 0; f < n; f++) {
              const idx = Math.floor(Math.random() * totalGridNodes);
              flare[idx] = 1;
              energy[idx] = Math.max(energy[idx], 2);
            }
            nextFlareT = time + 1.5 + Math.random() * 3;
          }
          for (let i = 0; i < totalGridNodes; i++) {
            if (flare[i] > 0.01) flare[i] *= (1 - dt * 5); else flare[i] = 0;
          }

          if (time > nextFractT) {
            const idx = Math.floor(Math.random() * totalGridNodes);
            fracture[idx] = 1;
            nextFractT = time + 2 + Math.random() * 5;
          }
          for (let i = 0; i < totalGridNodes; i++) {
            if (fracture[i] > 0.01) fracture[i] *= (1 - dt * 4); else fracture[i] = 0;
          }

          if (stormX < 0 && time > nextStormT) {
            stormX = -50;
            stormSpd = 280 + Math.random() * 220;
            stormHue = 15 + Math.random() * 35;
            nextStormT = time + 12 + Math.random() * 15;
          }
          if (stormX >= 0) {
            stormX += stormSpd * dt;
            if (stormX > layoutW + 200) stormX = -1;
          }

          // Tick arcs & constellations
          for (let i = arcs.length - 1; i >= 0; i--) {
            arcs[i].life -= dt;
            if (arcs[i].life <= 0) arcs.splice(i, 1);
          }
          for (let i = constellations.length - 1; i >= 0; i--) {
            constellations[i].life -= dt;
            if (constellations[i].life <= 0) constellations.splice(i, 1);
          }

          // 3D perspective + parallax + time dilation (tilted based on mouse)
          const tiltX = M.x > -5000 ? (M.x - CX) / layoutW : 0;
          const tiltY = M.y > -5000 ? (M.y - CY) / layoutH : 0;
          const vpX = CX + (M.x > -5000 ? (M.x - CX) * 0.05 : 0);
          const vpY = CY + (M.y > -5000 ? (M.y - CY) * 0.05 : 0);
          for (let i = 0; i < totalGridNodes; i++) {
            const baseZ = Math.sin(ghx[i] * 0.008 + time * 0.65) * 22 + Math.cos(ghy[i] * 0.01 + time * 0.45) * 16;
            const dBH = Math.sqrt((gx[i] - bhX) * (gx[i] - bhX) + (gy[i] - bhY) * (gy[i] - bhY));
            const dilate = dBH < bhRadius ? Math.max(0.3, dBH / bhRadius) : 1;
            
            // 3D tilt offset
            const tiltZ = (gx[i] - CX) * tiltX * 0.015 + (gy[i] - CY) * tiltY * 0.015;
            
            pz[i] = pz[i] * 0.85 + (baseZ * dilate + tiltZ) * 0.15;
            const s = FOV / (FOV + pz[i]);
            sx_[i] = vpX + (gx[i] - vpX) * s;
            sy_[i] = vpY + (gy[i] - vpY) * s;
            // Gravitational screen-space lens: the mesh itself bends around the aperture,
            // so the portal reads as a force field instead of a ring drawn on top.
            const lensDx = sx_[i] - CX;
            const lensDy = sy_[i] - CY;
            const lensDist = Math.sqrt(lensDx * lensDx + lensDy * lensDy) || 1;
            const edgeDistance = Math.abs(lensDist - currentMaxR);
            const lensBand = Math.max(48, currentMaxR * 0.28);
            const edgeField = Math.max(0, 1 - edgeDistance / lensBand);
            if (edgeField > 0.001) {
              const edgeCurve = edgeField * edgeField * (3 - 2 * edgeField);
              const radialPull = (currentMaxR - lensDist) * 0.045 * edgeCurve;
              const orbitSlip = Math.sin(time * 0.85 + lensDist * 0.018) * edgeCurve * 3.2;
              sx_[i] += (lensDx / lensDist) * radialPull + (-lensDy / lensDist) * orbitSlip;
              sy_[i] += (lensDy / lensDist) * radialPull + (lensDx / lensDist) * orbitSlip;
            }
            ss_[i] = s;
          }

          // Tick ambient dust & embers - with BH absorption
          for (let i = 0; i < DUST_N; i++) {
            // BH gravity on dust
            const ddx = dustX[i] - bhX;
            const ddy = dustY[i] - bhY;
            const dd = Math.sqrt(ddx * ddx + ddy * ddy);
            if (dd < bhRadius * 0.6 && dd > 5) {
              const pull = 0.8 * Math.pow(1 - dd / (bhRadius * 0.6), 2);
              dustVx[i] -= (ddx / dd) * pull;
              dustVy[i] -= (ddy / dd) * pull;
              // Tangential orbit drift
              dustVx[i] += (-ddy / dd) * pull * 0.4;
              dustVy[i] += (ddx / dd) * pull * 0.4;
            }
            if (dd < 12) {
              resetDust(i, false);
              continue; // Absorbed!
            }
            dustX[i] += dustVx[i] * dt * 3;
            dustY[i] += dustVy[i] * dt * 3;
            dustVx[i] += Math.sin(dustY[i] * 0.005 + time) * dt * 1.5;
            dustVy[i] += Math.cos(dustX[i] * 0.004 + time * 0.7) * dt - dt * 0.5;
            if (dustX[i] < -15 || dustX[i] > layoutW + 15 || dustY[i] < -15 || dustY[i] > layoutH + 15) {
              resetDust(i, false);
            }
          }

          const emLim = Math.ceil(EMBER_N * qMult);
          for (let i = 0; i < emLim; i++) {
            emLife[i] += dt;
            if (emLife[i] > emMax[i]) {
              resetEmber(i, false);
              continue;
            }
            emVx[i] += Math.sin(emY[i] * 0.009 + time * 1.8) * dt * 2.5;
            emVy[i] += Math.cos(emX[i] * 0.007 + time * 1.3) * dt * 1.5 - dt * 3;
            emX[i] += emVx[i] * dt * 20;
            emY[i] += emVy[i] * dt * 20;
            if (emX[i] < -20) emX[i] = layoutW + 20;
            if (emX[i] > layoutW + 20) emX[i] = -20;
            if (emY[i] < -20 || emY[i] > layoutH + 20) resetEmber(i, false);
          }

          // Tick sparks & connection sparks
          for (let i = spkLen - 1; i >= 0; i--) {
            spkLife[i] += dt;
            spkX[i] += spkVx[i] * dt;
            spkY[i] += spkVy[i] * dt;
            spkVx[i] *= 0.97;
            spkVy[i] *= 0.97;
            spkVy[i] += 120 * dt;
            if (spkLife[i] > spkMax[i]) {
              spkLen--;
              spkX[i] = spkX[spkLen];
              spkY[i] = spkY[spkLen];
              spkVx[i] = spkVx[spkLen];
              spkVy[i] = spkVy[spkLen];
              spkLife[i] = spkLife[spkLen];
              spkMax[i] = spkMax[spkLen];
            }
          }

          cspTimer += dt;
          if (cspTimer > 0.25) {
            cspTimer = 0;
            for (let i = 0; i < totalGridNodes && cspLen < MAX_CSPK; i++) {
              if (energy[i] < 0.8) continue;
              if ((i + 1) % gridCols !== 0 && i + 1 < totalGridNodes && energy[i + 1] > 0.5 && Math.random() < 0.25) {
                cspX[cspLen] = (sx_[i] + sx_[i + 1]) * 0.5;
                cspY[cspLen] = (sy_[i] + sy_[i + 1]) * 0.5;
                cspLife[cspLen] = 0.3 + Math.random() * 0.2;
                cspLen++;
              }
            }
          }
          for (let i = cspLen - 1; i >= 0; i--) {
            cspLife[i] -= dt;
            if (cspLife[i] <= 0) {
              cspLen--;
              cspX[i] = cspX[cspLen];
              cspY[i] = cspY[cspLen];
              cspLife[i] = cspLife[cspLen];
            }
          }

          // Refresh-aware quality tracking. Preserve VEIL's motion on 60, 90,
          // 120 and 144 Hz panels instead of treating every display as 60 Hz.
          const nowMs = performance.now();
          fpsFrames++;
          if (nowMs - fpsLast > 1000) {
            curFps = fpsFrames;
            fpsFrames = 0;
            fpsLast = nowMs;
            peakFps = Math.max(peakFps * 0.985, curFps);
            const refreshTarget = Math.max(55, Math.min(144, peakFps));
            const cadenceRatio = curFps / refreshTarget;
            if (cadenceRatio < 0.72) {
              qMult = Math.max(0.5, qMult - 0.12);
            } else if (cadenceRatio > 0.9 && qMult < 1) {
              qMult = Math.min(1, qMult + 0.06);
            }
            if (veilCanvas) {
              veilCanvas.dataset.veilFps = String(curFps);
              veilCanvas.dataset.veilQuality = qMult >= 0.9 ? "ultra" : (qMult >= 0.7 ? "high" : "balanced");
            }
          }

          // Activation depends only on fold progress and static home distance.
          // Cache the settled state instead of recalculating every node forever.
          if (Math.abs(progressGrid - lastActivationProgress) > 0.001) {
            for (let i = 0; i < totalGridNodes; i++) {
              const activationPct = gDist[i] / maxDist;
              pProgress[i] = Math.max(0.0, Math.min(1.0, (progressGrid - activationPct) / 0.12));
            }
            lastActivationProgress = progressGrid;
          }

          // ── RENDERING ON vCtx ──
          const dpr = getVeilDpr();
          vCtx.save();
          vCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
          
          // Canvas shake
          if (shakeI > 0) {
            vCtx.translate(shakeX, shakeY);
          }
          
          // Color temperature calculation
          const tempTarget = time - lastInteract < 2 ? 0.6 : 0;
          colorTemp += (tempTarget - colorTemp) * dt * 2;

          vCtx.globalCompositeOperation = 'lighter';

          // 2. Nebula Fog (behind everything)
          if (nebC && qMult > 0.6) {
            vCtx.globalAlpha = (0.04 + Math.sin(time * 0.3) * 0.01) * gridGlobalAlpha;
            vCtx.drawImage(nebC, 0, 0, layoutW, layoutH);
          }

          // 3. Black Hole behind grid
          const bhPulse = 0.7 + Math.sin(time * 0.4) * 0.15 + Math.sin(time * 1.1) * 0.08;
          vCtx.globalAlpha = bhPulse * gridGlobalAlpha;
          vCtx.drawImage(bhC, bhX - bhSize / 2, bhY - bhSize / 2, bhSize, bhSize);

          // Anamorphic horizontal streak
          const streakW = Math.min(layoutW, layoutH) * 0.6;
          const streakH = 2;
          vCtx.globalAlpha = (0.12 + Math.sin(time * 0.7) * 0.04) * gridGlobalAlpha;
          const sg = vCtx.createLinearGradient(bhX - streakW / 2, bhY, bhX + streakW / 2, bhY);
          sg.addColorStop(0, 'rgba(0,0,0,0)');
          sg.addColorStop(0.2, 'rgba(255,200,80,0.15)');
          sg.addColorStop(0.5, 'rgba(255,240,180,0.4)');
          sg.addColorStop(0.8, 'rgba(255,200,80,0.15)');
          sg.addColorStop(1, 'rgba(0,0,0,0)');
          vCtx.fillStyle = sg;
          vCtx.fillRect(bhX - streakW / 2, bhY - streakH, streakW, streakH * 2);
          vCtx.globalAlpha = 0.06 * gridGlobalAlpha;
          vCtx.fillRect(bhX - streakW / 2, bhY - streakH * 3, streakW, streakH * 6);

          // 4. Event Horizon Ring
          const ehR = Math.min(layoutW, layoutH) * 0.055;
          const ehPulse = 0.3 + Math.sin(time * 1.7) * 0.1 + Math.sin(time * 3.1) * 0.05;
          vCtx.globalAlpha = ehPulse * gridGlobalAlpha;
          vCtx.strokeStyle = 'rgba(255,220,100,0.6)';
          vCtx.lineWidth = 0.8;
          vCtx.beginPath();
          vCtx.arc(bhX, bhY, ehR, 0, 6.283);
          vCtx.stroke();
          
          vCtx.globalAlpha = ehPulse * 0.4 * gridGlobalAlpha;
          vCtx.strokeStyle = 'rgba(255,180,50,0.4)';
          vCtx.lineWidth = 2;
          vCtx.beginPath();
          vCtx.arc(bhX, bhY, ehR * 1.15, 0, 6.283);
          vCtx.stroke();

          // Magnetic field flow lines
          vCtx.globalAlpha = 0.06 * gridGlobalAlpha;
          vCtx.strokeStyle = 'rgba(139,92,246,0.5)';
          vCtx.lineWidth = 0.3;
          for (let fl = 0; fl < 8; fl++) {
            const fOff = (6.283 / 8) * fl + time * 0.08;
            vCtx.beginPath();
            for (let a = 0; a < 3.14; a += 0.06) {
              const r = ehR * 1.8 + a * 30;
              const fx = bhX + Math.cos(fOff + a * 0.8) * r;
              const fy = bhY + Math.sin(fOff + a * 0.8) * r * 0.5;
              if (a < 0.06) vCtx.moveTo(fx, fy); else vCtx.lineTo(fx, fy);
            }
            vCtx.stroke();
          }

          // 5. Lens Flare starburst on BH core
          if (lensC) {
            const lfRot = time * 0.15;
            vCtx.save();
            vCtx.translate(bhX, bhY);
            vCtx.rotate(lfRot);
            const lfPulse = 0.3 + Math.sin(time * 1.3) * 0.15;
            vCtx.globalAlpha = lfPulse * gridGlobalAlpha;
            vCtx.drawImage(lensC, -64, -64, 128, 128);
            vCtx.restore();
          }

          // 6. BH Orbiting micro-particles
          for (let i = 0; i < BH_ORB_N; i++) {
            orbA[i] += orbSpd[i] * dt;
            const ox = bhX + Math.cos(orbA[i]) * orbR[i];
            const oy = bhY + Math.sin(orbA[i]) * orbR[i] * 0.4;
            vCtx.globalAlpha = orbAl[i] * bhPulse * 0.8 * gridGlobalAlpha;
            vCtx.fillStyle = 'rgba(255,210,80,0.9)';
            vCtx.fillRect(ox - 0.5, oy - 0.5, orbSz[i], orbSz[i]);
            
            const trailX = bhX + Math.cos(orbA[i] - orbSpd[i] * 0.1) * orbR[i];
            const trailY = bhY + Math.sin(orbA[i] - orbSpd[i] * 0.1) * orbR[i] * 0.4;
            vCtx.globalAlpha = orbAl[i] * 0.3 * gridGlobalAlpha;
            vCtx.beginPath();
            vCtx.moveTo(ox, oy);
            vCtx.lineTo(trailX, trailY);
            vCtx.strokeStyle = 'rgba(255,200,60,0.5)';
            vCtx.lineWidth = 0.2;
            vCtx.stroke();
          }

          // 8. Accretion Disk
          drawAccretionDisk(bhX, bhY, time);

          // 9. Mouse glow / aurora
          if (SM.x > -5000) {
            const curSpd = Math.sqrt(M.vx * M.vx + M.vy * M.vy);
            const auroraStr = Math.min(curSpd * 0.04, 0.5);
            vCtx.globalAlpha = (0.72 + auroraStr * 0.3) * gridGlobalAlpha;
            vCtx.drawImage(glowC, SM.x - 170, SM.y - 170, 340, 340);
            if (curSpd > 2) {
              const aR = 20 + curSpd * 2;
              vCtx.globalAlpha = auroraStr * 0.4 * gridGlobalAlpha;
              vCtx.strokeStyle = 'hsl(' + (280 + curSpd * 3 | 0) + ',70%,70%)';
              vCtx.lineWidth = 0.4;
              vCtx.beginPath();
              vCtx.arc(SM.x, SM.y, aR, 0, 6.283);
              vCtx.stroke();
            }
          }

          // 10. Metatron
          metaPulse *= (1 - dt * 3);
          if (metaPulse < 0.005) metaPulse = 0;
          sgA = Math.min(0.18, time * 0.045);
          sgR += dt * 0.12;
          drawMeta(CX, CY, Math.min(layoutW, layoutH) * 0.22, sgA, sgR, metaPulse);

          // 11. Constellations connections
          for (const cn of constellations) {
            const t = cn.life / cn.maxLife;
            const fadeIn = Math.min(t * 5, 1);
            const fadeOut = t < 0.3 ? t / 0.3 : 1;
            const al = fadeIn * fadeOut * 0.12 * gridGlobalAlpha;
            vCtx.globalAlpha = al;
            vCtx.strokeStyle = 'rgba(167,139,250,0.6)';
            vCtx.lineWidth = 0.3;
            vCtx.setLineDash([4, 8]);
            vCtx.beginPath();
            for (let j = 0; j < cn.pts.length - 1; j++) {
              if (pProgress[cn.pts[j]] > 0.001 && pProgress[cn.pts[j + 1]] > 0.001) {
                vCtx.moveTo(sx_[cn.pts[j]], sy_[cn.pts[j]]);
                vCtx.lineTo(sx_[cn.pts[j + 1]], sy_[cn.pts[j + 1]]);
              }
            }
            vCtx.stroke();
            vCtx.setLineDash([]);
            for (const pt of cn.pts) {
              if (pProgress[pt] > 0.001) {
                vCtx.globalAlpha = al * 2;
                vCtx.fillStyle = 'rgba(200,180,255,0.8)';
                vCtx.fillRect(sx_[pt] - 1.5, sy_[pt] - 1.5, 3, 3);
              }
            }
            const travelPos = (1 - (cn.life / cn.maxLife)) * cn.pts.length;
            const travelIdx = Math.min(cn.pts.length - 2, Math.floor(travelPos));
            const travelFrac = travelPos - travelIdx;
            if (travelIdx >= 0 && travelIdx < cn.pts.length - 1) {
              const pt1 = cn.pts[travelIdx];
              const pt2 = cn.pts[travelIdx + 1];
              if (pProgress[pt1] > 0.001 && pProgress[pt2] > 0.001) {
                const tlx = sx_[pt1] * (1 - travelFrac) + sx_[pt2] * travelFrac;
                const tly = sy_[pt1] * (1 - travelFrac) + sy_[pt2] * travelFrac;
                vCtx.globalAlpha = fadeIn * fadeOut * 0.6 * gridGlobalAlpha;
                vCtx.fillStyle = 'rgba(255,240,255,0.9)';
                vCtx.fillRect(tlx - 1.5, tly - 1.5, 3, 3);
                if (sdfDot) {
                  vCtx.globalAlpha = fadeIn * fadeOut * 0.3 * gridGlobalAlpha;
                  vCtx.drawImage(sdfDot, tlx - 8, tly - 8, 16, 16);
                }
              }
            }
          }

          // 12. Grid lines Far/Near (Reused arrays, no allocation)
          nearLines.length = 0;
          farLines.length = 0;
          const latticeDirector = getPortalDirector(time, cursorCharge);
          const coherentPortal = latticeDirector.mode === "coherent";
          const breathe = coherentPortal
            ? 1 + latticeDirector.breathe * 0.055
            : Math.sin(time * 0.55) * 0.08 + Math.sin(time * 0.23) * 0.05 + 1;
          const electricGain = coherentPortal
            ? 0.72 + latticeDirector.energy * 0.38
            : 1;
          const maxD = SP * 1.7;
          const maxDSq = maxD * maxD;

          for (let i = 0; i < totalGridNodes; i++) {
            if (pProgress[i] <= 0.001) continue;
            if ((i + 1) % gridCols !== 0 && i + 1 < totalGridNodes && pProgress[i + 1] > 0.001) {
              const j = i + 1;
              const dx = sx_[i] - sx_[j];
              const dy = sy_[i] - sy_[j];
              if (dx * dx + dy * dy < maxDSq) {
                const avgS = ss_[i];
                const bucket = avgS > 0.99 ? nearLines : farLines;
                bucket.push(sx_[i], sy_[i], sx_[j], sy_[j]);
              }
            }
            if (i + gridCols < totalGridNodes && pProgress[i + gridCols] > 0.001) {
              const j = i + gridCols;
              const dx = sx_[i] - sx_[j];
              const dy = sy_[i] - sy_[j];
              if (dx * dx + dy * dy < maxDSq) {
                const avgS = ss_[i];
                const bucket = avgS > 0.99 ? nearLines : farLines;
                bucket.push(sx_[i], sy_[i], sx_[j], sy_[j]);
              }
            }
          }

          if (farLines.length > 0) {
            vCtx.lineWidth = 0.25;
            vCtx.beginPath();
            for (let k = 0; k < farLines.length; k += 4) {
              vCtx.moveTo(farLines[k], farLines[k + 1]);
              vCtx.lineTo(farLines[k + 2], farLines[k + 3]);
            }
            vCtx.globalAlpha = 0.12 * breathe * gridGlobalAlpha;
            vCtx.strokeStyle = 'hsl(' + (248 + Math.sin(time * 0.2) * 6 + colorTemp * 12 | 0) + ',55%,' + (48 + colorTemp * 4 | 0) + '%)';
            vCtx.stroke();
          }

          if (nearLines.length > 0) {
            vCtx.lineWidth = 0.3;
            vCtx.beginPath();
            for (let k = 0; k < nearLines.length; k += 4) {
              vCtx.moveTo(nearLines[k], nearLines[k + 1]);
              vCtx.lineTo(nearLines[k + 2], nearLines[k + 3]);
            }
            vCtx.globalAlpha = 0.2 * breathe * gridGlobalAlpha;
            vCtx.strokeStyle = 'hsl(' + (268 + Math.sin(time * 0.3) * 8 + colorTemp * 10 | 0) + ',60%,' + (58 + colorTemp * 5 | 0) + '%)';
            vCtx.stroke();
          }

          // 13. Highlight connections
          vCtx.beginPath();
          let hlN = 0;
          for (let i = 0; i < totalGridNodes; i++) {
            if (pProgress[i] <= 0.001) continue;
            const mdx = sx_[i] - M.x;
            const mdy = sy_[i] - M.y;
            if (mdx * mdx + mdy * mdy > 40000) continue;
            if ((i + 1) % gridCols !== 0 && i + 1 < totalGridNodes && pProgress[i + 1] > 0.001) {
              vCtx.moveTo(sx_[i], sy_[i]);
              vCtx.lineTo(sx_[i + 1], sy_[i + 1]);
              hlN++;
            }
            if (i + gridCols < totalGridNodes && pProgress[i + gridCols] > 0.001) {
              vCtx.moveTo(sx_[i], sy_[i]);
              vCtx.lineTo(sx_[i + gridCols], sy_[i + gridCols]);
              hlN++;
            }
          }
          if (hlN) {
            vCtx.globalAlpha = 0.22 * breathe * gridGlobalAlpha;
            vCtx.strokeStyle = 'hsl(275,68%,67%)';
            vCtx.lineWidth = 0.4;
            vCtx.stroke();
          }

          // Network-wide electricity, bucketed into three intensities so the current
          // reads inside the lattice instead of as another layer laid over it.
          electricLowLines.length = 0;
          electricMidLines.length = 0;
          electricHighLines.length = 0;
          for (let i = 0; i < totalGridNodes; i++) {
            if (pProgress[i] <= 0.001) continue;
            if ((i + 1) % gridCols !== 0 && i + 1 < totalGridNodes && pProgress[i + 1] > 0.001) {
              const j = i + 1;
              const edgeEnergy = (energy[i] + energy[j]) * 0.5;
              const bucket = edgeEnergy > 0.58 ? electricHighLines : (edgeEnergy > 0.2 ? electricMidLines : electricLowLines);
              bucket.push(sx_[i], sy_[i], sx_[j], sy_[j]);
            }
            if (i + gridCols < totalGridNodes && pProgress[i + gridCols] > 0.001) {
              const j = i + gridCols;
              const edgeEnergy = (energy[i] + energy[j]) * 0.5;
              const bucket = edgeEnergy > 0.58 ? electricHighLines : (edgeEnergy > 0.2 ? electricMidLines : electricLowLines);
              bucket.push(sx_[i], sy_[i], sx_[j], sy_[j]);
            }
          }
          const drawElectricBucket = (segments, alpha, width, color) => {
            if (!segments.length) return;
            vCtx.beginPath();
            for (let k = 0; k < segments.length; k += 4) {
              vCtx.moveTo(segments[k], segments[k + 1]);
              vCtx.lineTo(segments[k + 2], segments[k + 3]);
            }
            vCtx.globalAlpha = alpha * gridGlobalAlpha * electricGain;
            vCtx.strokeStyle = color;
            vCtx.lineWidth = width;
            vCtx.stroke();
          };
          drawElectricBucket(electricLowLines, 0.065, 0.24, 'rgba(126,92,220,0.76)');
          drawElectricBucket(electricMidLines, 0.2, 0.46, 'rgba(153,112,255,0.9)');
          if (electricHighLines.length) {
            vCtx.save();
            vCtx.globalCompositeOperation = 'lighter';
            drawElectricBucket(electricHighLines, 0.42, 0.72, 'rgba(211,199,255,0.98)');
            drawElectricBucket(electricHighLines, 0.08, 1.8, 'rgba(121,72,255,0.48)');
            vCtx.restore();
          }

          // 14. Electrical arcs
          for (const arc of arcs) {
            if (pProgress[arc.a] > 0.001 && pProgress[arc.b] > 0.001) {
              drawArc(arc);
            }
          }

          // 15. Tension glow
          vCtx.beginPath();
          let tensN = 0;
          for (let i = 0; i < totalGridNodes; i++) {
            if (pProgress[i] <= 0.001) continue;
            const disp = Math.sqrt((gx[i] - ghx[i]) * (gx[i] - ghx[i]) + (gy[i] - ghy[i]) * (gy[i] - ghy[i]));
            if (disp < 4) continue;
            if ((i + 1) % gridCols !== 0 && i + 1 < totalGridNodes && pProgress[i + 1] > 0.001) {
              const j = i + 1;
              const d2 = Math.sqrt((gx[j] - ghx[j]) * (gx[j] - ghx[j]) + (gy[j] - ghy[j]) * (gy[j] - ghy[j]));
              if (d2 > 3) {
                vCtx.moveTo(sx_[i], sy_[i]);
                vCtx.lineTo(sx_[j], sy_[j]);
                tensN++;
              }
            }
            if (i + gridCols < totalGridNodes && pProgress[i + gridCols] > 0.001) {
              const j = i + gridCols;
              const d2 = Math.sqrt((gx[j] - ghx[j]) * (gx[j] - ghx[j]) + (gy[j] - ghy[j]) * (gy[j] - ghy[j]));
              if (d2 > 3) {
                vCtx.moveTo(sx_[i], sy_[i]);
                vCtx.lineTo(sx_[j], sy_[j]);
                tensN++;
              }
            }
          }
          if (tensN) {
            vCtx.globalAlpha = 0.08 * gridGlobalAlpha;
            vCtx.strokeStyle = 'hsl(290,75%,78%)';
            vCtx.lineWidth = 0.25;
            vCtx.stroke();
          }

          // 16. Fracture flashes
          for (let i = 0; i < totalGridNodes; i++) {
            if (pProgress[i] <= 0.001 || fracture[i] < 0.05) continue;
            vCtx.globalAlpha = fracture[i] * 0.5 * gridGlobalAlpha;
            vCtx.fillStyle = '#fff';
            vCtx.fillRect(sx_[i] - 2, sy_[i] - 2, 4, 4);
          }

          // 17. Nodes - velocity morphing + depth-scaled size + BH shimmer + SDF glow
          for (const bucket of nodeRenderBuckets) bucket.length = 0;
          brightNodeGlows.length = 0;
          for (let i = 0; i < totalGridNodes; i++) {
            if (pProgress[i] <= 0.001) continue;
            const speed = Math.sqrt(gvx[i] * gvx[i] + gvy[i] * gvy[i]);
            const depthScale = 0.6 + ss_[i] * 0.6;
            const depthB = 0.4 + (ss_[i] - 0.95) * 4;
            const eB = Math.min(energy[i] * 0.3, 0.4);
            const fB = flare[i] * 1.5;
            let nAlpha = Math.min((depthB + eB + fB) * breathe, 1.0) * pProgress[i] * gridGlobalAlpha;
            const nSize = (1 + Math.min(speed * 0.25 + flare[i] * 2.5, 3.0)) * depthScale;

            const rx = (sx_[i] - CX) / (layoutW * 0.5);
            const ry = (sy_[i] - CY) / (layoutH * 0.5);
            let hue = 270 + rx * 8 + ry * 10;
            if (stormX >= 0) {
              const sd = Math.abs(sx_[i] - stormX);
              if (sd < 150) hue += stormHue * (1 - sd / 150);
            }

            const dCenter = Math.sqrt((sx_[i] - bhX) * (sx_[i] - bhX) + (sy_[i] - bhY) * (sy_[i] - bhY));
            const bhInfluence = Math.max(0, 1 - dCenter / (Math.min(layoutW, layoutH) * 0.18));
            if (bhInfluence > 0) {
              hue += (40 - hue % 360) * bhInfluence * 0.3;
              nAlpha *= (0.7 + Math.sin(time * 12 + i * 0.7) * 0.3 * bhInfluence);
            }

            const alphaBucket = Math.max(0, Math.min(3, Math.floor(nAlpha * 4)));
            nodeRenderBuckets[alphaBucket].push(sx_[i], sy_[i], Math.max(0.42, nSize * 0.52));
            const isBright = flare[i] > 0.05 || energy[i] > 0.6 || (((sx_[i] - M.x) ** 2 + (sy_[i] - M.y) ** 2) < 20000);
            if (isBright && sdfDot) {
              brightNodeGlows.push(sx_[i], sy_[i], nSize * 6, nAlpha * 0.5);
            }
          }

          // Soft halo pass, then crisp cores. This preserves the reference's
          // luminous round-node read while behaving like an instanced draw.
          vCtx.fillStyle = 'rgba(143,105,235,1)';
          for (let bucketIndex = 0; bucketIndex < nodeRenderBuckets.length; bucketIndex++) {
            const bucket = nodeRenderBuckets[bucketIndex];
            if (!bucket.length) continue;
            vCtx.beginPath();
            for (let k = 0; k < bucket.length; k += 3) {
              vCtx.moveTo(bucket[k] + bucket[k + 2] * 1.85, bucket[k + 1]);
              vCtx.arc(bucket[k], bucket[k + 1], bucket[k + 2] * 1.85, 0, 6.283);
            }
            vCtx.globalAlpha = (0.028 + bucketIndex * 0.018) * gridGlobalAlpha;
            vCtx.fill();
          }
          vCtx.fillStyle = 'rgba(219,210,255,1)';
          for (let bucketIndex = 0; bucketIndex < nodeRenderBuckets.length; bucketIndex++) {
            const bucket = nodeRenderBuckets[bucketIndex];
            if (!bucket.length) continue;
            vCtx.beginPath();
            for (let k = 0; k < bucket.length; k += 3) {
              vCtx.moveTo(bucket[k] + bucket[k + 2], bucket[k + 1]);
              vCtx.arc(bucket[k], bucket[k + 1], bucket[k + 2], 0, 6.283);
            }
            vCtx.globalAlpha = (0.16 + bucketIndex * 0.205) * gridGlobalAlpha;
            vCtx.fill();
          }
          for (let k = 0; k < brightNodeGlows.length; k += 4) {
            const gs = brightNodeGlows[k + 2];
            vCtx.globalAlpha = brightNodeGlows[k + 3] * gridGlobalAlpha;
            vCtx.drawImage(sdfDot, brightNodeGlows[k] - gs * 0.5, brightNodeGlows[k + 1] - gs * 0.5, gs, gs);
          }

          // 18. Dome outline ring
          if (M.x > -5000) {
            vCtx.globalAlpha = (0.08 + Math.sin(time * 2) * 0.03) * gridGlobalAlpha;
            vCtx.strokeStyle = 'rgba(167,139,250,0.4)';
            vCtx.lineWidth = 0.5;
            vCtx.beginPath();
            vCtx.arc(M.x, M.y, SPHERE_R, 0, 6.283);
            vCtx.stroke();
            vCtx.globalAlpha = 0.04 * gridGlobalAlpha;
            vCtx.strokeStyle = 'rgba(139,92,246,0.3)';
            vCtx.lineWidth = 1.5;
            vCtx.beginPath();
            vCtx.arc(M.x, M.y, SPHERE_R * 0.85, 0, 6.283);
            vCtx.stroke();
          }

          // Node afterimage ghost trails
          vCtx.globalCompositeOperation = 'lighter';
          for (let i = 0; i < totalGridNodes; i++) {
            if (pProgress[i] <= 0.001) continue;
            const disp = Math.sqrt((gx[i] - ghx[i]) * (gx[i] - ghx[i]) + (gy[i] - ghy[i]) * (gy[i] - ghy[i]));
            if (disp > 6) {
              const ghostAl = Math.min(disp * 0.005, 0.12) * pProgress[i] * gridGlobalAlpha;
              vCtx.globalAlpha = ghostAl;
              vCtx.fillStyle = 'rgba(139,92,246,0.5)';
              const gx_ghost = (sx_[i] + vpX + (ghx[i] - vpX) * ss_[i]) * 0.5;
              const gy_ghost = (sy_[i] + vpY + (ghy[i] - vpY) * ss_[i]) * 0.5;
              vCtx.fillRect(gx_ghost - 0.5, gy_ghost - 0.5, 1, 1);
            }
          }

          // 19. Motion trails
          vCtx.beginPath();
          let trN = 0;
          for (let i = 0; i < totalGridNodes; i++) {
            if (pProgress[i] <= 0.001) continue;
            const sp = Math.sqrt(gvx[i] * gvx[i] + gvy[i] * gvy[i]);
            if (sp > 1.8) {
              vCtx.moveTo(sx_[i], sy_[i]);
              vCtx.lineTo(sx_[i] - gvx[i] * 0.35, sy_[i] - gvy[i] * 0.35);
              trN++;
            }
          }
          if (trN) {
            vCtx.globalAlpha = 0.12 * gridGlobalAlpha;
            vCtx.strokeStyle = 'hsl(275,62%,70%)';
            vCtx.lineWidth = 0.2;
            vCtx.stroke();
          }

          // 20. Ambient dust
          for (let i = 0; i < DUST_N; i++) {
            const dS = FOV / (FOV + dustZ[i]);
            const dsx = vpX + (dustX[i] - vpX) * dS;
            const dsy = vpY + (dustY[i] - vpY) * dS;
            vCtx.globalAlpha = dustAl[i] * dS * gridGlobalAlpha;
            vCtx.fillStyle = 'rgba(180,160,230,1)';
            const sz = dustSz[i] * dS;
            vCtx.fillRect(dsx - sz * 0.5, dsy - sz * 0.5, sz, sz);
          }

          // 21. Embers
          for (let i = 0; i < emLim; i++) {
            const r = emLife[i] / emMax[i];
            const fIn = Math.min(r * 5, 1);
            const fOut = r > 0.7 ? Math.max(0, 1 - (r - 0.7) / 0.3) : 1;
            vCtx.globalAlpha = fIn * fOut * 0.35 * gridGlobalAlpha;
            vCtx.fillStyle = 'rgba(167,139,250,1)';
            const s = emSz[i];
            vCtx.fillRect(emX[i] - s * 0.5, emY[i] - s * 0.5, s, s);
          }

          // 22. Spark bursts
          for (let i = 0; i < spkLen; i++) {
            const r = spkLife[i] / spkMax[i];
            const a = (1 - r) * (1 - r);
            vCtx.globalAlpha = a * 0.7 * gridGlobalAlpha;
            vCtx.fillStyle = 'hsl(' + (270 + r * 40 | 0) + ',80%,78%)';
            const s = 1.5 * (1 - r) + 0.5;
            vCtx.fillRect(spkX[i] - s * 0.5, spkY[i] - s * 0.5, s, s);
          }

          // 23. Connection sparks
          for (let i = 0; i < cspLen; i++) {
            const a = cspLife[i] / 0.5;
            vCtx.globalAlpha = a * 0.8 * gridGlobalAlpha;
            vCtx.fillStyle = '#e0d4ff';
            vCtx.fillRect(cspX[i] - 1, cspY[i] - 1, 2, 2);
          }

        }

        // 24. Central Flash and shockwave
        const flashPct = Math.max(0.0, Math.min(1.0, (progress - 0.42) / 0.24));
        if (flashPct > 0.001 && flashPct < 0.999) {
          vCtx.globalCompositeOperation = 'lighter';
          const flashOpacity = Math.sin(flashPct * Math.PI);
          const flashRadius = maxR * 1.65 * flashPct;

          const flashGrad = vCtx.createRadialGradient(CX, CY, 0, CX, CY, flashRadius);
          flashGrad.addColorStop(0.0, 'rgba(255, 255, 255, ' + flashOpacity.toFixed(3) + ')');
          flashGrad.addColorStop(0.2, 'rgba(98, 228, 220, ' + (flashOpacity * 0.85).toFixed(3) + ')');
          flashGrad.addColorStop(0.5, 'rgba(139, 92, 246, ' + (flashOpacity * 0.45).toFixed(3) + ')');
          flashGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');

          vCtx.fillStyle = flashGrad;
          vCtx.beginPath();
          vCtx.arc(CX, CY, flashRadius, 0, Math.PI * 2);
          vCtx.fill();

          const ringRadius = maxR * 2.2 * flashPct;
          const ringOpacity = (1.0 - flashPct) * 0.85;
          vCtx.strokeStyle = 'rgba(98, 228, 220, ' + ringOpacity.toFixed(3) + ')';
          vCtx.lineWidth = 1.5 + (1.0 - flashPct) * 2.5;
          vCtx.beginPath();
          vCtx.arc(CX, CY, ringRadius, 0, Math.PI * 2);
          vCtx.stroke();
        }
        
        vCtx.restore();

        // Selected nodes draw energy through the network itself, never as a detached overlay.
        if (selectedNodeEnergy > 0.015) {
          const strands = 7;
          const energyTime = time * 2.2;
          vCtx.save();
          vCtx.globalCompositeOperation = 'lighter';
          for (let strand = 0; strand < strands; strand++) {
            const phase = strand / strands;
            const bend = Math.sin(energyTime + strand * 1.73) * 18 * selectedNodeEnergy;
            const midX = (selectedNodeX + CX) * 0.5 + bend;
            const midY = (selectedNodeY + CY) * 0.5 - bend * 0.55;
            vCtx.strokeStyle = `rgba(${strand % 2 ? '190,92,255' : '98,228,220'},${(selectedNodeEnergy * (0.16 + phase * 0.055)).toFixed(3)})`;
            vCtx.lineWidth = 0.45 + phase * 0.42;
            vCtx.beginPath();
            vCtx.moveTo(selectedNodeX, selectedNodeY);
            vCtx.quadraticCurveTo(midX, midY, CX, CY);
            vCtx.stroke();
          }
          vCtx.restore();
        }

        // The lattice carries the current; only a compact terminal corona is drawn at PAMP.
        if (M.x > -5000 && cursorCharge > 0.025) {
            vCtx.save();
            vCtx.globalCompositeOperation = 'lighter';
            // Compact tip corona: readable beneath PAMP without another render layer.
            const coronaRadius = 5 + cursorCharge * 9;
            const corona = vCtx.createRadialGradient(M.x, M.y, 0, M.x, M.y, coronaRadius);
            corona.addColorStop(0, `rgba(228,255,255,${(cursorCharge * 0.72).toFixed(3)})`);
            corona.addColorStop(0.34, `rgba(160,105,255,${(cursorCharge * 0.38).toFixed(3)})`);
            corona.addColorStop(1, 'rgba(120,64,255,0)');
            vCtx.fillStyle = corona;
            vCtx.beginPath();
            vCtx.arc(M.x, M.y, coronaRadius, 0, Math.PI * 2);
            vCtx.fill();
            vCtx.restore();

            if (cursorCharge > 0.68 && time - lastCursorSpark > 0.16) {
              spawnSparks(M.x, M.y, 3);
              lastCursorSpark = time;
            }
        }

        // Bloom post-processing
        if (qMult > 0.6 && bloomC && bloomX) {
          bloomX.clearRect(0, 0, bloomC.width, bloomC.height);
          bloomX.drawImage(veilCanvas, 0, 0, bloomC.width, bloomC.height);
          vCtx.globalCompositeOperation = 'lighter';
          vCtx.globalAlpha = 0.1 * gridGlobalAlpha;
          vCtx.drawImage(bloomC, 0, 0, veilCanvas.width / dpr, veilCanvas.height / dpr);
        }

        // Vignette + Grain + Color grading
        vCtx.save();
        vCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        vCtx.globalCompositeOperation = 'source-over';
        vCtx.globalAlpha = gridGlobalAlpha;
        
        if (vigC) {
          vCtx.drawImage(vigC, 0, 0, layoutW, layoutH);
        }
        
        // Fine grain
        vCtx.globalCompositeOperation = 'overlay';
        vCtx.globalAlpha = 0.018 * gridGlobalAlpha;
        if (grainC) {
          vCtx.drawImage(grainC, 0, 0, layoutW, layoutH);
        }
        
        // Color-burn pass: eliminate residual smudges for true blacks
        vCtx.globalCompositeOperation = 'color-burn';
        vCtx.fillStyle = 'rgb(252,252,252)';
        vCtx.globalAlpha = gridGlobalAlpha;
        vCtx.fillRect(0, 0, layoutW, layoutH);
        
        // Cinematic blue tint
        vCtx.globalCompositeOperation = 'screen';
        vCtx.globalAlpha = 0.012 * gridGlobalAlpha;
        vCtx.fillStyle = 'rgb(15,8,40)';
        vCtx.fillRect(0, 0, layoutW, layoutH);
        
        vCtx.restore();
        vCtx.globalCompositeOperation = 'source-over';
      }

      // --- B. PORTAL BORDER DARKNESS & PARTICLES (Appears only at progress >= 0.85) ---
      if (progress >= 0.85) {
        const ringFade = Math.min(1.0, (progress - 0.85) / 0.15);
        const portalCoreAlpha = 0.32 * ringFade;
        const portalDirector = getPortalDirector(time, cursorCharge);
        const cinematicSurge = portalDirector.surge;
        const coherentPortal = portalDirector.mode === "coherent";

        // 1. Dibujar núcleo de energía morada líquida (degradado radial) - Solo borde exterior
        const gradient = pCtx.createRadialGradient(
          centerX, centerY, 0,
          centerX, centerY, currentMaxR
        );
        gradient.addColorStop(0, "rgba(6, 3, 15, 0)");
        gradient.addColorStop(0.935, "rgba(6, 3, 15, 0)");
        gradient.addColorStop(0.972, `rgba(10, 5, 24, ${(portalCoreAlpha * 0.34).toFixed(3)})`);
        gradient.addColorStop(0.996, `rgba(141, 73, 204, ${(portalCoreAlpha * 0.12).toFixed(3)})`);
        gradient.addColorStop(1.0, "rgba(0, 0, 0, 0)");

        pCtx.fillStyle = gradient;
        pCtx.beginPath();
        pCtx.arc(centerX, centerY, currentMaxR, 0, Math.PI * 2);
        pCtx.fill();

        // Twenty thousand samples share one field; radial bands only provide differential orbit.
        const horizonScale = currentMaxR / eventHorizonRadius;
        const horizonBreath = portalDirector.breathe;
        if (!eventHorizonReady) buildEventHorizonTexture();
        pCtx.save();
        pCtx.globalCompositeOperation = "screen";
        pCtx.translate(centerX, centerY);
        pCtx.rotate(time * 0.018);
        pCtx.scale(horizonScale * 4, horizonScale * 4);
        pCtx.globalAlpha = ringFade * portalDirector.energy * (coherentPortal ? 0.018 : 0.035);
        pCtx.drawImage(eventHorizonBloomTexture, -128, -128);
        pCtx.restore();
        for (let band = 0; band < EVENT_HORIZON_BANDS; band++) {
          const normalizedRadius = 0.91 + band * 0.06;
          const orbitalVelocity = 0.026 * Math.pow(normalizedRadius, -1.5);
          pCtx.save();
          pCtx.globalCompositeOperation = "screen";
          pCtx.translate(centerX, centerY);
          pCtx.rotate(time * orbitalVelocity);
          pCtx.scale(
            horizonScale * (1 + horizonBreath * 0.0045),
            horizonScale * (1 - horizonBreath * 0.0035),
          );
          pCtx.globalAlpha = ringFade * portalDirector.energy * (coherentPortal ? 0.1 : 0.22);
          pCtx.drawImage(eventHorizonTextures[band], -512, -512);
          pCtx.restore();
        }

        // 2. Dibujar Partículas con Blending Aditivo de alto rendimiento (Screen)
        pCtx.globalCompositeOperation = "screen";
        const activePortalParticles = coherentPortal
          ? (qMult < 0.72 ? 140 : (qMult < 0.9 ? 180 : 220))
          : (qMult < 0.72 ? 240 : (qMult < 0.9 ? 300 : maxPortalParticles));

        for (let i = 0; i < activePortalParticles; i++) {
          const offset = i * STRIDE;
          const advanceParticle = ((i + portalFrameParity) & 1) === 0;
          
          // Half-rate simulation with temporal reconstruction; every particle is still drawn.
          if (advanceParticle) particleData[offset + OFF_LIFE] += 2.0;
          let life = particleData[offset + OFF_LIFE];
          const maxLife = particleData[offset + OFF_MAX_LIFE];

          if (life >= maxLife) {
            resetParticle(i, viewportW, viewportH, progress, false);
            life = 0;
          }

          const lifePct = life / maxLife;
          const particleDepth = (i * 0.61803398875) % 1;
          const radialDepth = (particleDepth - 0.5) * 0.032;
          const isRingParticle = (i % 2 === 0);
          
          let radius = 0;
          let angle = 0;
          let prevRadius = 0;
          let prevAngle = 0;

          if (isRingParticle) {
            // El anillo exterior de chispas se forma en el límite de la apertura
            const baseRadius = currentMaxR * (1.006 + radialDepth);
            const orbitalBaseStep = particleData[offset + OFF_ANG_SPEED] * Math.pow(Math.max(0.88, baseRadius / currentMaxR), -1.5);
            const orbitalStep = advanceParticle ? orbitalBaseStep * 2 : 0;
            
            particleData[offset + OFF_ANGLE] += orbitalStep;
            angle = particleData[offset + OFF_ANGLE];
            prevAngle = angle - orbitalBaseStep * 1.6;
            
            // Perturbaciones fluidas orgánicas (wobble/turbulencia)
            const w1 = fastPortalSin(angle * 5 + life * 0.06) * (currentMaxR * 0.018) + fastPortalCos(angle * 9 - life * 0.09) * (currentMaxR * 0.009);
            radius = baseRadius + fastPortalSin(life * 0.05 + i) * (currentMaxR * 0.005) + w1 * 0.32 + cinematicSurge * (0.7 + particleDepth * 1.9);

            const w0 = fastPortalSin(prevAngle * 5 + (life - 1) * 0.06) * (currentMaxR * 0.018) + fastPortalCos(prevAngle * 9 - (life - 1) * 0.09) * (currentMaxR * 0.009);
            prevRadius = baseRadius + fastPortalSin((life - 1) * 0.05 + i) * (currentMaxR * 0.005) + w0 * 0.32;
          } else {
            // Vórtice comportándose como anillo de chispas en el borde exterior
            const baseRadius = currentMaxR * (0.998 + radialDepth);
            const orbitalBaseStep = particleData[offset + OFF_ANG_SPEED] * 0.8 * Math.pow(Math.max(0.88, baseRadius / currentMaxR), -1.5);
            const orbitalStep = advanceParticle ? orbitalBaseStep * 2 : 0;
            
            particleData[offset + OFF_ANGLE] += orbitalStep;
            angle = particleData[offset + OFF_ANGLE];
            prevAngle = angle - orbitalBaseStep * 1.6;
            
            // Perturbaciones fluidas orgánicas (wobble/turbulencia)
            const w1 = fastPortalSin(angle * 4 - life * 0.07) * (currentMaxR * 0.021) + fastPortalCos(angle * 10 + life * 0.11) * (currentMaxR * 0.011);
            radius = baseRadius + fastPortalCos(life * 0.08 + i) * (currentMaxR * 0.005) + w1 * 0.3 + cinematicSurge * (0.55 + particleDepth * 1.7);

            const w0 = fastPortalSin(prevAngle * 4 - (life - 1) * 0.07) * (currentMaxR * 0.021) + fastPortalCos(prevAngle * 10 + (life - 1) * 0.11) * (currentMaxR * 0.011);
            prevRadius = baseRadius + fastPortalCos((life - 1) * 0.08 + i) * (currentMaxR * 0.005) + w0 * 0.3;
          }

          const layerAlpha = 0.42 - particleDepth * 0.22;
          const finalAlpha = Math.min(
            1.0,
            ringFade * layerAlpha * (coherentPortal ? 0.58 : 1) * (1 + cinematicSurge * 0.28),
          );

          if (finalAlpha > 0.015) {
            const layerSize = 0.32 + particleDepth * 0.5;
            let size = particleData[offset + OFF_SIZE] * layerSize * (0.38 + lifePct * 0.24);
            if (i % 19 === 0) size *= 1.18;
            const x = centerX + fastPortalCos(angle) * radius;
            const y = centerY + fastPortalSin(angle) * radius;
            const prevX = centerX + fastPortalCos(prevAngle) * prevRadius;
            const prevY = centerY + fastPortalSin(prevAngle) * prevRadius;
            const trailScale = 0.42 + particleDepth * 0.32;
            const trailX = x - (x - prevX) * trailScale;
            const trailY = y - (y - prevY) * trailScale;

            const colorIdx = Math.floor(particleData[offset + OFF_COLOR]);
            const alphaIndex = Math.min(100, Math.floor(finalAlpha * 100));
            
            pCtx.strokeStyle = colorCache[colorIdx][alphaIndex];
            pCtx.lineWidth = size;
            pCtx.lineCap = "round";

            pCtx.beginPath();
            pCtx.moveTo(trailX, trailY);
            pCtx.lineTo(x, y);
            pCtx.stroke();
          }
        }
        pCtx.globalCompositeOperation = "source-over"; // Restaurar blending estándar
      }
    }

    animatePortal();
  }
}

const zoneData = {
  "SOLIS": {
    name: "Solis Outpost",
    number: "01",
    numberLabel: "NODE 1",
    color: "yellow",
    badgeBg: "#ffd700",
    badgeFg: "#000",
    statusColor: "#62e4b4",
    telemetry: {
      threat: "LEVEL 1 (LOW)",
      sync: "98.2%",
      rad: "0.02 mSv/h",
      status: "STABLE // ONLINE"
    },
    lore: "Solis represents the solar outpost on the high eastern ridge. It captures high-altitude telemetry and functions as the primary solar collector array for Prisma City. Communication lines remain robust under the 0day protocol.",
    visual: `<svg viewBox="0 0 200 120" style="width:100%; height:100%; background:#020b12;">
      <path d="M 0 60 Q 25 20 50 60 T 100 60 T 150 60 T 200 60" fill="none" stroke="#ffd700" stroke-width="1.2">
        <animate attributeName="d" values="M 0 60 Q 25 20 50 60 T 100 60 T 150 60 T 200 60; M 0 60 Q 25 100 50 60 T 100 60 T 150 60 T 200 60; M 0 60 Q 25 20 50 60 T 100 60 T 150 60 T 200 60" dur="4s" repeatCount="indefinite"/>
      </path>
      <line x1="0" y1="60" x2="200" y2="60" stroke="rgba(255,215,0,0.15)" stroke-width="0.5"/>
      <line x1="100" y1="0" x2="100" y2="120" stroke="rgba(255,215,0,0.15)" stroke-width="0.5"/>
    </svg>`
  },
  "PRISMA CITY": {
    name: "Prisma City",
    number: "02",
    numberLabel: "NODE 2",
    color: "red",
    badgeBg: "#ff3200",
    badgeFg: "#fff",
    statusColor: "#ff3200",
    telemetry: {
      threat: "LEVEL 5 (CRITICAL)",
      sync: "12.4%",
      rad: "5.14 mSv/h",
      status: "HOSTILE SECTOR"
    },
    lore: "The metropolis center of Prisma City is heavily locked down under military containment. A severe radiation anomaly has disrupted the primary reactor grid. The civilian evacuation remains incomplete.",
    visual: `<svg viewBox="0 0 200 120" style="width:100%; height:100%; background:#0f0202;">
      <circle cx="100" cy="60" r="30" fill="none" stroke="#ff3200" stroke-width="0.5" stroke-dasharray="2 4"/>
      <circle cx="100" cy="60" r="50" fill="none" stroke="#ff3200" stroke-width="0.5"/>
      <line x1="100" y1="60" x2="180" y2="10" stroke="#ff3200" stroke-width="1.2">
        <animateTransform attributeName="transform" type="rotate" from="0 100 60" to="360 100 60" dur="3s" repeatCount="indefinite"/>
      </line>
      <circle cx="120" cy="40" r="2" fill="#ff3200">
        <animate attributeName="opacity" values="1;0.2;1" dur="1.5s" repeatCount="indefinite"/>
      </circle>
      <circle cx="80" cy="80" r="2.5" fill="#ff3200">
        <animate attributeName="opacity" values="0.1;1;0.1" dur="2s" repeatCount="indefinite"/>
      </circle>
    </svg>`
  },
  "TOP-LEFT OUTPOST": {
    name: "Top-Left Outpost",
    number: "03",
    numberLabel: "NODE 3",
    color: "yellow",
    badgeBg: "#ffd700",
    badgeFg: "#000",
    statusColor: "#ffd700",
    telemetry: {
      threat: "LEVEL 2 (MODERATE)",
      sync: "87.1%",
      rad: "0.45 mSv/h",
      status: "STANDBY"
    },
    lore: "Positioned in the mountainous northern terrain, this outpost acts as a weather monitoring base and regional relay station. Signal jitter is moderate but operational.",
    visual: `<svg viewBox="0 0 200 120" style="width:100%; height:100%; background:#020b12;">
      <g fill="none" stroke="#ffd700" stroke-width="0.8">
        <path d="M 10 90 L 40 40 L 70 80 L 100 30 L 130 70 L 160 20 L 190 90" />
        <circle cx="40" cy="40" r="3" fill="#ffd700"/>
        <circle cx="100" cy="30" r="3" fill="#ffd700"/>
        <circle cx="160" cy="20" r="3" fill="#ffd700"/>
      </g>
      <line x1="0" y1="90" x2="200" y2="90" stroke="rgba(255,215,0,0.3)" stroke-width="1"/>
    </svg>`
  },
  "LEFT OUTPOST": {
    name: "Left Outpost",
    number: "04",
    numberLabel: "NODE 4",
    color: "orange",
    badgeBg: "#ff6e00",
    badgeFg: "#fff",
    statusColor: "#ff6e00",
    telemetry: {
      threat: "LEVEL 3 (HIGH)",
      sync: "62.0%",
      rad: "1.88 mSv/h",
      status: "DEGRADED"
    },
    lore: "Left Outpost marks the western gate of containment. The perimeter shielding is running at reduced power due to local generator failures. Minor containment breaches detected.",
    visual: `<svg viewBox="0 0 200 120" style="width:100%; height:100%; background:#0a0500;">
      <g fill="#ff6e00">
        <rect x="25" y="80" width="10" height="0">
          <animate attributeName="height" values="20;80;40;20" dur="2s" repeatCount="indefinite"/>
          <animate attributeName="y" values="80;20;60;80" dur="2s" repeatCount="indefinite"/>
        </rect>
        <rect x="55" y="80" width="10" height="0">
          <animate attributeName="height" values="50;10;70;50" dur="2.4s" repeatCount="indefinite"/>
          <animate attributeName="y" values="50;90;30;50" dur="2.4s" repeatCount="indefinite"/>
        </rect>
        <rect x="85" y="80" width="10" height="0">
          <animate attributeName="height" values="10;90;30;10" dur="1.8s" repeatCount="indefinite"/>
          <animate attributeName="y" values="90;10;70;90" dur="1.8s" repeatCount="indefinite"/>
        </rect>
        <rect x="115" y="80" width="10" height="0">
          <animate attributeName="height" values="60;30;85;60" dur="2.2s" repeatCount="indefinite"/>
          <animate attributeName="y" values="40;70;15;40" dur="2.2s" repeatCount="indefinite"/>
        </rect>
        <rect x="145" y="80" width="10" height="0">
          <animate attributeName="height" values="30;60;20;30" dur="1.5s" repeatCount="indefinite"/>
          <animate attributeName="y" values="70;40;80;70" dur="1.5s" repeatCount="indefinite"/>
        </rect>
      </g>
      <line x1="15" y1="100" x2="185" y2="100" stroke="rgba(255,110,0,0.3)" stroke-width="1"/>
    </svg>`
  },
  "ANIMUS": {
    name: "Animus Sanctuary",
    number: "05",
    numberLabel: "NODE 5",
    color: "green",
    badgeBg: "#62e4b4",
    badgeFg: "#000",
    statusColor: "#62e4b4",
    telemetry: {
      threat: "LEVEL 0 (SAFE)",
      sync: "99.9%",
      rad: "0.00 mSv/h",
      status: "SECURE CHANNEL"
    },
    lore: "Animus is a subterranean vault housing the legacy databases of Ichiro. Shielded by lead and basalt layers, the vault remains untouched by the surface radiation.",
    visual: `<svg viewBox="0 0 200 120" style="width:100%; height:100%; background:#020c08;">
      <circle cx="100" cy="60" r="10" fill="none" stroke="#62e4b4" stroke-width="1">
        <animate attributeName="r" values="10;50;10" dur="3s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="1;0;1" dur="3s" repeatCount="indefinite"/>
      </circle>
      <circle cx="100" cy="60" r="30" fill="none" stroke="#62e4b4" stroke-width="1">
        <animate attributeName="r" values="30;70;30" dur="3s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.8;0;0.8" dur="3s" repeatCount="indefinite"/>
      </circle>
      <circle cx="100" cy="60" r="5" fill="#62e4b4"/>
    </svg>`
  },
  "FAR-LEFT OUTPOST": {
    name: "Far-Left Outpost",
    number: "06",
    numberLabel: "NODE 6",
    color: "pink",
    badgeBg: "#ff1493",
    badgeFg: "#fff",
    statusColor: "#ff3200",
    telemetry: {
      threat: "LEVEL X (UNKNOWN)",
      sync: "0.0%",
      rad: "12.4 mSv/h",
      status: "OFFLINE"
    },
    lore: "The outermost western outpost has been completely silent since the 0day event. Telemetry has ceased, and local sensors indicate high radiation surges from the reactor sector.",
    visual: `<svg viewBox="0 0 200 120" style="width:100%; height:100%; background:#0c0208;">
      <path d="M 10 60 L 190 60" fill="none" stroke="#ff1493" stroke-width="1" />
      <path d="M 10 60 L 190 60" fill="none" stroke="#ff1493" stroke-width="2.5" opacity="0.3">
        <animate attributeName="d" values="M 10 60 L 190 60; M 10 60 L 80 60 L 90 20 L 100 100 L 110 40 L 120 70 L 130 60 L 190 60; M 10 60 L 190 60" dur="0.8s" repeatCount="indefinite"/>
      </path>
    </svg>`
  },
  "FAR-RIGHT OUTPOST": {
    name: "Far-Right Outpost",
    number: "07",
    numberLabel: "NODE 7",
    color: "yellow",
    badgeBg: "#ffd700",
    badgeFg: "#000",
    statusColor: "#ffd700",
    telemetry: {
      threat: "LEVEL 2 (MODERATE)",
      sync: "79.5%",
      rad: "0.22 mSv/h",
      status: "STANDBY"
    },
    lore: "This outpost guards the eastern coastal border. Automated maritime tracking sensors remain operational, streaming telemetry to the main network via the Solis relay.",
    visual: `<svg viewBox="0 0 200 120" style="width:100%; height:100%; background:#020b12;">
      <path d="M 0 60 Q 30 40 60 60 T 120 60 T 180 60 L 200 60" fill="none" stroke="#ffd700" stroke-width="0.8">
        <animate attributeName="d" values="M 0 60 Q 30 40 60 60 T 120 60 T 180 60 L 200 60; M 0 60 Q 30 80 60 60 T 120 60 T 180 60 L 200 60; M 0 60 Q 30 40 60 60 T 120 60 T 180 60 L 200 60" dur="2s" repeatCount="indefinite"/>
      </path>
      <path d="M 0 80 Q 20 70 40 80 T 80 80 T 120 80 T 160 80 L 200 80" fill="none" stroke="rgba(255,215,0,0.5)" stroke-width="0.6">
        <animate attributeName="d" values="M 0 80 Q 20 70 40 80 T 80 80 T 120 80 T 160 80 L 200 80; M 0 80 Q 20 90 40 80 T 80 80 T 120 80 T 160 80 L 200 80; M 0 80 Q 20 70 40 80 T 80 80 T 120 80 T 160 80 L 200 80" dur="2.5s" repeatCount="indefinite"/>
      </path>
    </svg>`
  },
  "THE KEEP": {
    name: "The Keep Core",
    number: "HUB",
    numberLabel: "HUB CORE",
    color: "blue",
    badgeBg: "#008cff",
    badgeFg: "#fff",
    statusColor: "#ff3200",
    telemetry: {
      threat: "LEVEL 4 (UNSTABLE)",
      sync: "41.6%",
      rad: "3.05 mSv/h",
      status: "INTRUSION ALERT"
    },
    lore: "The Keep is the central processing fortress of New Eden. Formerly the AI core operations base, it is now a battleground of competing network nodes and regional corruption.",
    visual: `<svg viewBox="0 0 200 120" style="width:100%; height:100%; background:#020612;">
      <circle cx="100" cy="60" r="45" fill="none" stroke="#008cff" stroke-width="0.8" stroke-dasharray="5 5">
        <animateTransform attributeName="transform" type="rotate" from="0 100 60" to="-360 100 60" dur="10s" repeatCount="indefinite"/>
      </circle>
      <path d="M 60 60 L 140 60 M 100 20 L 100 100" stroke="rgba(0,140,255,0.4)" stroke-width="0.5"/>
      <polygon points="100,45 115,65 85,65" fill="none" stroke="#008cff" stroke-width="1">
        <animateTransform attributeName="transform" type="rotate" from="0 100 60" to="360 100 60" dur="4s" repeatCount="indefinite"/>
      </polygon>
    </svg>`
  },
  "NODE ONE": {
    name: "Junction Node One",
    number: "HUB",
    numberLabel: "HUB NODE",
    color: "green",
    badgeBg: "#62e4b4",
    badgeFg: "#000",
    statusColor: "#62e4b4",
    telemetry: {
      threat: "LEVEL 1 (SAFE)",
      sync: "94.0%",
      rad: "0.05 mSv/h",
      status: "OPERATIONAL"
    },
    lore: "Node One serves as the primary regional distribution junction. It routes power and data between Solis, Prisma City, and the western sectors. Automated routing systems are online.",
    visual: `<svg viewBox="0 0 200 120" style="width:100%; height:100%; background:#020c08;">
      <circle cx="100" cy="60" r="30" fill="none" stroke="#62e4b4" stroke-width="0.5" stroke-dasharray="1 5"/>
      <circle cx="100" cy="60" r="40" fill="none" stroke="#62e4b4" stroke-width="0.5"/>
      <g>
        <circle cx="130" cy="60" r="3" fill="#62e4b4"/>
        <animateTransform attributeName="transform" type="rotate" from="0 100 60" to="360 100 60" dur="5s" repeatCount="indefinite"/>
      </g>
      <circle cx="100" cy="60" r="5" fill="#62e4b4"/>
    </svg>`
  },
  "ALTONA": {
    name: "Altona Biosphere",
    number: "HUB",
    numberLabel: "HUB NODE",
    color: "yellow",
    badgeBg: "#ffd700",
    badgeFg: "#000",
    statusColor: "#ffd700",
    telemetry: {
      threat: "LEVEL 2 (MODERATE)",
      sync: "83.7%",
      rad: "0.18 mSv/h",
      status: "STANDBY"
    },
    lore: "Altona is the southern agricultural sector, protected by geodesic domes. Environmental systems are running stable under local control, despite high external threat levels.",
    visual: `<svg viewBox="0 0 200 120" style="width:100%; height:100%; background:#020b12;">
      <path d="M 10 100 Q 50 10 100 100 T 190 100" fill="none" stroke="#ffd700" stroke-width="1">
        <animate attributeName="d" values="M 10 100 Q 50 10 100 100 T 190 100; M 10 100 Q 50 60 100 100 T 190 100; M 10 100 Q 50 10 100 100 T 190 100" dur="3s" repeatCount="indefinite"/>
      </path>
      <line x1="0" y1="100" x2="200" y2="100" stroke="rgba(255,215,0,0.2)" stroke-width="0.5"/>
    </svg>`
  },
  "LAKE KAIROS": {
    name: "Lake Kairos Hydro",
    number: "HUB",
    numberLabel: "HUB NODE",
    color: "red",
    badgeBg: "#ff3200",
    badgeFg: "#fff",
    statusColor: "#ff3200",
    telemetry: {
      threat: "LEVEL 3 (HIGH)",
      sync: "50.2%",
      rad: "2.41 mSv/h",
      status: "WARNING // DEGRADED"
    },
    lore: "The hydro-power facilities at Lake Kairos are operating under emergency protocols. Silt accumulation and coolant leaks have compromised turbine efficiency.",
    visual: `<svg viewBox="0 0 200 120" style="width:100%; height:100%; background:#0f0202;">
      <path d="M 0 60 C 50 80 50 40 100 60 C 150 80 150 40 200 60" fill="none" stroke="#ff3200" stroke-width="1.2">
        <animate attributeName="d" values="M 0 60 C 50 80 50 40 100 60 C 150 80 150 40 200 60; M 0 60 C 50 40 50 80 100 60 C 150 40 150 80 200 60; M 0 60 C 50 80 50 40 100 60 C 150 80 150 40 200 60" dur="3s" repeatCount="indefinite"/>
      </path>
    </svg>`
  }
};
