// STORY SCENES v211 — procedural in-engine cinematics for THE CROSSING.
// Each story node gets a designed generative "video" rendered on one small 2D canvas
// (640x240), like a game engine cutscene: zero video assets, zero network weight.
// Frugality: a single rAF loop that exists only while the story stage is open;
// reduced-motion renders one static frame per node instead of animating.
export function createStoryScenes(canvas) {
  if (!canvas) {
    return { play() {}, stop() {} };
  }
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  const prefersReducedMotion =
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches || false;

  const CYAN = "98,228,220";
  const VIOLET = "168,107,255";
  const ORANGE = "255,124,47";
  const WARM = "255,217,168";

  let rafId = 0;
  let sceneFn = null;
  let t0 = 0;

  function base() {
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#04060a";
    ctx.fillRect(0, 0, W, H);
  }

  function vignette() {
    ctx.globalCompositeOperation = "source-over";
    const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, W * 0.62);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,0.6)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  function glowDot(x, y, r, rgb, a) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${rgb},${a})`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  // Deterministic hash so every playthrough of a scene looks identical (authored feel).
  function hash(i) {
    const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
  }

  const scenes = {
    // Crossing tunnel: rings rushing past, a signal thread down the middle.
    tunnel(t) {
      base();
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < 14; i += 1) {
        const p = ((t * 0.22 + i / 14) % 1);
        const r = p * p * W * 0.55 + 2;
        const a = (1 - p) * 0.34;
        ctx.strokeStyle = `rgba(${i % 3 ? CYAN : VIOLET},${a.toFixed(3)})`;
        ctx.lineWidth = 1 + p * 3;
        ctx.beginPath();
        ctx.ellipse(W / 2, H / 2, r, r * 0.4, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      for (let i = 0; i < 26; i += 1) {
        const p = (t * (0.3 + hash(i) * 0.5) + hash(i * 3)) % 1;
        const ang = hash(i * 7) * Math.PI * 2;
        const r = p * p * W * 0.5;
        glowDot(W / 2 + Math.cos(ang) * r, H / 2 + Math.sin(ang) * r * 0.4, 5 + p * 8, WARM, (1 - p) * 0.25);
      }
      glowDot(W / 2, H / 2, 34, CYAN, 0.32 + Math.sin(t * 2.2) * 0.08);
      vignette();
    },

    // The training floor: one orange eye that has learned to look away politely.
    eye(t) {
      base();
      ctx.strokeStyle = "rgba(120,140,150,0.14)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, H * 0.78);
      ctx.lineTo(W, H * 0.78);
      ctx.stroke();
      ctx.globalCompositeOperation = "lighter";
      const pulse = 0.7 + Math.sin(t * 1.35) * 0.3;
      const ex = W * 0.62;
      const ey = H * 0.42;
      glowDot(ex, ey, 44 * pulse, ORANGE, 0.5);
      ctx.fillStyle = `rgba(${ORANGE},0.9)`;
      ctx.beginPath();
      ctx.ellipse(ex, ey, 9, 12 * (0.72 + pulse * 0.28), 0, 0, Math.PI * 2);
      ctx.fill();
      const rp = (t % 2.6) / 2.6;
      ctx.strokeStyle = `rgba(${ORANGE},${((1 - rp) * 0.3).toFixed(3)})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(ex, ey, 14 + rp * 90, 0, Math.PI * 2);
      ctx.stroke();
      // Kneeling silhouette, kept as shadow only.
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "rgba(10,14,18,0.9)";
      ctx.beginPath();
      ctx.ellipse(W * 0.3, H * 0.68, 26, 34, 0, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(W * 0.3 - 26, H * 0.68, 52, 26);
      // "Again." waveform residue.
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < 40; i += 1) {
        const a = 0.05 + Math.abs(Math.sin(i * 0.7 + t * 3)) * 0.14 * (i % 5 === 0 ? 2 : 1);
        ctx.fillStyle = `rgba(${CYAN},${a.toFixed(3)})`;
        const bh = 2 + Math.abs(Math.sin(i * 1.3 + t * 4.2)) * 12;
        ctx.fillRect(W * 0.2 + i * 4, H * 0.9 - bh / 2, 2, bh);
      }
      vignette();
    },

    // The corridor of silence: a door, warm light beneath it, white flowers.
    door(t, open) {
      base();
      ctx.strokeStyle = "rgba(140,160,175,0.1)";
      for (let i = 0; i < 6; i += 1) {
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, H * 0.2 + i * H * 0.13);
        ctx.lineTo(W * 0.72, H * 0.34 + i * H * 0.1);
        ctx.stroke();
      }
      const doorX = W * 0.74;
      const slit = open ? 26 + Math.sin(t * 0.8) * 3 : 5 + Math.sin(t * 0.8) * 1.5;
      ctx.globalCompositeOperation = "lighter";
      const g = ctx.createLinearGradient(doorX, 0, doorX + slit * 4, 0);
      g.addColorStop(0, `rgba(${WARM},${open ? 0.5 : 0.34})`);
      g.addColorStop(1, `rgba(${WARM},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(doorX, H * 0.3, slit * 4, H * 0.5);
      ctx.fillStyle = `rgba(${WARM},0.75)`;
      ctx.fillRect(doorX, H * 0.3, slit * 0.4 + 1.5, H * 0.5);
      // Falling petals.
      for (let i = 0; i < 12; i += 1) {
        const p = (t * (0.06 + hash(i) * 0.05) + hash(i * 11)) % 1;
        const x = W * 0.18 + hash(i * 5) * W * 0.4 + Math.sin(t * 1.1 + i) * 12;
        const y = p * H;
        ctx.fillStyle = `rgba(244,247,242,${((1 - p) * 0.5 + 0.12).toFixed(3)})`;
        ctx.beginPath();
        ctx.ellipse(x, y, 3.2, 1.8, t * 0.8 + i, 0, Math.PI * 2);
        ctx.fill();
      }
      glowDot(W * 0.3, H * 0.86, 26, "244,247,242", 0.12);
      vignette();
    },

    // The burned route: small lights walking a path that closes politely behind them.
    route(t) {
      base();
      const pts = [];
      for (let i = 0; i <= 30; i += 1) {
        const x = (i / 30) * W;
        pts.push([x, H * 0.62 + Math.sin(i * 0.55) * H * 0.14 + Math.sin(i * 0.18) * H * 0.06]);
      }
      ctx.strokeStyle = "rgba(140,160,175,0.14)";
      ctx.lineWidth = 1.2;
      ctx.setLineDash([5, 7]);
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < 7; i += 1) {
        const p = (t * 0.055 + i * 0.09) % 1;
        const idx = p * 30;
        const lo = Math.floor(idx);
        const f = idx - lo;
        const a = pts[Math.min(30, lo)];
        const b = pts[Math.min(30, lo + 1)];
        const x = a[0] + (b[0] - a[0]) * f;
        const y = a[1] + (b[1] - a[1]) * f;
        glowDot(x, y - 4, 12, CYAN, 0.5);
        ctx.fillStyle = `rgba(${CYAN},0.9)`;
        ctx.fillRect(x - 1.5, y - 6, 3, 3);
      }
      // Scrap bowls at tunnel mouths.
      for (const bx of [W * 0.16, W * 0.56, W * 0.88]) {
        ctx.strokeStyle = `rgba(${WARM},0.4)`;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(bx, H * 0.88, 7, 0, Math.PI);
        ctx.stroke();
      }
      vignette();
    },

    // The mountain breathes: slow pressure, orange at the very bottom.
    mountain(t) {
      base();
      const breathe = Math.sin(t * 0.55) * 0.5 + 0.5;
      ctx.globalCompositeOperation = "lighter";
      const g = ctx.createLinearGradient(0, H, 0, H * 0.45);
      g.addColorStop(0, `rgba(${ORANGE},${(0.16 + breathe * 0.2).toFixed(3)})`);
      g.addColorStop(1, "rgba(255,124,47,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = "source-over";
      for (let layer = 0; layer < 3; layer += 1) {
        ctx.fillStyle = `rgba(${6 + layer * 4},${9 + layer * 5},${13 + layer * 6},0.96)`;
        ctx.beginPath();
        ctx.moveTo(0, H);
        for (let i = 0; i <= 20; i += 1) {
          const x = (i / 20) * W;
          const y = H * (0.4 + layer * 0.16) + Math.sin(i * (1.3 + layer * 0.4) + layer * 9) * H * (0.13 - layer * 0.03) - breathe * (3 - layer) * 2.2;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(W, H);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < 16; i += 1) {
        const p = (t * (0.03 + hash(i) * 0.04) + hash(i * 13)) % 1;
        glowDot(W * hash(i * 3), H - p * H * 0.8, 3 + hash(i * 7) * 4, WARM, (1 - p) * 0.2);
      }
      vignette();
    },

    // The spoken name: a flare answering from below.
    name(t) {
      base();
      ctx.globalCompositeOperation = "lighter";
      const beat = Math.max(0, Math.sin(t * 0.9));
      glowDot(W / 2, H * 0.62, 70 + beat * 40, ORANGE, 0.34 + beat * 0.2);
      glowDot(W / 2, H * 0.62, 26, WARM, 0.55);
      for (let i = 0; i < 7; i += 1) {
        const ang = -Math.PI / 2 + (i - 3) * 0.32;
        const len = 46 + beat * 34 + hash(i) * 18;
        ctx.strokeStyle = `rgba(${WARM},${(0.3 + beat * 0.3).toFixed(3)})`;
        ctx.lineWidth = 2 - Math.abs(i - 3) * 0.3;
        ctx.beginPath();
        ctx.moveTo(W / 2, H * 0.62);
        ctx.lineTo(W / 2 + Math.cos(ang) * len, H * 0.62 + Math.sin(ang) * len);
        ctx.stroke();
      }
      for (let i = 0; i < 20; i += 1) {
        const p = (t * (0.08 + hash(i) * 0.06) + hash(i * 17)) % 1;
        glowDot(W / 2 + (hash(i * 3) - 0.5) * 160 * p, H * 0.62 - p * 110, 2.5 + hash(i * 9) * 3, ORANGE, (1 - p) * 0.4);
      }
      vignette();
    },

    // The charm: three scratches, one bowl, one blade. A job description, accepted.
    charm(t) {
      base();
      const cx = W / 2;
      const cy = H / 2;
      ctx.fillStyle = "rgba(24,28,34,0.98)";
      ctx.strokeStyle = "rgba(180,195,205,0.35)";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(cx - 58, cy - 44, 116, 88, 12);
      } else {
        ctx.rect(cx - 58, cy - 44, 116, 88);
      }
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = `rgba(${WARM},0.6)`;
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i += 1) {
        ctx.beginPath();
        ctx.moveTo(cx - 34 + i * 14, cy - 24);
        ctx.lineTo(cx - 24 + i * 14, cy + 2);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(cx + 26, cy - 8, 10, 0, Math.PI);
      ctx.stroke();
      ctx.strokeStyle = `rgba(${ORANGE},0.75)`;
      ctx.beginPath();
      ctx.moveTo(cx - 38, cy + 26);
      ctx.lineTo(cx + 40, cy + 20);
      ctx.stroke();
      // Slow shine sweep, like a lantern passing.
      const sx = ((t * 0.12) % 1.4 - 0.2) * W;
      ctx.globalCompositeOperation = "lighter";
      const g = ctx.createLinearGradient(sx - 40, 0, sx + 40, 0);
      g.addColorStop(0, "rgba(255,255,255,0)");
      g.addColorStop(0.5, "rgba(214,235,240,0.1)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(cx - 58, cy - 44, 116, 88);
      vignette();
    },
  };

  const nodeSceneMap = {
    threshold: (t) => scenes.tunnel(t),
    voice1: (t) => scenes.eye(t),
    voice2: (t) => scenes.eye(t),
    silence1: (t) => scenes.door(t, false),
    silence2: (t) => scenes.door(t, true),
    lights1: (t) => scenes.route(t),
    lights2: (t) => scenes.route(t),
    convergence: (t) => scenes.mountain(t),
    endingName: (t) => scenes.name(t),
    endingSilent: (t) => scenes.charm(t),
  };

  function frame(now) {
    rafId = 0;
    if (!sceneFn) {
      return;
    }
    sceneFn((now - t0) * 0.001);
    rafId = requestAnimationFrame(frame);
  }

  return {
    play(nodeId) {
      sceneFn = nodeSceneMap[nodeId] || nodeSceneMap.threshold;
      if (prefersReducedMotion) {
        sceneFn(1.8); // one authored still frame
        sceneFn = null;
        return;
      }
      if (!rafId) {
        t0 = performance.now();
        rafId = requestAnimationFrame(frame);
      }
    },
    stop() {
      sceneFn = null;
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
    },
  };
}
