export function createParticleSystem({
  dotCanvas,
  dotFrontCanvas,
  ichiroCanvas,
  getMotionQuality,
  getPageVisible,
  getAuthenticated,
  seedHackRain,
}) {
  const dotCtx = dotCanvas.getContext("2d");
  const dotFrontCtx = dotFrontCanvas.getContext("2d");
  const ichiroCtx = ichiroCanvas.getContext("2d");
  const dots = [];
  const ichiroParticles = [];
  let animationRaf = null;
  let particlePulse = 0;
  let lastDotFrame = 0;

  function getParticleFrameBudget() {
    if (document.body.classList.contains("authenticated")) {
      return 100;
    }
    const quality = getMotionQuality();
    if (quality === "high") return 8.2;
    if (quality === "balanced") return 16.2;
    return 24;
  }

  function resizeCanvases() {
    const motionQuality = getMotionQuality();
    const ratioLimit = motionQuality === "high" ? 1.65 : 1.25;
    const ratio = Math.min(window.devicePixelRatio || 1, ratioLimit);
    for (const canvas of [dotCanvas, dotFrontCanvas, ichiroCanvas]) {
      canvas.width = Math.floor(window.innerWidth * ratio);
      canvas.height = Math.floor(window.innerHeight * ratio);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
    }
    dotCtx.setTransform(ratio, 0, 0, ratio, 0, 0);
    dotFrontCtx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ichiroCtx.setTransform(ratio, 0, 0, ratio, 0, 0);
    seedDots();
    seedIchiroParticles();
    seedHackRain();
  }

  function seedDots() {
    dots.length = 0;
    const motionQuality = getMotionQuality();
    const palette = [
      "rgba(210, 255, 196, 0.62)",
      "rgba(246, 250, 238, 0.54)",
      "rgba(255, 174, 68, 0.52)",
      "rgba(114, 246, 232, 0.48)",
    ];
    const area = window.innerWidth * window.innerHeight;
    const density = motionQuality === "high" ? 1 : 0.62;
    const backCount = Math.floor(Math.max(116, Math.floor(area / 7600)) * density);
    const frontCount = Math.min(motionQuality === "high" ? 6 : 4, Math.max(2, Math.floor(area / 260000)));

    for (let index = 0; index < backCount; index += 1) {
      const ratio = index / backCount;
      const big = ratio < 0.16;
      const mid = !big && ratio < 0.44;
      const depth = Math.random();
      const speed = big
        ? 0.7 + Math.random() * 0.52
        : mid
          ? 0.54 + Math.random() * 0.42
          : 0.28 + depth * 0.38;
      const angle = 0.13 + Math.random() * 0.12;
      dots.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        layer: "back",
        vx: Math.sin(angle) * speed + (Math.random() - 0.5) * 0.014,
        vy: Math.cos(angle) * speed,
        gravity: 0.0008 + Math.random() * 0.0014,
        drag: 0.997 + Math.random() * 0.0015,
        length: big
          ? 28 + Math.random() * 32
          : mid
            ? 16 + Math.random() * 22
            : 8 + Math.random() * 14,
        width: big
          ? 1.1 + Math.random() * 0.82
          : mid
            ? 0.66 + Math.random() * 0.48
            : 0.34 + Math.random() * 0.32,
        alpha: big
          ? 0.5 + Math.random() * 0.24
          : mid
            ? 0.36 + Math.random() * 0.22
            : 0.22 + Math.random() * 0.16,
        color: palette[Math.floor(Math.random() * palette.length)],
        glow: big
          ? 24 + Math.random() * 20
          : mid
            ? 13 + Math.random() * 13
            : 6 + Math.random() * 8,
        phase: Math.random() * Math.PI * 2,
        sway: 0.006 + Math.random() * 0.02,
        flicker: 0.82 + Math.random() * 0.28,
        heat: 0.72 + Math.random() * 0.28,
        breakup: Math.random() > 0.86,
        seed: Math.random() * Math.PI * 2,
        big: big,
      });
    }

    for (let index = 0; index < frontCount; index += 1) {
      const speed = 0.82 + Math.random() * 0.74;
      const angle = 0.16 + Math.random() * 0.16;
      dots.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        layer: "front",
        vx: Math.sin(angle) * speed + (Math.random() - 0.5) * 0.03,
        vy: Math.cos(angle) * speed,
        gravity: 0.0018 + Math.random() * 0.0022,
        drag: 0.997 + Math.random() * 0.0015,
        length: 132 + Math.random() * 126,
        width: 4.8 + Math.random() * 3.8,
        alpha: 0.36 + Math.random() * 0.24,
        color: palette[Math.floor(Math.random() * palette.length)],
        glow: 74 + Math.random() * 58,
        phase: Math.random() * Math.PI * 2,
        sway: 0.018 + Math.random() * 0.048,
        flicker: 0.78 + Math.random() * 0.32,
        heat: 0.88 + Math.random() * 0.12,
        breakup: true,
        seed: Math.random() * Math.PI * 2,
        big: true,
      });
    }
  }

  function seedIchiroParticles() {
    ichiroParticles.length = 0;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const cx = w / 2;
    const cy = h / 2 + 8;
    const scale = Math.min(w, h) / 720;

    const shapes = [
      { type: "ellipse", count: 86, x: 0, y: -154, rx: 34, ry: 42 },
      { type: "ellipse", count: 145, x: 0, y: -60, rx: 47, ry: 96 },
      { type: "line", count: 60, x1: -44, y1: -100, x2: -88, y2: 34 },
      { type: "line", count: 60, x1: 44, y1: -100, x2: 88, y2: 34 },
      { type: "line", count: 66, x1: -25, y1: 30, x2: -54, y2: 172 },
      { type: "line", count: 66, x1: 25, y1: 30, x2: 54, y2: 172 },
    ];

    for (const shape of shapes) {
      for (let i = 0; i < shape.count; i += 1) {
        let tx = 0;
        let ty = 0;

        if (shape.type === "ellipse") {
          const angle = Math.random() * Math.PI * 2;
          const radius = Math.sqrt(Math.random());
          tx = shape.x + Math.cos(angle) * shape.rx * radius;
          ty = shape.y + Math.sin(angle) * shape.ry * radius;
        } else {
          const t = Math.random();
          tx = shape.x1 + (shape.x2 - shape.x1) * t + (Math.random() - 0.5) * 15;
          ty = shape.y1 + (shape.y2 - shape.y1) * t + (Math.random() - 0.5) * 15;
        }

        ichiroParticles.push({
          x: cx + (Math.random() - 0.5) * w,
          y: cy + (Math.random() - 0.5) * h,
          tx: cx + tx * scale,
          ty: cy + ty * scale,
          drift: Math.random() * Math.PI * 2,
          speed: 0.018 + Math.random() * 0.025,
          size: 1 + Math.random() * 2.2,
          amber: Math.random() > 0.72,
        });
      }
    }
  }

  function shouldRunCanvasLoop() {
    return getPageVisible()
      && !document.body.classList.contains("prelaunch")
      && !document.body.classList.contains("intro-active")
      && !document.body.classList.contains("authenticated");
  }

  function clearParticleCanvases() {
    dotCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    dotFrontCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    ichiroCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  }

  function animate(now = 0) {
    if (!shouldRunCanvasLoop()) {
      clearParticleCanvases();
      animationRaf = null;
      lastDotFrame = 0;
      return;
    }
    const frameBudget = getParticleFrameBudget();
    document.documentElement.dataset.kprParticleFrameBudget = String(frameBudget);
    if (lastDotFrame && now - lastDotFrame < frameBudget) {
      animationRaf = requestAnimationFrame(animate);
      return;
    }
    const elapsed = lastDotFrame ? now - lastDotFrame : 16.67;
    lastDotFrame = now;
    drawDots(Math.min(2.2, Math.max(0.6, elapsed / 16.67)));
    animationRaf = requestAnimationFrame(animate);
  }

  function startCanvasLoop() {
    if (!shouldRunCanvasLoop()) {
      clearParticleCanvases();
      animationRaf = null;
      return;
    }
    if (!animationRaf) {
      animationRaf = requestAnimationFrame(animate);
    }
  }

  function drawDots(stepScale = 1) {
    dotCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    dotFrontCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    if (document.body.classList.contains("intro-active") || document.body.classList.contains("authenticated")) {
      return;
    }

    drawDotLayer(dotCtx, "back", stepScale);
    drawDotLayer(dotFrontCtx, "front", stepScale);
  }

  function drawDotLayer(ctx, layer, stepScale) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    for (const dot of dots) {
      if (dot.layer !== layer) {
        continue;
      }

      dot.vy += dot.gravity * stepScale;
      dot.vy *= Math.pow(dot.drag, stepScale);
      dot.phase += (0.012 + dot.vy * 0.006) * stepScale;
      dot.x += (dot.vx + Math.sin(dot.phase) * dot.sway) * stepScale;
      dot.y += dot.vy * stepScale;

      if (dot.y > window.innerHeight + dot.length + 12) {
        dot.y = -dot.length - Math.random() * 80;
        dot.x = Math.random() * window.innerWidth;
        const resetSpeed = dot.layer === "front" ? 0.8 + Math.random() * 0.75 : 0.28 + Math.random() * 0.85;
        const resetAngle = dot.layer === "front" ? 0.16 + Math.random() * 0.16 : 0.13 + Math.random() * 0.12;
        dot.vy = Math.cos(resetAngle) * resetSpeed;
        dot.vx = Math.sin(resetAngle) * resetSpeed + (Math.random() - 0.5) * 0.018;
      }
      if (dot.x < -40) {
        dot.x = window.innerWidth + 30;
      } else if (dot.x > window.innerWidth + 40) {
        dot.x = -30;
      }

      const magnitude = Math.max(0.001, Math.hypot(dot.vx, dot.vy));
      const directionX = dot.vx / magnitude;
      const directionY = dot.vy / magnitude;
      const tailX = dot.x - directionX * dot.length - Math.sin(dot.phase) * dot.length * 0.018;
      const tailY = dot.y - directionY * dot.length;

      const shimmer = 0.84 + Math.sin(dot.phase * dot.flicker) * 0.16;
      ctx.globalAlpha = dot.alpha * shimmer;

      // Optimización: Evitar la creación costosa de gradientes y sombras para partículas pequeñas/medianas
      if (dot.big) {
        const gradient = ctx.createLinearGradient(tailX, tailY, dot.x, dot.y);
        gradient.addColorStop(0, "rgba(255, 255, 255, 0)");
        gradient.addColorStop(0.38, "rgba(88, 172, 255, 0.035)");
        gradient.addColorStop(0.68, dot.color);
        gradient.addColorStop(0.9, "rgba(255, 198, 108, 0.86)");
        gradient.addColorStop(1, "rgba(255, 255, 246, 1)");
        ctx.strokeStyle = gradient;

        ctx.shadowBlur = dot.glow;
        ctx.shadowColor = dot.color;
        ctx.globalAlpha = dot.alpha * shimmer * 0.13;
        ctx.lineWidth = dot.width * 5.8;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.quadraticCurveTo(
          tailX + (dot.x - tailX) * 0.58 - directionY * Math.sin(dot.phase + dot.seed) * 3.5,
          tailY + (dot.y - tailY) * 0.58 + directionX * Math.sin(dot.phase + dot.seed) * 3.5,
          dot.x,
          dot.y,
        );
        ctx.stroke();
      } else {
        ctx.strokeStyle = dot.color;
        ctx.shadowBlur = 0;
      }

      ctx.globalAlpha = dot.alpha * shimmer;
      ctx.lineWidth = dot.width;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.quadraticCurveTo(
        tailX + (dot.x - tailX) * 0.62 - directionY * Math.sin(dot.phase + dot.seed) * (dot.big ? 2.2 : 0.6),
        tailY + (dot.y - tailY) * 0.62 + directionX * Math.sin(dot.phase + dot.seed) * (dot.big ? 2.2 : 0.6),
        dot.x,
        dot.y,
      );
      ctx.stroke();

      if (dot.big) {
        ctx.shadowBlur = dot.glow * 0.28;
        ctx.shadowColor = "rgba(92, 228, 255, 0.92)";
        ctx.globalAlpha = dot.alpha * 0.42;
        ctx.strokeStyle = "rgba(106, 224, 255, 0.82)";
        ctx.lineWidth = Math.max(0.55, dot.width * 0.34);
        ctx.beginPath();
        ctx.moveTo(
          tailX + directionX * dot.length * 0.28,
          tailY + directionY * dot.length * 0.28,
        );
        ctx.lineTo(dot.x, dot.y);
        ctx.stroke();

        ctx.globalAlpha = dot.alpha * dot.heat;
        ctx.fillStyle = "rgba(255, 251, 226, 0.98)";
        ctx.shadowBlur = dot.glow * 0.52;
        ctx.shadowColor = "rgba(255, 167, 76, 0.92)";
        ctx.beginPath();
        ctx.ellipse(
          dot.x,
          dot.y,
          dot.width * 0.72,
          dot.width * 1.18,
          -Math.atan2(directionX, directionY),
          0,
          Math.PI * 2,
        );
        ctx.fill();

        if (dot.breakup) {
          ctx.fillStyle = "rgba(255, 207, 126, 0.88)";
          ctx.shadowBlur = 8;
          for (let fragment = 1; fragment <= 3; fragment += 1) {
            const separation = fragment * (6 + dot.width);
            const scatter = Math.sin(dot.seed + dot.phase * 1.7 + fragment) * (2 + fragment * 1.4);
            ctx.globalAlpha = dot.alpha * (0.34 / fragment) * shimmer;
            ctx.beginPath();
            ctx.arc(
              dot.x - directionX * separation + directionY * scatter,
              dot.y - directionY * separation - directionX * scatter,
              Math.max(0.45, dot.width * (0.22 / fragment)),
              0,
              Math.PI * 2,
            );
            ctx.fill();
          }
        }
      }
    }

    ctx.restore();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  function drawIchiro(now) {
    ichiroCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    if (!getAuthenticated() || document.body.classList.contains("three-ready")) {
      return;
    }

    const breathing = Math.sin(now * 2) * 2.2;
    particlePulse = Math.max(0, particlePulse - 0.012);

    ichiroCtx.save();
    ichiroCtx.shadowBlur = 16 + particlePulse * 22;

    for (const particle of ichiroParticles) {
      const jitter = 3 + particlePulse * 18;
      const targetX = particle.tx + Math.cos(now + particle.drift) * jitter;
      const targetY = particle.ty + breathing + Math.sin(now * 1.2 + particle.drift) * jitter;

      particle.x += (targetX - particle.x) * particle.speed;
      particle.y += (targetY - particle.y) * particle.speed;

      ichiroCtx.globalAlpha = 0.58 + particlePulse * 0.28;
      ichiroCtx.shadowColor = particle.amber ? "rgba(241, 138, 44, 0.9)" : "rgba(98, 228, 220, 0.8)";
      ichiroCtx.fillStyle = particle.amber ? "#f18a2c" : "#dbe9e6";
      ichiroCtx.beginPath();
      ichiroCtx.arc(particle.x, particle.y, particle.size + particlePulse * 1.3, 0, Math.PI * 2);
      ichiroCtx.fill();
    }

    ichiroCtx.restore();
    ichiroCtx.globalAlpha = 1;
  }

  function setPulse(value) {
    particlePulse = value;
  }

  return {
    resizeCanvases,
    startCanvasLoop,
    drawIchiro,
    setPulse,
  };
}
