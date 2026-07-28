let fullLoreText = "";
let archiveLoreRendered = false;
let theoriaNullaText = "";
let theExistenceText = "";
let messageFromTheExistenceText = "";

export async function loadFullLore() {
  if (fullLoreText) {
    return fullLoreText;
  }

  try {
    const [t1, t2, t3] = await Promise.all([
      fetch("assets/lore/theoria_nulla.txt").then((response) => response.text()),
      fetch("assets/lore/the_existence.txt").then((response) => response.text()),
      fetch("assets/lore/message_from_the_existence.txt").then((response) => response.text()),
    ]);
    theoriaNullaText = cleanLoreDocumentTitle(t1, 0);
    theExistenceText = cleanLoreDocumentTitle(t2, 1);
    messageFromTheExistenceText = cleanLoreDocumentTitle(t3, 2);
    fullLoreText = `${theoriaNullaText}\n\n========================================\n\n${theExistenceText}\n\n========================================\n\n${messageFromTheExistenceText}`;
  } catch (err) {
    console.error("Error loading lore files:", err);
    fullLoreText = "LORE FILE UNAVAILABLE. Recovered archive text could not be loaded.";
  }

  return fullLoreText;
}

export function cleanLoreDocumentTitle(text, index) {
  const cleaned = String(text || "").trim();
  if (index === 0) {
    return cleaned.replace(/^THEORIA NULLA\s*/i, "").trim();
  }
  if (index === 1) {
    return cleaned.replace(/^THE EXISTENCE\s*/i, "").trim();
  }
  if (index === 2) {
    return cleaned
      .replace(/^A MESSAGE FROM THE EXISTENCE\s*/i, "")
      .trim();
  }
  return cleaned;
}

export async function renderArchiveLoreSegments({ archiveLoreSegments, archiveVideoLoreTabs }) {
  if (!archiveLoreSegments || archiveLoreRendered) {
    return;
  }
  archiveLoreRendered = true;
  archiveLoreSegments.textContent = "";

  await loadFullLore();

  const parts = [theoriaNullaText, theExistenceText, messageFromTheExistenceText];
  const tabNames = ["THEORIA NULLA", "THE EXISTENCE", "MESSAGE FROM THE EXISTENCE"];

  if (archiveVideoLoreTabs) {
    archiveVideoLoreTabs.innerHTML = "";

    const tabsContainer = document.createElement("div");
    tabsContainer.className = "lore-tabs";
    tabsContainer.setAttribute("role", "tablist");

    const contentArea = document.createElement("div");
    contentArea.className = "lore-tab-content";
    contentArea.id = "archive-lore-tabpanel";
    contentArea.setAttribute("role", "tabpanel");
    contentArea.setAttribute("tabindex", "0");

    const activateTab = (index, { focus = false } = {}) => {
      const buttons = [...tabsContainer.querySelectorAll(".lore-tab-btn")];
      buttons.forEach((button, buttonIndex) => {
        const active = buttonIndex === index;
        button.classList.toggle("active", active);
        button.setAttribute("aria-selected", String(active));
        button.setAttribute("tabindex", active ? "0" : "-1");
      });
      const activeButton = buttons[index];
      contentArea.setAttribute("aria-labelledby", activeButton.id);
      populateSegments(parts[index], contentArea, "Section Part", index);
      contentArea.scrollTop = 0;
      if (focus) activeButton.focus({ preventScroll: true });
    };

    tabNames.forEach((name, index) => {
      const tabBtn = document.createElement("button");
      tabBtn.className = `lore-tab-btn ${index === 0 ? "active" : ""}`;
      tabBtn.id = `archive-lore-tab-${index}`;
      tabBtn.setAttribute("role", "tab");
      tabBtn.setAttribute("aria-selected", index === 0 ? "true" : "false");
      tabBtn.setAttribute("aria-controls", contentArea.id);
      tabBtn.setAttribute("tabindex", index === 0 ? "0" : "-1");
      tabBtn.setAttribute("data-tab", index);
      tabBtn.setAttribute("data-label", name);
      tabBtn.textContent = name;
      tabBtn.style.fontSize = "0.58rem";

      tabBtn.addEventListener("click", () => activateTab(index));
      tabBtn.addEventListener("keydown", (event) => {
        const lastIndex = tabNames.length - 1;
        const nextIndex = event.key === "ArrowRight" || event.key === "ArrowDown"
          ? (index + 1) % tabNames.length
          : event.key === "ArrowLeft" || event.key === "ArrowUp"
            ? (index + lastIndex) % tabNames.length
            : event.key === "Home"
              ? 0
              : event.key === "End"
                ? lastIndex
                : null;
        if (nextIndex === null) return;
        event.preventDefault();
        activateTab(nextIndex, { focus: true });
      });

      tabsContainer.append(tabBtn);
    });

    archiveVideoLoreTabs.append(tabsContainer, contentArea);
    activateTab(0);
  }

  populateSegments(fullLoreText, archiveLoreSegments, "Archive Part", -1);
}

function populateSegments(text, container, prefix = "Archive Part", tabIndex = -1) {
  container.innerHTML = "";
  if (!text) {
    return;
  }

  const paragraphs = text
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
  const chunks = [];
  let current = "";

  for (const paragraph of paragraphs) {
    if ((current + "\n\n" + paragraph).length > 1450 && current) {
      chunks.push(current);
      current = paragraph;
    } else {
      current = current ? `${current}\n\n${paragraph}` : paragraph;
    }
  }
  if (current) {
    chunks.push(current);
  }

  chunks.forEach((chunk, chunkIndex) => {
    const section = document.createElement("article");
    section.className = "archive-lore-part";
    section.innerHTML = `<h3>// ${prefix} ${String(chunkIndex + 1).padStart(2, "0")}</h3><p></p>`;
    section.querySelector("p").textContent = chunk;
    container.append(section);

    if (chunkIndex < chunks.length - 1) {
      container.append(createBetweenChunkSlot(chunkIndex, tabIndex));
    }
  });

  appendTabEndMedia(container, tabIndex);
}

function createBetweenChunkSlot(chunkIndex, tabIndex) {
  const slot = document.createElement("div");
  slot.className = "archive-lore-media-slot";

  if (tabIndex === 2 && chunkIndex === 0) {
    const img = document.createElement("img");
    img.src = "assets/lore/message_third.png";
    img.alt = "Consciousness alignment";
    img.style.width = "100%";
    img.style.borderRadius = "0px";
    img.style.display = "block";

    slot.style.minHeight = "auto";
    slot.style.overflow = "hidden";
    slot.style.position = "relative";
    slot.style.perspective = "1000px";
    slot.append(img);
    return slot;
  }

  if (tabIndex === 1 && chunkIndex === 0) {
    slot.className = "exist-audio-window";
    slot.style.border = "none";
    slot.style.background = "none";
    slot.style.minHeight = "auto";
    slot.textContent = "";

    const container = document.createElement("div");
    container.className = "exist-audio-container";

    const canvas = document.createElement("canvas");
    canvas.className = "exist-audio-canvas";

    const audio = document.createElement("audio");
    audio.src = "assets/audio/xxczxczs.mp3";
    audio.preload = "metadata";
    audio.crossOrigin = "anonymous";

    const controls = document.createElement("div");
    controls.className = "exist-audio-controls";

    const playBtn = document.createElement("button");
    playBtn.className = "exist-audio-play-btn";
    playBtn.type = "button";
    playBtn.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path class="play-icon" d="M8 5v14l11-7z"/></svg>`;

    const progressContainer = document.createElement("div");
    progressContainer.className = "exist-audio-progress-container";

    const progressBar = document.createElement("div");
    progressBar.className = "exist-audio-progress-bar";

    progressContainer.append(progressBar);
    controls.append(playBtn, progressContainer);
    container.append(canvas, audio, controls);
    slot.append(container);

    let animationFrameId = null;
    let audioCtx = null;
    let analyser = null;

    function initAudio() {
      if (audioCtx) return;
      try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioCtx.createMediaElementSource(audio);
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyser.connect(audioCtx.destination);
      } catch (err) {
        console.warn("Web Audio API warning:", err);
      }
    }

    playBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      initAudio();
      
      if (audioCtx && audioCtx.state === "suspended") {
        audioCtx.resume();
      }

      if (audio.paused) {
        audio.play().then(() => {
          if (window.pauseAmbientForMedia) {
            window.pauseAmbientForMedia();
          }
        }).catch(err => console.error("Error playing lore audio:", err));
      } else {
        audio.pause();
      }
    });

    audio.addEventListener("play", () => {
      playBtn.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path class="pause-icon" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;
      if (window.pauseAmbientForMedia) {
        window.pauseAmbientForMedia();
      }

      // EXCLUSIVE AUDIO: Pause archive video if it is playing
      const archiveVideo = document.getElementById("archive-video");
      if (archiveVideo && !archiveVideo.paused) {
        audio.dataset.wasVideoPlaying = "true";
        if (window.pauseArchiveVideoPlayback) {
          window.pauseArchiveVideoPlayback();
        }
      } else {
        audio.dataset.wasVideoPlaying = "false";
      }
    });

    function handleAudioStop() {
      playBtn.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path class="play-icon" d="M8 5v14l11-7z"/></svg>`;
      if (window.releaseArchiveVideoMediaHold) {
        window.releaseArchiveVideoMediaHold();
      }

      // EXCLUSIVE AUDIO: Resume archive video if it was playing before
      if (audio.dataset.wasVideoPlaying === "true") {
        audio.dataset.wasVideoPlaying = "false";
        if (window.resumeArchiveVideoPlayback) {
          window.resumeArchiveVideoPlayback();
        }
      }
    }

    audio.addEventListener("pause", handleAudioStop);
    audio.addEventListener("ended", handleAudioStop);

    audio.addEventListener("timeupdate", () => {
      if (audio.duration) {
        const pct = (audio.currentTime / audio.duration) * 100;
        progressBar.style.width = `${pct}%`;
      }
    });

    progressContainer.addEventListener("click", (e) => {
      e.stopPropagation();
      const rect = progressContainer.getBoundingClientRect();
      const pct = (e.clientX - rect.left) / rect.width;
      if (audio.duration) {
        audio.currentTime = pct * audio.duration;
      }
    });

    const ctx = canvas.getContext("2d");
    
    function resizeCanvas() {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width * (window.devicePixelRatio || 1);
      canvas.height = rect.height * (window.devicePixelRatio || 1);
      ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
    }
    
    setTimeout(resizeCanvas, 100);
    window.addEventListener("resize", resizeCanvas);

    function draw() {
      const width = canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.height / (window.devicePixelRatio || 1);
      if (width && height) {
        ctx.clearRect(0, 0, width, height);

        const dataArray = new Uint8Array(analyser ? analyser.frequencyBinCount : 0);
        if (analyser && !audio.paused) {
          analyser.getByteTimeDomainData(dataArray);
        }

        const time = performance.now() * 0.001;

        // Reset shadow properties for general canvas drawing safety
        ctx.shadowBlur = 0;

        for (let layer = 0; layer < 3; layer++) {
          ctx.beginPath();
          const offsetMultiplier = (layer - 1) * 8; // Offset layers: -8px, 0px, +8px
          const speed = time * (1.1 + layer * 0.45);

          const grad = ctx.createLinearGradient(0, 0, width, 0);
          if (layer === 0) {
            grad.addColorStop(0, "rgba(81, 24, 172, 0.45)");
            grad.addColorStop(0.5, "rgba(151, 110, 255, 0.65)");
            grad.addColorStop(1, "rgba(255, 111, 212, 0.45)");
            ctx.shadowBlur = 6;
            ctx.shadowColor = "rgba(151, 110, 255, 0.85)";
          } else if (layer === 1) {
            grad.addColorStop(0, "rgba(151, 110, 255, 0.6)");
            grad.addColorStop(0.5, "rgba(255, 255, 255, 0.85)");
            grad.addColorStop(1, "rgba(122, 168, 255, 0.6)");
            ctx.shadowBlur = 6;
            ctx.shadowColor = "rgba(255, 255, 255, 0.9)";
          } else {
            grad.addColorStop(0, "rgba(255, 255, 255, 0.15)");
            grad.addColorStop(0.5, "rgba(255, 255, 255, 0.75)");
            grad.addColorStop(1, "rgba(151, 110, 255, 0.15)");
            ctx.shadowBlur = 6;
            ctx.shadowColor = "rgba(151, 110, 255, 0.4)";
          }

          ctx.strokeStyle = grad;
          ctx.lineWidth = layer === 1 ? 3 : 1.5;

          // Resolution step set to 1 for high quality waves
          // Use internal margin to prevent clipping at edges
          const margin = width * 0.04;
          const drawWidth = width - margin * 2;
          for (let x = 0; x <= drawWidth; x += 1) {
            const ratio = x / drawWidth;
            // Edge fade envelope: smooth sine window prevents hard cuts at edges
            const edgeFade = Math.sin(ratio * Math.PI);
            let y = Math.sin(ratio * Math.PI * 2.2 + speed) * 8;
            y += Math.cos(ratio * Math.PI * 3.6 - speed * 1.3) * 3;
            y += Math.sin(ratio * Math.PI * 7.2 + speed * 0.9) * 1;

            if (dataArray.length > 0) {
              const dataIndex = Math.floor(ratio * (dataArray.length - 1));
              const audioVal = (dataArray[dataIndex] - 128) / 128;
              y += audioVal * 24 * edgeFade;
            } else {
              y *= 1.0 + Math.sin(time * 1.5) * 0.12;
            }

            // Apply edge fade to dampen wave amplitude near borders
            y *= edgeFade;

            // Reduced perspective distortion to keep waves within canvas
            const z = Math.sin(ratio * Math.PI + speed * 0.4) * 4 - (layer - 1) * 6;
            const scale = 200 / (200 - z);
            const actualX = margin + x;
            const finalX = width / 2 + (actualX - width / 2) * scale;
            const finalY = height / 2 + (y + offsetMultiplier) * scale;

            if (x === 0) {
              ctx.moveTo(finalX, finalY);
            } else {
              ctx.lineTo(finalX, finalY);
            }
          }
          ctx.stroke();
        }
        
        // Clean up shadow properties after loop to prevent side effects
        ctx.shadowBlur = 0;
      }
      animationFrameId = requestAnimationFrame(draw);
    }
    
    draw();

    const observer = new MutationObserver(() => {
      if (!document.body.contains(container)) {
        cancelAnimationFrame(animationFrameId);
        window.removeEventListener("resize", resizeCanvas);
        audio.pause();
        if (window.releaseArchiveVideoMediaHold) {
          window.releaseArchiveVideoMediaHold();
        }
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return slot;
  }

  slot.textContent = `Media insert ${String(chunkIndex + 1).padStart(2, "0")} / image or video`;
  return slot;
}

function appendTabEndMedia(container, tabIndex) {
  const mediaByTab = {
    0: {
      src: "assets/lore/everything3.png",
      alt: "Everything 3 blueprint",
    },
    1: {
      src: "assets/lore/the_existence_eyes.png",
      alt: "The Existence White Eyes",
    },
    2: {
      src: "assets/lore/message_second.png",
      alt: "The Existence Speak",
    },
  };
  const media = mediaByTab[tabIndex];
  if (!media) {
    return;
  }

  const slot = document.createElement("div");
  slot.className = "archive-lore-media-slot";
  slot.style.minHeight = "auto";
  slot.style.overflow = "hidden";
  slot.style.position = "relative";
  slot.style.perspective = "1000px";

  const img = document.createElement("img");
  img.src = media.src;
  img.alt = media.alt;
  img.style.width = "100%";
  img.style.borderRadius = "0px"; // Clip to container bounds
  img.style.display = "block";
  img.style.marginTop = "0px"; // Rely on container padding/grid

  slot.append(img);
  container.append(slot);
}
