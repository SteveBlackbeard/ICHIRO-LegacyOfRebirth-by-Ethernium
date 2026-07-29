import { createDossierProtocolRunner } from "./dossier-protocols.js?v=kpr-dossier-contracts-256";
import {
  getDossierAssets,
  resolveDossierCover,
} from "./dossier-assets.js?v=kpr-final-assets-264";

function startMagmaWaveform(canvas) {
  if (!canvas) return null;
  const ctx = canvas.getContext("2d");
  let animationId = null;
  let active = false;
  let hover = false;

  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = (rect.width || 300) * dpr;
  canvas.height = 38 * dpr;
  ctx.scale(dpr, dpr);

  const parent = canvas.closest(".audio-placeholder");
  let enterListener, leaveListener, clickListener;
  if (parent) {
    enterListener = () => { hover = true; };
    leaveListener = () => { hover = false; };
    clickListener = () => { active = !active; };
    parent.addEventListener("mouseenter", enterListener);
    parent.addEventListener("mouseleave", leaveListener);
    parent.addEventListener("click", clickListener);
  }

  function draw() {
    const w = canvas.width / dpr;
    const h = 38;
    ctx.clearRect(0, 0, w, h);

    const time = performance.now() * 0.0025;
    const barsCount = 34;
    const barWidth = 3;
    const gap = 4;
    const startX = (w - (barsCount * (barWidth + gap) - gap)) / 2;

    for (let i = 0; i < barsCount; i++) {
      const x = startX + i * (barWidth + gap);
      
      let amplitude = active ? 16 : 4;
      if (hover) amplitude += 6;

      const noise = Math.sin(i * 0.35 + time * 2.2) * Math.cos(i * 0.18 - time * 0.8) * amplitude;
      const barHeight = Math.max(2, Math.abs(noise));
      const y = (h - barHeight) / 2;

      const grad = ctx.createLinearGradient(x, y, x, y + barHeight);
      grad.addColorStop(0, "#ffcc00");  // Magma light gold-orange
      grad.addColorStop(0.5, "#ff5500"); // Hot magma orange-red
      grad.addColorStop(1, "#800000");   // Dark cooling red lava

      ctx.fillStyle = grad;
      ctx.fillRect(x, y, barWidth, barHeight);
    }

    animationId = requestAnimationFrame(draw);
  }

  draw();

  return {
    destroy() {
      if (animationId) cancelAnimationFrame(animationId);
      if (parent) {
        parent.removeEventListener("mouseenter", enterListener);
        parent.removeEventListener("mouseleave", leaveListener);
        parent.removeEventListener("click", clickListener);
      }
    }
  };
}

export function createArchiveUi({
  files,
  initialActiveIndex,
  progression,
  tone,
  setParticlePulse,
  loadFullLore,
  renderLoreSegments,
  stopNarrative,
  stopArchiveVideoExternalAudio,
  releaseArchiveVideoMediaHold,
  playArchiveVideoWithAudio,
  getArchiveVideoSilentPriming,
  pauseArchiveVideoPlayback,
  focusManager,
  els,
}) {
  let activeIndex = initialActiveIndex;
  let lastWheel = 0;
  let archiveFoldProgress = 0;
  let archiveVideoStarted = false;
  const ARCHIVE_VIDEO_AUDIO_START = 0.92;
  
  let autoMapTransition = 0;
  let lastTime = performance.now();
  let portalLoopRunning = false;
  let dossierTypewriterTimer = null;
  let hackingHeaderInterval = null;
  let activeDossierAudio = null;

  const {
    archiveScreen,
    archiveVideoStage,
    archiveVideo,
    archiveLoreSegments,
    archiveVideoLoreTabs,
    panelRing,
    lockedHint,
    finalMessage,
    caseViewer,
    caseTitle,
    caseStatus,
    caseContent,
    placeholderList,
    audioPlaceholder,
  } = els;

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function stopDossierAudio() {
    if (!activeDossierAudio) return;
    activeDossierAudio.pause();
    activeDossierAudio.currentTime = 0;
    activeDossierAudio.remove();
    activeDossierAudio = null;
  }

  function renderAudioPlaceholder(text, asset = null) {
    stopDossierAudio();
    audioPlaceholder.innerHTML = `
      <div class="audio-toggle-wrapper" style="display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 6px 10px;">
        <svg class="loudspeaker-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0; color: var(--cyan, #62e4dc); filter: drop-shadow(0 0 6px rgba(98, 228, 220, 0.6));">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="rgba(98, 228, 220, 0.25)" stroke="var(--cyan, #62e4dc)"/>
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" stroke="var(--cyan, #62e4dc)"/>
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" stroke="var(--gold, #ffd782)"/>
        </svg>
        <span class="iridescent-label" style="font-family: 'Cascadia Mono', Consolas, monospace; font-size: 0.7rem; font-weight: 700; color: var(--cyan, #62e4dc); letter-spacing: 0.08em;">AUDIO // ${escapeHtml(text)}</span>
      </div>
    `;
    audioPlaceholder.setAttribute("aria-label", `Audio archive cue: ${text}`);
    audioPlaceholder.onclick = null;

    if (!asset?.src) return;

    const audio = document.createElement("audio");
    audio.src = asset.src;
    audio.preload = "none";
    audio.hidden = true;
    audioPlaceholder.append(audio);
    activeDossierAudio = audio;

    const updateState = () => {
      const playing = !audio.paused && !audio.ended;
      audioPlaceholder.classList.toggle("is-playing", playing);
      audioPlaceholder.setAttribute(
        "aria-label",
        `${playing ? "Pause" : "Play"} dossier audio: ${text}`,
      );
    };
    audio.addEventListener("play", updateState);
    audio.addEventListener("pause", updateState);
    audio.addEventListener("ended", updateState);
    audioPlaceholder.onclick = () => {
      if (audio.paused || audio.ended) {
        audio.play().catch(() => {});
      } else {
        audio.pause();
      }
    };
  }

  function getActiveIndex() {
    return activeIndex;
  }

  function getArchiveFoldProgress() {
    return archiveFoldProgress;
  }

  function isPointerInArchiveSwordZone(event) {
    if (!archiveScreen || archiveScreen.classList.contains("hidden") || archiveFoldProgress < 0.72) {
      return false;
    }
    const videoProgress = Math.min(1, Math.max(0, (archiveFoldProgress - 0.62) / 0.38));
    if (videoProgress > 0.42) {
      return false;
    }
    const x = event.clientX / Math.max(1, window.innerWidth);
    const y = event.clientY / Math.max(1, window.innerHeight);
    return x > 0.18 && x < 0.82 && y > 0.16 && y < 0.84;
  }

  function rotate(direction) {
    const now = Date.now();
    if (now - lastWheel < 260) {
      return;
    }
    lastWheel = now;

    activeIndex = (activeIndex + direction + files.length) % files.length;
    renderRing();
    tone("move");
  }

  function runPortalLoop() {
    if (!portalLoopRunning) return;
    requestAnimationFrame(runPortalLoop);

    const now = performance.now();
    const dt = (now - lastTime) / 1000;
    lastTime = now;

    // El portal se abre DESPUÉS de que las ventanas están completamente abiertas
    const targetMap = (archiveFoldProgress >= 1.28) ? 1.0 : 0.0;

    let changed = false;
    if (autoMapTransition < targetMap) {
      autoMapTransition = Math.min(targetMap, autoMapTransition + dt * 0.72); // Abre en ~1.4s
      changed = true;
    } else if (autoMapTransition > targetMap) {
      autoMapTransition = Math.max(targetMap, autoMapTransition - dt * 5.0); // Cierra en ~0.18s (desaparece antes que lore y video)
      changed = true;
    }

    if (changed) {
      archiveScreen.style.setProperty("--archive-map", autoMapTransition.toFixed(3));
      document.documentElement.style.setProperty("--archive-map", autoMapTransition.toFixed(3));
      
      const fold = Math.min(1, archiveFoldProgress / 0.72);
      const out = Math.min(1, Math.max(0, (archiveFoldProgress - 0.42) / 0.42));
      const video = Math.min(1, Math.max(0, (archiveFoldProgress - 0.62) / 0.38));
      
      window.__kprArchiveFold = {
        raw: archiveFoldProgress,
        fold,
        out,
        video,
        videoFlip: 0,
        lore: 0,
        map: autoMapTransition,
      };
      globalThis.__kprArchiveFold = window.__kprArchiveFold;
      
      document.dispatchEvent(new CustomEvent("kpr-archive-fold-progress", {
        detail: window.__kprArchiveFold,
      }));

      archiveScreen.classList.toggle("archive-map-active", autoMapTransition > 0.94);
      
      if (autoMapTransition >= 0.9) {
        if (archiveVideoStarted) {
          pauseArchiveVideoPlayback();
          archiveVideoStarted = false;
        }
      } else {
        if (video > ARCHIVE_VIDEO_AUDIO_START && !archiveVideoStarted && (!archiveVideo || !archiveVideo.ended)) {
          archiveVideoStarted = true;
          archiveScreen.classList.remove("archive-video-ended");
          playArchiveVideoWithAudio();
        }
      }
    } else {
      portalLoopRunning = false;
    }
  }

  function triggerPortalUpdate() {
    lastTime = performance.now();
    if (!portalLoopRunning) {
      portalLoopRunning = true;
      runPortalLoop();
    }
  }

  function setArchiveFoldProgress(value) {
    archiveFoldProgress = Math.min(1.38, Math.max(0, value));
    const fold = Math.min(1, archiveFoldProgress / 0.72);
    const out = Math.min(1, Math.max(0, (archiveFoldProgress - 0.42) / 0.42));
    const video = Math.min(1, Math.max(0, (archiveFoldProgress - 0.62) / 0.38));
    const videoFlip = 0;
    const lore = 0;
    
    archiveScreen.style.setProperty("--archive-fold", fold.toFixed(3));
    archiveScreen.style.setProperty("--archive-fold-out", out.toFixed(3));
    archiveScreen.style.setProperty("--archive-video", video.toFixed(3));
    archiveScreen.style.setProperty("--archive-video-flip", videoFlip.toFixed(3));
    archiveScreen.style.setProperty("--archive-lore", lore.toFixed(3));
    archiveScreen.style.setProperty("--archive-video-shade", (0.18 + video * 0.52).toFixed(3));
    archiveScreen.style.setProperty("--archive-video-bright", (0.88 - video * 0.34).toFixed(3));
    archiveScreen.style.setProperty("--archive-map", autoMapTransition.toFixed(3));
    
    document.documentElement.style.setProperty("--archive-fold", fold.toFixed(3));
    document.documentElement.style.setProperty("--archive-map", autoMapTransition.toFixed(3));
    
    window.__kprArchiveFold = {
      raw: archiveFoldProgress,
      fold,
      out,
      video,
      videoFlip,
      lore,
      map: autoMapTransition,
    };
    globalThis.__kprArchiveFold = window.__kprArchiveFold;
    document.dispatchEvent(new CustomEvent("kpr-archive-fold-progress", {
      detail: window.__kprArchiveFold,
    }));
    
    archiveScreen.classList.toggle("archive-video-active", video > 0.05);
    archiveScreen.classList.toggle("archive-video-flipped", videoFlip > 0.92);
    archiveScreen.classList.remove("archive-lore-active");
    archiveScreen.classList.toggle("archive-map-active", autoMapTransition > 0.94);

    const classificationEl = document.querySelector(".energy-blade-classification");
    if (classificationEl) {
      classificationEl.classList.toggle("kpr-glitch-exit", video > 0.01 && video < 0.35);
    }
    
    archiveVideoStage?.setAttribute("aria-hidden", video > 0.05 ? "false" : "true");
    archiveVideoLoreTabs?.classList.toggle("is-active", video > 0.05);
    
    if (video <= 0.05) {
      archiveVideoStarted = false;
      archiveScreen.classList.remove("archive-video-ended");
      archiveScreen.classList.remove("archive-video-audio-blocked");
      if (archiveVideo) {
        delete archiveVideo.dataset.userRequestedAudio;
        delete archiveVideo.dataset.forceAudio;
        delete archiveVideo.dataset.externalAudio;
      }
      stopArchiveVideoExternalAudio();
      releaseArchiveVideoMediaHold();
    }
    
    if (video > 0.01) {
      renderArchiveLoreSegments();
    }
    
    if (video > ARCHIVE_VIDEO_AUDIO_START && autoMapTransition < 0.9) {
      if (archiveVideo && !archiveVideoStarted) {
        archiveVideoStarted = true;
        archiveScreen.classList.remove("archive-video-ended");
        archiveVideo.currentTime = 0;
        playArchiveVideoWithAudio();
      } else if (archiveVideo && archiveVideo.paused && !archiveVideo.ended) {
        playArchiveVideoWithAudio();
      }
    } else if (autoMapTransition >= 0.9) {
      if (archiveVideoStarted) {
        pauseArchiveVideoPlayback();
        archiveVideoStarted = false;
      }
    }

    triggerPortalUpdate();
  }

  function handleArchiveWheel(event) {
    if (event.deltaY > 0 && archiveFoldProgress >= 1.38) {
      return;
    }
    const delta = Math.max(-0.105, Math.min(0.105, event.deltaY / 1350));
    setArchiveFoldProgress(archiveFoldProgress + delta);
    if (archiveFoldProgress <= 0.02 && event.deltaY < 0) {
      rotate(-1);
    } else if (archiveFoldProgress <= 0.02 && event.deltaY > 0) {
      rotate(1);
    }
  }

  function renderRing() {
    panelRing.innerHTML = "";

    files.forEach((file, index) => {
      const unlocked = progression.isUnlocked(file.id);
      const opened = progression.isOpened(file.id);
      const card = document.createElement("button");
      card.type = "button";
      card.className = [
        "panel-card",
        index === activeIndex ? "is-active" : "",
        unlocked ? "is-unlocked" : "is-locked",
        opened ? "is-opened" : "",
      ].join(" ");
      card.setAttribute("aria-disabled", String(!unlocked));
      card.dataset.fileId = file.id;

      const stateTag = unlocked
        ? opened
          ? "OPENED"
          : "AVAILABLE"
        : "LOCKED / DATA MISSING";
      const thumbUrl = resolveDossierCover(file.id);
      card.innerHTML = `
        <div class="panel-card__id"><span class="iridescent-label">[dossier ${file.id}]</span></div>
        <div class="panel-card__body">
          <div class="panel-card__title">${file.title}</div>
          <div class="panel-card__meta">
            <span class="tag ${unlocked ? "tag--active" : "tag--locked"}">${stateTag}</span>
            ${file.tags.map((tag) => `<span class="tag">${tag}</span>`).join("")}
          </div>
        </div>
        <img class="panel-card__thumb" src="${thumbUrl}" alt="" aria-hidden="true" />
      `;

      card.addEventListener("click", () => {
        if (!unlocked) {
          return;
        }
        activeIndex = index;
        openFile(file);
      });

      panelRing.append(card);
    });

    const activeFile = files[activeIndex];
    lockedHint.textContent = progression.isUnlocked(activeFile.id)
      ? "Active dossier ready. Click an available panel to open the expediente."
      : "LOCKED / DATA MISSING. Rotate to an available recovered file from LUMEN.";
  }

  function animatePanels() {
    for (const card of panelRing.querySelectorAll(".panel-card")) {
      card.style.transform = "";
    }
  }

  function startHackingHeader(element) {
    if (hackingHeaderInterval) {
      clearInterval(hackingHeaderInterval);
    }
    const steps = [
      "//HACKING",
      "//HACKING .",
      "//HACKING . .",
      "//HACKING . . .",
      "//HACKING . . . PROJECT REDACTED",
      ""
    ];
    let stepIdx = 0;
    element.textContent = steps[0];
    hackingHeaderInterval = setInterval(() => {
      stepIdx = (stepIdx + 1) % steps.length;
      element.textContent = steps[stepIdx];
    }, 450);
  }

  function stopHackingHeader() {
    if (hackingHeaderInterval) {
      clearInterval(hackingHeaderInterval);
      hackingHeaderInterval = null;
    }
  }

  function scrambleText(element, targetText, duration = 400) {
    const chars = "01010101XYZ#@$&%*+=-_";
    const length = targetText.length;
    let start = null;
    
    function step(timestamp) {
      if (!start) start = timestamp;
      const progress = Math.min(1, (timestamp - start) / duration);
      let result = "";
      for (let i = 0; i < length; i++) {
        if (targetText[i] === " " || targetText[i] === "\n" || targetText[i] === "/") {
          result += targetText[i];
        } else if (i < length * progress) {
          result += targetText[i];
        } else {
          result += chars[Math.floor(Math.random() * chars.length)];
        }
      }
      element.textContent = result;
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    }
    requestAnimationFrame(step);
  }

  function isProtocolSolved(id) {
    return progression.isSolved(id);
  }

  function completeProtocol(file) {
    const result = progression.completeProtocol(file);
    if (!result.completed) return;
    const unlockedSomething = result.newlyUnlocked.length > 0;
    renderProgress();
    renderRing();
    setParticlePulse(unlockedSomething ? 2.1 : 1.45);
    window.__ichiroWarp?.triggerShockwave(unlockedSomething ? 2.15 : 1.45);
    window.dispatchEvent(new CustomEvent("ichiro:pulse", {
      detail: {
        intensity: unlockedSomething ? 2.2 : 1.5,
        mode: "protocol",
      },
    }));
    tone("unlock");
  }

  const dossierProtocols = createDossierProtocolRunner({
    onSolved: completeProtocol,
    isSolved: isProtocolSolved,
    tone,
    setParticlePulse,
  });

  function initDossierMinigame(file) {
    dossierProtocols.mount(file, document.getElementById("case-minigame"));
  }

  function openFile(file) {
    const openResult = progression.recordOpen(file.id);
    if (!openResult.allowed) return;

    const browser = document.querySelector(".dossier-panel-browser");
    if (browser) {
      browser.classList.add("is-open");
    }

    renderProgress();
    renderRing();
    setParticlePulse(0.85);
    if (window.__ichiroWarp) {
      window.__ichiroWarp.triggerShockwave(1.15);
    }
    window.dispatchEvent(new CustomEvent("ichiro:pulse", {
      detail: {
        intensity: 0.9,
        mode: "open",
      },
    }));
    tone("open");

    // Blinking green hacking header loop
    const hackingHeader = document.getElementById("case-hacking-header");
    if (hackingHeader) {
      startHackingHeader(hackingHeader);
    }
    scrambleText(caseTitle, file.title, 450);
    scrambleText(caseStatus, `${file.status} // ${progression.isOpened(file.id) ? "recovered" : "available"}`, 400);

    caseViewer.classList.remove("case-viewer--memory");
    
    // Clear minigame container
    const minigameContainer = document.getElementById("case-minigame");
    if (minigameContainer) {
      minigameContainer.classList.add("hidden");
      minigameContainer.innerHTML = "";
    }

    placeholderList.innerHTML = "";

    const assetBundle = getDossierAssets(file.id);
    for (const [index, [kind, label]] of file.placeholders.entries()) {
      const evidence = assetBundle?.evidence?.[index] || null;

      if (evidence?.src) {
        const wrapper = document.createElement("div");
        wrapper.style.display = "flex";
        wrapper.style.justifyContent = "center";
        wrapper.style.width = "100%";
        const isVideo = evidence.mediaType === "motion"
          && /\.(?:mp4|webm)$/i.test(evidence.src);
        const media = isVideo
          ? `<video class="holo-img" src="${evidence.src}" aria-label="${escapeHtml(evidence.alt || label)}" muted loop autoplay playsinline preload="metadata"></video>`
          : `<img class="holo-img" src="${evidence.src}" alt="${escapeHtml(evidence.alt || label)}" loading="lazy" decoding="async" />`;
        wrapper.innerHTML = `
          <div class="holo-img-container">
            ${media}
            <div class="holo-scanlines"></div>
            <div class="holo-glare"></div>
          </div>
        `;
        placeholderList.append(wrapper);
      } else {
        const panel = document.createElement("div");
        panel.className = "placeholder";
        panel.innerHTML = `
          <span><em class="iridescent-label">${escapeHtml(kind)} archive window</em></span>
          <strong>${escapeHtml(label)}</strong>
        `;
        placeholderList.append(panel);
      }
    }

    renderAudioPlaceholder(file.audio, assetBundle?.audio);

    // Trigger subtle asset stack glitching specifically on images/placeholders
    const glitchTargets = caseViewer.querySelectorAll(".holo-img-container, .placeholder, .audio-placeholder");
    glitchTargets.forEach(el => el.classList.add("is-hacking"));

    const documentPages = caseViewer.querySelector(".document-pages");

    // Typewriter content typing
    if (dossierTypewriterTimer) {
      clearInterval(dossierTypewriterTimer);
      dossierTypewriterTimer = null;
    }
    caseContent.textContent = "";
    let idx = 0;
    const fullText = file.content;
    const typewriterStart = performance.now();
    
    dossierTypewriterTimer = setInterval(() => {
      idx = Math.min(fullText.length, Math.floor((performance.now() - typewriterStart) * 0.25));
      caseContent.textContent = fullText.slice(0, idx) + " \u2588";
      if (documentPages) {
        documentPages.scrollTop = documentPages.scrollHeight;
      }
      if (idx >= fullText.length) {
        clearInterval(dossierTypewriterTimer);
        dossierTypewriterTimer = null;
        caseContent.textContent = fullText; // remove terminal cursor block once complete
        
        // Stop glitching assets
        const stopGlitchTargets = caseViewer.querySelectorAll(".holo-img-container, .placeholder, .audio-placeholder");
        stopGlitchTargets.forEach(el => el.classList.remove("is-hacking"));
        
        // Stop hacking header loop and lock it
        stopHackingHeader();
        if (hackingHeader) {
          hackingHeader.textContent = "//HACKING . . . PROJECT REDACTED";
        }
        
        // Reveal Hex Decryption Minigame
        initDossierMinigame(file);
        
        if (documentPages) {
          documentPages.scrollTop = documentPages.scrollHeight;
        }
      }
    }, 16);

    showCaseViewer(panelRing?.querySelector(`[data-file-id="${file.id}"]`));
  }

  async function renderArchiveLoreSegments() {
    await renderLoreSegments({ archiveLoreSegments, archiveVideoLoreTabs });
  }

  async function openMemoryInterface() {
    setParticlePulse(2.4);
    window.dispatchEvent(new CustomEvent("ichiro:pulse", {
      detail: {
        intensity: 2.5,
        mode: "memory",
      },
    }));
    tone("unlock");
    const lore = await loadFullLore();
    caseTitle.textContent = "Ichiro Memory Reconstruction";
    caseStatus.textContent = "floating memory panel // full English lore reconstruction";
    caseViewer.classList.add("case-viewer--memory");
    caseContent.textContent = lore;

    placeholderList.innerHTML = "";
    const videoPanel = document.createElement("div");
    videoPanel.className = "placeholder memory-video-window";
    videoPanel.innerHTML = `<span><em class="iridescent-label">video archive window</em></span><strong>FULL LORE CINEMATIC / MEMORY RECONSTRUCTION VIDEO</strong>`;
    placeholderList.append(videoPanel);

    renderAudioPlaceholder("LOW SERVER ROOM / MEMORY PULSES / DISTANT BREATH");
    showCaseViewer(document.querySelector("#ichiro-memory"));
  }

  function showCaseViewer(returnFocus) {
    const returnFileId = returnFocus?.dataset?.fileId || "";
    const resolveReturnFocus = returnFileId
      ? () => panelRing?.querySelector(`[data-file-id="${returnFileId}"]`)
      : () => document.querySelector("#ichiro-memory");
    caseViewer.classList.remove("hidden");
    caseViewer.setAttribute("aria-hidden", "false");
    focusManager?.activate(caseViewer, {
      initialFocus: caseViewer.querySelector("button[data-close-case]"),
      onRequestClose: closeCase,
      returnFocus: resolveReturnFocus,
    });
  }

  function closeCase() {
    stopDossierAudio();
    caseViewer.classList.add("hidden");
    caseViewer.setAttribute("aria-hidden", "true");
    caseViewer.classList.remove("case-viewer--memory");
    focusManager?.deactivate(caseViewer);
    if (window.__magmaVisualizer) {
      window.__magmaVisualizer.destroy();
      window.__magmaVisualizer = null;
    }
  }

  function renderProgress() {
    finalMessage?.classList.toggle("hidden", !progression.getProgress().complete);
  }

  function openNextNarrativeFile() {
    const candidate = progression.findNextInvestigable();
    if (!candidate) {
      stopNarrative();
      return;
    }
    activeIndex = files.findIndex((file) => file.id === candidate.id);
    renderRing();
    openFile(candidate);
  }

  function openActiveFile() {
    openFile(files[activeIndex]);
  }

  return {
    animatePanels,
    closeCase,
    getActiveIndex,
    getArchiveFoldProgress,
    handleArchiveWheel,
    isPointerInArchiveSwordZone,
    openActiveFile,
    openFile,
    openMemoryInterface,
    openNextNarrativeFile,
    renderArchiveLoreSegments,
    renderProgress,
    renderRing,
    rotate,
    setArchiveFoldProgress,
  };
}
