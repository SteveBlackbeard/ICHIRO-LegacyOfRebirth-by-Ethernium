import { readRuntimePhase } from "./runtime-phase.js?v=kpr-lifecycle-core-230";

export function createKpcoLogoRenderer({
  video,
  accessCanvas,
  hackCanvas,
  archiveCanvas,
  accessSlot,
  hackSlot,
  archiveSlot,
  getMotionQuality,
  getPageVisible,
  isAdaptivePerformance = () => false,
  getRuntimePhase = () => readRuntimePhase(),
}) {
  let raf = null;
  let ready = false;
  let lastFrame = 0;
  let idleTimer = null;
  let running = false;
  let gestureBound = false;

  // ── Shared source canvas for CPU chroma-key extraction ──────────────────────
  // Created lazily; willReadFrequently is critical for getImageData performance.
  let sourceCanvas = null;
  let sourceCtx = null;

  function ensureSource(width, height) {
    if (!sourceCanvas) {
      sourceCanvas = document.createElement("canvas");
      sourceCtx = sourceCanvas.getContext("2d", { willReadFrequently: true });
    }
    if (sourceCanvas.width !== width || sourceCanvas.height !== height) {
      sourceCanvas.width = width;
      sourceCanvas.height = height;
    }
  }

  // ── Chroma-key: removes bright neutral / near-white background pixels ────────
  // Tuned for kpco-logo.mp4 which was shot on a white light background.
  // Luma threshold 232 → fully transparent; 206-232 → partial fade.
  function applyChromaKey(pixels) {
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const luma = r * 0.2126 + g * 0.7152 + b * 0.0722;
      const spread = Math.max(r, g, b) - Math.min(r, g, b);
      const isNeutral = spread < 34;

      if ((isNeutral && luma > 232) || (r > 246 && g > 246 && b > 238)) {
        pixels[i + 3] = 0;
      } else if ((isNeutral && luma > 206) || (r > 226 && g > 226 && b > 216)) {
        const t = Math.max(0, Math.min(1, (luma - 206) / 26));
        pixels[i + 3] = Math.round(pixels[i + 3] * (1 - t * 0.68));
      }
    }
  }

  // ── Extract opaque bounding box for the archive logo tight-crop ─────────────
  function getOpaqueBounds(pixels, width, height) {
    let minX = width, minY = height, maxX = 0, maxY = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i + 3] > 18) {
        const idx = i >> 2;
        const x = idx % width;
        const y = (idx / width) | 0;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
    return { minX, minY, maxX, maxY };
  }

  // ── Initial Yatagarasu Logo Fluid Z-Impact & Red Wave Grid Physics ──────────
  let activeRipples = [];
  let impactTriggered = false;
  let particles = [];

  function updateYatagarasuPhysics(width, height, now) {
    const cycleDuration = 3600; // 3.6 second loop
    const phase = (now % cycleDuration) / cycleDuration; // [0, 1)

    let zScale = 1.0;
    let isImpactFrame = false;

    if (phase < 0.78) {
      // Phase 1: Slow retreat backwards in 3D Z-space (1.0 -> 0.46)
      const p = phase / 0.78;
      zScale = 1.0 - 0.54 * Math.sin(p * Math.PI * 0.5);
      impactTriggered = false;
    } else if (phase < 0.90) {
      // Phase 2: Abrupt snap launch forward with high kinetic velocity (0.46 -> 1.0)
      const p = (phase - 0.78) / 0.12;
      const easeSnap = p * p * p; // Cubic acceleration snap
      zScale = 0.46 + 0.54 * easeSnap;
      if (p > 0.85 && !impactTriggered) {
        impactTriggered = true;
        isImpactFrame = true;
      }
    } else {
      // Phase 3: Fluid impact reaction & elastic compression bounce (1.0 -> 1.06 -> 1.0)
      const p = (phase - 0.90) / 0.10;
      zScale = 1.0 + 0.06 * Math.sin(p * Math.PI) * (1 - p);
    }

    // Trigger viscous fluid shockwave on impact frame
    if (isImpactFrame) {
      activeRipples.push({
        birth: now,
        maxRadius: Math.max(width, height) * 0.72,
        speed: 0.38, // Heavy viscous liquid wave speed
      });

      // Spawn 28 red digital energy particles on impact
      for (let i = 0; i < 28; i++) {
        const angle = (i / 28) * Math.PI * 2 + (Math.random() - 0.5) * 0.2;
        const speed = 2.5 + Math.random() * 4.5;
        particles.push({
          x: width / 2,
          y: height / 2,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1.0,
          decay: 0.02 + Math.random() * 0.02,
          size: 1.5 + Math.random() * 2.5,
        });
      }
    }

    return zScale;
  }

  function drawYatagarasuFluidRipples(ctx, width, height, now) {
    const cx = width / 2;
    const cy = height / 2;

    // 1. Render active fluid wave shockwaves with Red Digitalization Grid
    for (let i = activeRipples.length - 1; i >= 0; i--) {
      const rip = activeRipples[i];
      const age = now - rip.birth;
      const radius = age * rip.speed;
      const life = 1 - radius / rip.maxRadius;

      if (life <= 0) {
        activeRipples.splice(i, 1);
        continue;
      }

      ctx.save();

      // Viscous liquid wave refraction glow
      const grad = ctx.createRadialGradient(cx, cy, Math.max(0, radius - 20), cx, cy, radius + 20);
      grad.addColorStop(0, "rgba(255, 30, 60, 0)");
      grad.addColorStop(0.5, `rgba(255, 45, 75, ${0.75 * life})`);
      grad.addColorStop(0.8, `rgba(255, 120, 40, ${0.45 * life})`);
      grad.addColorStop(1, "rgba(255, 30, 60, 0)");

      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.lineWidth = 14 * life;
      ctx.strokeStyle = grad;
      ctx.stroke();

      // Red Digitalization Radial Matrix Grid lines ("hondeo digitalizado rojo")
      const gridRings = 4;
      ctx.lineWidth = 1.2;
      for (let r = 0; r < gridRings; r++) {
        const ringRad = radius - r * 14;
        if (ringRad <= 0) continue;

        ctx.strokeStyle = `rgba(255, 35, 65, ${0.65 * life * (1 - r * 0.22)})`;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(cx, cy, ringRad, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // Radial matrix beam sweep
      const spokes = 12;
      ctx.strokeStyle = `rgba(255, 50, 70, ${0.35 * life})`;
      for (let s = 0; s < spokes; s++) {
        const ang = (s / spokes) * Math.PI * 2 + age * 0.001;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(ang) * (radius * 0.3), cy + Math.sin(ang) * (radius * 0.3));
        ctx.lineTo(cx + Math.cos(ang) * radius, cy + Math.sin(ang) * radius);
        ctx.stroke();
      }

      ctx.restore();
    }

    // 2. Render Red Holographic Digital Particles & Sparks
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.94; // Viscous liquid resistance damping
      p.vy *= 0.94;
      p.life -= p.decay;

      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.fillStyle = `rgba(255, 55, 75, ${p.life})`;
      ctx.shadowColor = "rgba(255, 30, 60, 0.9)";
      ctx.shadowBlur = 8;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      ctx.restore();
    }
  }

  // ── Phase detection for adaptive cadence ────────────────────────────────────
  function getFrameBudget() {
    const baseBudget = getMotionQuality() === "high" ? 16.6 : 33.3;
    if (!isAdaptivePerformance()) return baseBudget;
    const phase = getRuntimePhase();
    if (phase === "prelaunch" || phase === "hack-intro") return Math.max(baseBudget, 33.3);
    if (phase === "access-terminal") return Math.max(baseBudget, 25);
    if (phase === "archive-video") return Math.max(baseBudget, 33.3);
    return Math.max(baseBudget, 25);
  }

  function scheduleNext(delay = 0) {
    if (!running) return;
    if (delay > 0 && isAdaptivePerformance()) {
      idleTimer = window.setTimeout(() => {
        idleTimer = null;
        if (!running) return;
        raf = window.requestAnimationFrame(drawFrame);
      }, delay);
      return;
    }
    raf = window.requestAnimationFrame(drawFrame);
  }

  function isSlotVisible(slot) {
    if (!slot) return false;
    if (!isAdaptivePerformance()) return true;
    const rect = slot.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return false;
    const margin = 100;
    if (rect.bottom < -margin || rect.top > window.innerHeight + margin ||
        rect.right < -margin || rect.left > window.innerWidth + margin) return false;
    const style = window.getComputedStyle(slot);
    const isReady = slot.classList.contains("is-ready");
    return style.display !== "none" && style.visibility !== "hidden" &&
      (isReady ? Number(style.opacity || 1) > 0.01 : true);
  }

  function getTargets() {
    if (!isAdaptivePerformance()) {
      return [
        { canvas: accessCanvas, kind: "standard" },
        { canvas: hackCanvas, kind: "standard" },
        { canvas: archiveCanvas, kind: "archive" },
      ].filter((t) => t.canvas);
    }
    return [
      { canvas: accessCanvas, slot: accessSlot, kind: "standard" },
      { canvas: hackCanvas, slot: hackSlot, kind: "standard" },
      { canvas: archiveCanvas, slot: archiveSlot, kind: "archive" },
    ].filter((t) => t.canvas && isSlotVisible(t.slot));
  }

  // ── Main render loop ─────────────────────────────────────────────────────────
  function drawFrame() {
    raf = null;
    if (!running) return;
    if (!getPageVisible()) { scheduleNext(250); return; }
    if (!video || (!accessCanvas && !hackCanvas && !archiveCanvas) || video.readyState < 2) {
      scheduleNext(isAdaptivePerformance() ? 120 : 0);
      return;
    }

    const now = performance.now();
    const frameBudget = getFrameBudget();
    document.documentElement.dataset.kprKpcoFrameBudget = String(frameBudget);
    if (now - lastFrame < frameBudget) { scheduleNext(); return; }

    const targets = getTargets();
    if (isAdaptivePerformance() && targets.length === 0 && ready) {
      lastFrame = now;
      scheduleNext(180);
      return;
    }
    lastFrame = now;

    const naturalWidth = video.videoWidth || 256;
    const naturalHeight = video.videoHeight || 256;
    const maxWidth = getMotionQuality() === "high" ? 700 : 540;
    const scale = Math.min(1, maxWidth / naturalWidth);
    const width = Math.max(1, Math.round(naturalWidth * scale));
    const height = Math.max(1, Math.round(naturalHeight * scale));

    const isWebM = video.src.includes("transparent.webm") || video.currentSrc.includes("transparent.webm");

    // ── Extract & chroma-key source frame once per tick ──────────────────────
    ensureSource(width, height);
    sourceCtx.clearRect(0, 0, width, height);
    sourceCtx.drawImage(video, 0, 0, width, height);
    
    let frameData = null;
    if (!isWebM) {
      frameData = sourceCtx.getImageData(0, 0, width, height);
      applyChromaKey(frameData.data);
      sourceCtx.putImageData(frameData, 0, 0);
    }

    // ── Standard slots (access terminal + hack intro) ────────────────────────
    for (const { canvas } of targets.filter((t) => t.kind === "standard")) {
      if (!canvas) continue;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      const ctx = canvas.kpcoCtx ||= canvas.getContext("2d");
      ctx.clearRect(0, 0, width, height);

      if (canvas === hackCanvas) {
        // EXCLUSIVELY for INITIAL YATAGARASU LOGO (above INITIALIZE HACK rhombus button)
        const zScale = updateYatagarasuPhysics(width, height, now);

        // Draw fluid wave shockwaves & red digital matrix grid background
        drawYatagarasuFluidRipples(ctx, width, height, now);

        // Draw Yatagarasu initial logo centered with dynamic zScale motion
        ctx.save();
        ctx.translate(width / 2, height / 2);
        ctx.scale(zScale, zScale);
        ctx.drawImage(sourceCanvas, -width / 2, -height / 2, width, height);
        ctx.restore();
      } else {
        // accessCanvas (access terminal KPCO logo) is completely CLEAN 1:1 original static rendering
        if (isWebM) {
          ctx.drawImage(sourceCanvas, 0, 0);
        } else {
          ctx.putImageData(frameData, 0, 0);
        }
      }
    }

    // ── Archive slot: tight-crop to opaque region for max visual size ────────
    const archiveTarget = targets.find((t) => t.kind === "archive");
    if (archiveTarget?.canvas) {
      const canvas = archiveTarget.canvas;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      const ctx = canvas.kpcoCtx ||= canvas.getContext("2d");
      ctx.clearRect(0, 0, width, height);

      if (isWebM) {
        const webmData = sourceCtx.getImageData(0, 0, width, height);
        const { minX, minY, maxX, maxY } = getOpaqueBounds(webmData.data, width, height);
        if (maxX > minX && maxY > minY) {
          const pad = Math.max(4, Math.round(Math.max(maxX - minX, maxY - minY) * 0.08));
          const sx = Math.max(0, minX - pad);
          const sy = Math.max(0, minY - pad);
          const sw = Math.min(width - sx, maxX - minX + pad * 2);
          const sh = Math.min(height - sy, maxY - minY + pad * 2);
          const s = Math.min(width / sw, height / sh) * 0.9;
          ctx.drawImage(sourceCanvas, sx, sy, sw, sh,
            (width - sw * s) / 2, (height - sh * s) / 2, sw * s, sh * s);
        } else {
          ctx.drawImage(sourceCanvas, 0, 0);
        }
      } else {
        const { minX, minY, maxX, maxY } = getOpaqueBounds(frameData.data, width, height);
        if (maxX > minX && maxY > minY) {
          const pad = Math.max(4, Math.round(Math.max(maxX - minX, maxY - minY) * 0.08));
          const sx = Math.max(0, minX - pad);
          const sy = Math.max(0, minY - pad);
          const sw = Math.min(width - sx, maxX - minX + pad * 2);
          const sh = Math.min(height - sy, maxY - minY + pad * 2);
          const s = Math.min(width / sw, height / sh) * 0.9;
          ctx.drawImage(sourceCanvas, sx, sy, sw, sh,
            (width - sw * s) / 2, (height - sh * s) / 2, sw * s, sh * s);
        } else {
          ctx.putImageData(frameData, 0, 0);
        }
      }
    }

    if (!ready) {
      ready = true;
      accessSlot?.classList.add("is-ready");
      hackSlot?.classList.add("is-ready");
      archiveSlot?.classList.add("is-ready");
    }
    scheduleNext();
  }

  function unbindPlaybackGesture() {
    if (!gestureBound) return;
    gestureBound = false;
    window.removeEventListener("click", playVideo);
    window.removeEventListener("touchstart", playVideo);
    window.removeEventListener("keydown", playVideo);
  }

  function playVideo() {
    if (!running) return;
    video.play().then(unbindPlaybackGesture).catch(() => {});
  }

  function bindPlaybackGesture() {
    if (gestureBound) return;
    gestureBound = true;
    window.addEventListener("click", playVideo);
    window.addEventListener("touchstart", playVideo);
    window.addEventListener("keydown", playVideo);
  }

  function start() {
    if (!video || (!accessCanvas && !hackCanvas && !archiveCanvas)) return;
    if (running) return;
    running = true;

    video.muted = true;
    video.loop = true;
    video.playsInline = true;

    video.play().then(unbindPlaybackGesture).catch(bindPlaybackGesture);

    if (!raf && !idleTimer) drawFrame();
  }

  function pause() {
    running = false;
    if (raf) window.cancelAnimationFrame(raf);
    if (idleTimer) window.clearTimeout(idleTimer);
    raf = null;
    idleTimer = null;
    unbindPlaybackGesture();
    video?.pause();
  }

  function destroy() {
    pause();
    sourceCanvas = null;
    sourceCtx = null;
    activeRipples.length = 0;
    particles.length = 0;
  }

  return { destroy, pause, resume: start, start };
}
